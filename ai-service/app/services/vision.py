"""Image relevance / civic-issue verification, PII redaction and resolution verification."""
import base64
import io
import time

from PIL import Image, ImageFilter, ImageOps

from app import gemini
from app.config import CATEGORIES, ISSUE_TYPES, SEVERITY_LEVELS
from app.errors import InvalidInputError
from app.schemas.models import ImageAnalysisOut, PiiDetectionOut, ResolutionOut

CATEGORY_HINTS = (
    "roads=potholes/broken roads; water=leaks, burst pipes, flooding, drainage; sanitation=garbage, sewage, dumping; "
    "lighting=streetlights, dangling wires; safety=open manholes, unsafe structures; traffic=signals, signage, blocked lanes; "
    "parks=fallen trees, overgrowth; other=anything else"
)


def _load_image(data: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)  # respect phone orientation
        return img.convert("RGB")
    except Exception as err:
        # Message is shown to citizens: no library internals
        raise InvalidInputError("Unreadable image: the file is damaged or not a supported image (use JPEG, PNG or WebP).") from err


def _to_jpeg(img: Image.Image, quality: int = 85) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)  # re-encoding drops EXIF/GPS metadata
    return buf.getvalue()


def _model_ready(img: Image.Image, max_side: int = 1536) -> bytes:
    copy = img.copy()
    copy.thumbnail((max_side, max_side))
    return _to_jpeg(copy)


def analyze_images(images: list[bytes], category: str, description: str) -> dict:
    if not images:
        raise InvalidInputError("At least one image is required.")
    parts = [gemini.bytes_part(_model_ready(_load_image(b)), "image/jpeg") for b in images]
    prompt = (
        f"You verify evidence photos attached to a citizen civic complaint. Citizen-selected category: '{category}'. "
        f"Citizen description (English): \"{description[:1500]}\". Category guide: {CATEGORY_HINTS}. "
        f"There are {len(images)} image(s), indexed from 0 in the order given. For EACH image decide whether it shows "
        "a genuine civic infrastructure problem, whether it plausibly documents the described problem, and rate what "
        "is visible. Selfies, memes, screenshots, drawings, indoor/private-property scenes or unrelated objects are not relevant. "
        "Rules: describe ONLY what is actually visible. Never invent a location, a person's identity, the cause, how long the "
        "problem has existed, or details hidden from view; put anything you cannot see in 'uncertainties'. "
        "If the image is too blurry, dark or small to judge, set quality_ok=false and issue_type='unclear'. "
        "If it shows no civic problem, set is_civic_issue=false and issue_type='not_civic_issue'. "
        "visual_severity is only what the photo suggests; a photo cannot prove exact severity, so lower confidence when unsure."
    )
    out = gemini.generate_structured(parts + [prompt], ImageAnalysisOut, temperature=0.0)

    findings = []
    for f in out.images:
        if f.index < 0 or f.index >= len(images):
            continue
        findings.append(_normalise_finding(f))
    relevant = [f for f in findings if f["is_relevant"] and f["is_civic_issue"]]
    return {
        "images": sorted(findings, key=lambda f: f["index"]),
        "overall_relevant": bool(relevant),
        "relevant_count": len(relevant),
        "provider": "gemini",
        "model": gemini.active_model(),
    }


def _short_list(items: list, limit: int = 5) -> list[str]:
    return [str(i).strip()[:300] for i in items if str(i).strip()][:limit]


def _normalise_finding(f) -> dict:
    """Clamps model output into the documented shape and derives a status the UI can trust."""
    issue_type = f.issue_type if f.issue_type in ISSUE_TYPES else ("other_civic_issue" if f.is_civic_issue else "not_civic_issue")
    if not f.quality_ok or issue_type == "unclear":
        status, issue_type = "UNCLEAR", "unclear"
    elif not f.is_civic_issue or issue_type == "not_civic_issue":
        status, issue_type = "NOT_CIVIC", "not_civic_issue"
    else:
        status = "CIVIC_ISSUE"

    warnings = []
    if status == "UNCLEAR":
        warnings.append("The photo is too unclear to classify reliably. Please retake it in better light and closer to the problem.")
    elif status == "NOT_CIVIC":
        warnings.append("This photo does not appear to show a civic problem. Please attach a photo of the actual issue.")
    elif not f.is_relevant or not f.matches_category:
        warnings.append("The photo may not match the category or description you chose. Please check before submitting.")

    return {
        "index": f.index,
        "status": status,
        "is_civic_issue": f.is_civic_issue and status == "CIVIC_ISSUE",
        "is_relevant": f.is_relevant,
        "matches_category": f.matches_category,
        "suggested_category": f.suggested_category if f.suggested_category in CATEGORIES else "other",
        "issue_type": issue_type,
        "detected_issue": f.detected_issue.strip()[:120],
        "visual_severity": f.visual_severity if f.visual_severity in SEVERITY_LEVELS else "MODERATE",
        "description": f.description.strip()[:500],
        "visible_observations": _short_list(f.visible_observations),
        "evidence": _short_list(f.evidence),
        "uncertainties": _short_list(f.uncertainties),
        "warnings": warnings,
        "confidence": round(max(0.0, min(1.0, f.confidence)), 3),
        "quality_ok": f.quality_ok,
    }


