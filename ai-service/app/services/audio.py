"""Regional-language speech transcription with English translation (Gemini audio understanding)."""
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from app import gemini
from app.config import LANGUAGE_NAMES, base_language
from app.errors import InvalidInputError
from app.schemas.models import TranscriptionOut

log = logging.getLogger("civora.ai")

# MIME types Gemini accepts natively for audio
NATIVE_AUDIO = {"audio/wav", "audio/x-wav", "audio/mp3", "audio/mpeg", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac"}


def _ffmpeg_path() -> str | None:
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:  # optional pip-provided static binary (works on Windows without a system install)
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def normalize_audio(data: bytes, mime: str) -> tuple[bytes, str]:
    """
    Browsers record WebM/Opus (Chrome) or MP4/AAC (Safari), which Gemini does not list as
    supported. Convert those to 16 kHz mono WAV when ffmpeg is available.
    """
    mime = (mime or "").split(";")[0].strip().lower()
    if mime in NATIVE_AUDIO:
        return data, mime
    ffmpeg = _ffmpeg_path()
    if not ffmpeg:
        log.warning("ffmpeg not found; sending %s audio to Gemini unconverted", mime)
        return data, mime or "audio/webm"
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp) / "in.bin", Path(tmp) / "out.wav"
        src.write_bytes(data)
        proc = subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000", str(dst)],
            capture_output=True,
            timeout=60,
        )
        if proc.returncode != 0 or not dst.exists():
            raise InvalidInputError(f"Audio could not be decoded: {proc.stderr.decode(errors='ignore')[:200]}")
        return dst.read_bytes(), "audio/wav"


def transcribe(data: bytes, mime: str, language_hint: str | None) -> dict:
    lang = base_language(language_hint)
    audio, audio_mime = normalize_audio(data, mime)
    hint = f"The citizen selected {LANGUAGE_NAMES.get(lang, lang)} ({lang}) as their language, but transcribe whatever language is actually spoken." if lang else ""
    prompt = (
        "This is a citizen's voice complaint about a civic/municipal problem in India. "
        "Transcribe it verbatim in the language spoken, using that language's native script "
        "(Devanagari for Hindi/Marathi, Tamil script for Tamil, etc.). Do not romanise and do not summarise. "
        "Then give a faithful English translation for municipal officers. " + hint
    )
    out = gemini.generate_structured([gemini.bytes_part(audio, audio_mime), prompt], TranscriptionOut, temperature=0.0)
    detected = base_language(out.detected_language) or lang or "en"
    return {
        "transcript": out.transcript.strip(),
        "detected_language": detected,
        "language": detected,
        "confidence": round(max(0.0, min(1.0, out.confidence)), 3),
        "is_speech": out.is_speech,
        "english_translation": out.english_translation.strip() if detected != "en" else out.transcript.strip(),
        "provider": "gemini",
        "model": gemini.active_model(),
    }
