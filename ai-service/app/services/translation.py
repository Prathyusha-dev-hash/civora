"""Regional language -> English translation. The original text is never modified."""
from datetime import datetime, timezone

from app import gemini
from app.config import LANGUAGE_NAMES, base_language
from app.schemas.models import TranslationOut


def translate(text: str, source_language: str | None, target_language: str = "en") -> dict:
    src = base_language(source_language)
    tgt = base_language(target_language) or "en"
    now = datetime.now(timezone.utc).isoformat()

    if src == tgt:
        return {
            "translated_text": text,
            "source_language": src,
            "target_language": tgt,
            "translation_status": "NOT_APPLICABLE",
            "metadata": {"provider": "none", "model": None, "confidence": 1.0, "translated_at": now},
        }

    src_name = LANGUAGE_NAMES.get(src, "the source language") if src else "the source language (auto-detect)"
    prompt = (
        f"Translate this citizen civic complaint from {src_name} to {LANGUAGE_NAMES.get(tgt, tgt)}. "
        "Preserve every fact: places, landmarks, numbers, durations and hazards. "
        "Do not add, soften or summarise content. Text:\n\n" + text
    )
    out = gemini.generate_structured([prompt], TranslationOut, temperature=0.0)
    return {
        "translated_text": out.translated_text.strip(),
        "source_language": base_language(out.detected_source_language) or src,
        "target_language": tgt,
        "translation_status": "TRANSLATED",
        "metadata": {
            "provider": "gemini",
            "model": gemini.active_model(),
            "confidence": round(max(0.0, min(1.0, out.confidence)), 3),
            "translated_at": now,
        },
    }
