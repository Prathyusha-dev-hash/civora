"""
Thin wrapper around the Google Gen AI SDK.

All model calls go through `generate_structured` (JSON output validated against a
Pydantic schema) or `embed`, so error handling and configuration live in one place.
"""
from __future__ import annotations

import json
import logging
import math
import time
from typing import Type, TypeVar

from pydantic import BaseModel, ValidationError

from app.config import settings
from app.errors import NotConfiguredError, ProviderError

log = logging.getLogger("civora.ai")
T = TypeVar("T", bound=BaseModel)

_client = None


def get_client():
    """Lazily creates the Gemini client; raises if no API key is configured."""
    global _client
    if _client is not None:
        return _client
    if not settings.gemini_api_key:
        raise NotConfiguredError("GEMINI_API_KEY is not set in ai-service/.env")
    from google import genai
    from google.genai import types

    _client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(
            timeout=settings.request_timeout_s * 1000,
            base_url=settings.gemini_base_url or None,
        ),
    )
    return _client


def set_client_for_tests(client) -> None:
    """Allows tests to inject a fake client; never used at runtime."""
    global _client
    _client = client


def _is_model_unavailable(err: Exception) -> bool:
    """True when Google rejects the *model* (retired, renamed, or not enabled for this key) rather than the request."""
    code = getattr(err, "code", None)
    msg = (getattr(err, "message", None) or str(err)).lower()
    if code == 404:
        return True
    model_words = ("model" in msg) and any(w in msg for w in ("not found", "not supported", "no longer", "not available", "unavailable", "deprecated", "does not have access", "is not enabled"))
    return code in (400, 403) and model_words


def _is_model_busy(err: Exception) -> bool:
    """True when this model's quota is used up (429) or Google reports it overloaded (503); limits are per model, so another may still answer."""
    return getattr(err, "code", None) in (429, 503)


def _provider_error(err: Exception) -> ProviderError:
    code = getattr(err, "code", None)
    msg = getattr(err, "message", None) or str(err)
    if code == 429:
        return ProviderError(f"Gemini rate limit / quota exceeded: {msg}", code="AI_RATE_LIMITED", status_code=503)
    if _is_model_unavailable(err):
        return ProviderError(f"Gemini model is not available for this API key: {msg}", code="AI_MODEL_UNAVAILABLE", status_code=503)
    if code in (401, 403):
        return ProviderError(f"Gemini rejected the API key: {msg}", code="AI_AUTH_FAILED", status_code=503)
    return ProviderError(f"Gemini request failed: {msg}")


# The first model that answers successfully is remembered for the rest of the process.
_active_model: str | None = None


def candidate_models() -> list[str]:
    ordered = [_active_model, settings.gemini_model, *settings.gemini_fallback_models]
    seen, out = set(), []
    for m in ordered:
        if m and m not in seen:
            seen.add(m)
            out.append(m)
    return out


def active_model() -> str:
    return _active_model or settings.gemini_model


def _generate_with_fallback(client, parts, config):
    """Tries the configured model, then fallbacks, when Google reports the model as unavailable or out of quota."""
    global _active_model
    last_err = None
    tried, rate_limited = [], []
    for model in candidate_models():
        tried.append(model)
        try:
            response = client.models.generate_content(model=model, contents=parts, config=config)
            if _active_model != model:
                if _active_model or model != settings.gemini_model:
                    log.warning("Gemini model '%s' in use (tried: %s)", model, ", ".join(tried))
                _active_model = model
            return model, response
        except Exception as err:
            if _is_model_unavailable(err):
                log.warning("Gemini model '%s' unavailable for this key: %s", model, getattr(err, "message", err))
                last_err = err
                continue
            if _is_model_busy(err):
                log.warning("Gemini model '%s' out of quota or overloaded (HTTP %s), trying the next model", model, getattr(err, "code", "?"))
                rate_limited.append(model)
                last_err = err
                continue
            raise
    if rate_limited and len(rate_limited) == len(tried):
        raise ProviderError(
            f"Every configured Gemini model is out of quota or overloaded (tried: {', '.join(tried)}). "
            f"Retry shortly, add models to GEMINI_FALLBACK_MODELS, or enable billing. "
            f"Last error: {getattr(last_err, 'message', last_err)}",
            code="AI_RATE_LIMITED",
            status_code=503,
        )
    raise ProviderError(
        f"None of the configured Gemini models are available for this API key (tried: {', '.join(tried)}). "
        f"Set GEMINI_MODEL in ai-service/.env to a model listed at https://ai.google.dev/gemini-api/docs/models. "
        f"Last error: {getattr(last_err, 'message', last_err)}",
        code="AI_MODEL_UNAVAILABLE",
        status_code=503,
    )


def generate_structured(parts: list, schema: Type[T], *, system: str | None = None, temperature: float = 0.1) -> T:
    """Calls Gemini with JSON-mode output constrained to `schema` and validates the result."""
    from google.genai import types

    client = get_client()
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=temperature,
        response_mime_type="application/json",
        response_schema=schema,
    )
    started = time.monotonic()
    try:
        model, response = _generate_with_fallback(client, parts, config)
    except (NotConfiguredError, ProviderError):
        raise
    except Exception as err:  # SDK raises google.genai.errors.APIError subclasses and httpx errors
        raise _provider_error(err) from err

    text = getattr(response, "text", None)
    if not text:
        raise ProviderError("Gemini returned an empty response (possibly blocked by safety filters).")
    try:
        result = schema.model_validate_json(text)
    except ValidationError:
        # Some responses wrap JSON in markdown fences; strip and retry once
        cleaned = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            result = schema.model_validate(json.loads(cleaned))
        except (ValidationError, json.JSONDecodeError) as err:
            raise ProviderError(f"Gemini returned output that does not match the expected schema: {err}") from err
    log.info("gemini %s -> %s in %.0fms", model, schema.__name__, (time.monotonic() - started) * 1000)
    return result


def bytes_part(data: bytes, mime_type: str):
    from google.genai import types

    return types.Part.from_bytes(data=data, mime_type=mime_type)


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def embed(texts: list[str]) -> list[list[float]]:
    """Returns L2-normalised semantic embeddings (cosine similarity == dot product)."""
    from google.genai import types

    client = get_client()
    try:
        result = client.models.embed_content(
            model=settings.gemini_embed_model,
            contents=texts,
            config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY", output_dimensionality=settings.embed_dimensions),
        )
    except Exception as err:
        raise _provider_error(err) from err
    vectors = [list(e.values) for e in (result.embeddings or [])]
    if len(vectors) != len(texts):
        raise ProviderError("Gemini returned an unexpected number of embeddings.")
    return [_normalize(v) for v in vectors]