def redact(data: bytes) -> dict:
    """Detects faces and licence plates with Gemini and blurs them locally with Pillow."""
    started = time.monotonic()
    img = _load_image(data)
    prompt = (
        "Detect every human face and every vehicle licence/number plate in this image, including partially visible "
        "or distant ones. Return a bounding box for each as box_2d [ymin, xmin, ymax, xmax] normalised to 0-1000. "
        "Return an empty list if there are none."
    )
    out = gemini.generate_structured([gemini.bytes_part(_model_ready(img), "image/jpeg"), prompt], PiiDetectionOut, temperature=0.0)

    w, h = img.size
    faces = plates = 0
    for det in out.detections:
        if len(det.box_2d) != 4:
            continue
        ymin, xmin, ymax, xmax = [max(0, min(1000, v)) for v in det.box_2d]
        if ymax <= ymin or xmax <= xmin:
            continue
        # Pad the box by 15% so blur fully covers edges
        pad_x, pad_y = (xmax - xmin) * 0.15, (ymax - ymin) * 0.15
        box = (
            int(max(0, (xmin - pad_x) / 1000 * w)),
            int(max(0, (ymin - pad_y) / 1000 * h)),
            int(min(w, (xmax + pad_x) / 1000 * w)),
            int(min(h, (ymax + pad_y) / 1000 * h)),
        )
        if box[2] - box[0] < 2 or box[3] - box[1] < 2:
            continue
        region = img.crop(box)
        radius = max(8, int(max(region.size) / 6))
        img.paste(region.filter(ImageFilter.GaussianBlur(radius)), box)
        if "plate" in det.label.lower():
            plates += 1
        else:
            faces += 1

    return {
        "redacted": True,
        "faces_detected": faces,
        "license_plates_detected": plates,
        "image_base64": base64.b64encode(_to_jpeg(img, 88)).decode("ascii"),
        "mime_type": "image/jpeg",
        "processing_time_ms": int((time.monotonic() - started) * 1000),
        "provider": "gemini",
        "model": gemini.active_model(),
    }


def verify_resolution(before: bytes | None, after: bytes, category: str, description: str) -> dict:
    parts = []
    if before:
        parts += ["BEFORE photo (original complaint):", gemini.bytes_part(_model_ready(_load_image(before)), "image/jpeg")]
    parts += ["AFTER photo (submitted by the repair crew):", gemini.bytes_part(_model_ready(_load_image(after)), "image/jpeg")]
    parts.append(
        f"You are a municipal quality inspector. Complaint category: '{category}'. Original complaint: \"{description[:1000]}\". "
        + ("Compare BEFORE and AFTER: confirm they show the same location and that the problem is properly fixed. " if before else
           "No before photo exists; judge only whether the AFTER photo shows a completed, safe repair for this category. ")
        + "Be strict: partial, temporary or unverifiable repairs must not be marked verified."
    )
    out = gemini.generate_structured(parts, ResolutionOut, temperature=0.0)
    confidence = round(max(0.0, min(100.0, out.confidence_score)))
    return {
        "verified": bool(out.verified),
        "confidence_score": confidence,
        "structural_match_notes": out.structural_match_notes,
        "damage_resolved_notes": out.damage_resolved_notes,
        "passed_inspection_criteria": out.passed_inspection_criteria,
        "failed_inspection_criteria": out.failed_inspection_criteria,
        # AI never closes a ticket; low confidence additionally flags supervisor review
        "requires_supervisory_review": (not out.verified) or confidence < 75,
        "provider": "gemini",
        "model": gemini.active_model(),
    }
