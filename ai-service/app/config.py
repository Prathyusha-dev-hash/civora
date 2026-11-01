"""Environment-driven configuration for the AI service."""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    # Tried in order if Google reports GEMINI_MODEL as unavailable for this key (retired / not enabled)
    gemini_fallback_models: list = [
        m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.6-flash,gemini-3.5-flash-lite,gemini-flash-latest,gemini-2.5-flash").split(",") if m.strip()
    ]
    gemini_embed_model: str = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001").strip()
    embed_dimensions: int = int(os.getenv("GEMINI_EMBED_DIMENSIONS", "768"))
    request_timeout_s: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "40"))
    # Optional override of the Gemini API endpoint (corporate proxy / regional gateway / tests)
    gemini_base_url: str = os.getenv("GEMINI_BASE_URL", "").strip()
    # Shared secret expected in X-Service-Token from the Node backend (empty = disabled)
    service_token: str = os.getenv("AI_SERVICE_TOKEN", "").strip()
    max_image_bytes: int = int(os.getenv("MAX_IMAGE_MB", "10")) * 1024 * 1024
    max_audio_bytes: int = int(os.getenv("MAX_AUDIO_MB", "15")) * 1024 * 1024


settings = Settings()

CATEGORIES = ["roads", "water", "sanitation", "lighting", "safety", "traffic", "parks", "other"]
SEVERITY_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"]

# Visual issue types the image analyser may report (more specific than CATEGORIES)
ISSUE_TYPES = [
    "pothole_or_damaged_road", "garbage_accumulation", "overflowing_dustbin", "water_leakage",
    "drainage_or_sewage", "broken_streetlight", "damaged_public_infrastructure", "waterlogging",
    "other_civic_issue", "not_civic_issue", "unclear",
]

LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "gu": "Gujarati", "kn": "Kannada",
    "ml": "Malayalam", "mr": "Marathi", "pa": "Punjabi", "ta": "Tamil", "te": "Telugu", "ur": "Urdu",
}


def base_language(code: str | None) -> str | None:
    """'hi-IN' -> 'hi'."""
    if not code:
        return None
    return code.split("-")[0].strip().lower() or None
