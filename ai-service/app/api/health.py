from datetime import datetime, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app import gemini
from app.config import settings
from app.services.audio import _ffmpeg_path

router = APIRouter()


class _Ping(BaseModel):
    ok: bool


def _deep_check() -> dict:
    """One tiny generate call + one embedding call: proves key, model access and network."""
    out = {}
    try:
        gemini.generate_structured(["Reply with ok=true."], _Ping, temperature=0.0)
        out["generate"] = {"ok": True, "model": gemini.active_model()}
    except Exception as err:
        out["generate"] = {"ok": False, "code": getattr(err, "code", "ERROR"), "error": str(err)}
    try:
        vec = gemini.embed(["health check"])[0]
        out["embedding"] = {"ok": True, "model": settings.gemini_embed_model, "dimensions": len(vec)}
    except Exception as err:
        out["embedding"] = {"ok": False, "code": getattr(err, "code", "ERROR"), "error": str(err)}
    return out


@router.get("/health")
async def health_check(deep: bool = Query(False, description="Make a real Gemini call to verify key + model")):
    data = {
        "status": "ok",
        "service": "civora-ai-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "provider": "gemini",
        "gemini_configured": bool(settings.gemini_api_key),
        "model": gemini.active_model(),
        "fallback_models": settings.gemini_fallback_models,
        "embedding_model": settings.gemini_embed_model,
        "audio_converter": "ffmpeg" if _ffmpeg_path() else "unavailable (WebM sent unconverted)",
    }
    if deep:
        data["checks"] = await run_in_threadpool(_deep_check)
        data["status"] = "ok" if all(c["ok"] for c in data["checks"].values()) else "degraded"
    return {"success": True, "data": data}
