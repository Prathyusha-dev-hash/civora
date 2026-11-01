"""AI endpoints consumed by the Civora backend (not called directly by browsers)."""
import hmac
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from starlette.concurrency import run_in_threadpool

from app import gemini
from app.config import settings
from app.errors import AIServiceError, InvalidInputError
from app.schemas.models import EmbedRequest, SeverityRequest, TranslateRequest
from app.services import audio, severity, translation, vision


def require_service_token(x_service_token: Optional[str] = Header(default=None)):
    if settings.service_token and not hmac.compare_digest(x_service_token or "", settings.service_token):
        raise AIServiceError("Invalid service token.", code="UNAUTHORIZED", status_code=401)


router = APIRouter(prefix="/api/v1", tags=["AI"], dependencies=[Depends(require_service_token)])


def ok(data):
    return {"success": True, "data": data}


async def _read(upload: UploadFile, limit: int, label: str) -> bytes:
    data = await upload.read(limit + 1)
    if not data:
        raise InvalidInputError(f"{label} file is empty.")
    if len(data) > limit:
        raise InvalidInputError(f"{label} file exceeds {limit // 1048576}MB.")
    return data


@router.post("/transcribe")
async def transcribe(audio_file: UploadFile = File(..., alias="audio"), language: Optional[str] = Form(None)):
    data = await _read(audio_file, settings.max_audio_bytes, "Audio")
    return ok(await run_in_threadpool(audio.transcribe, data, audio_file.content_type or "", language))


@router.post("/translate")
async def translate(body: TranslateRequest):
    return ok(await run_in_threadpool(translation.translate, body.text, body.source_language, body.target_language))


@router.post("/analyze-images")
async def analyze_images(images: List[UploadFile] = File(...), category: str = Form("other"), description: str = Form("")):
    if len(images) > 6:
        raise InvalidInputError("At most 6 images per request.")
    blobs = [await _read(i, settings.max_image_bytes, "Image") for i in images]
    return ok(await run_in_threadpool(vision.analyze_images, blobs, category, description))


@router.post("/redact")
async def redact(image: UploadFile = File(...)):
    data = await _read(image, settings.max_image_bytes, "Image")
    return ok(await run_in_threadpool(vision.redact, data))


@router.post("/severity")
async def assess_severity(body: SeverityRequest):
    return ok(await run_in_threadpool(severity.assess, body.category, body.description, body.image_findings, body.address, body.linked_report_count))


@router.post("/embed")
async def embed(body: EmbedRequest):
    texts = [t.strip()[:4000] for t in body.texts]
    if any(not t for t in texts):
        raise InvalidInputError("Texts must be non-empty.")
    vectors = await run_in_threadpool(gemini.embed, texts)
    return ok({"embeddings": vectors, "dimensions": len(vectors[0]) if vectors else 0, "model": settings.gemini_embed_model})


@router.post("/verify-resolution")
async def verify_resolution(
    after_image: UploadFile = File(...),
    before_image: Optional[UploadFile] = File(None),
    category: str = Form("other"),
    description: str = Form(""),
):
    after = await _read(after_image, settings.max_image_bytes, "Resolution image")
    before = await _read(before_image, settings.max_image_bytes, "Original image") if before_image else None
    return ok(await run_in_threadpool(vision.verify_resolution, before, after, category, description))
