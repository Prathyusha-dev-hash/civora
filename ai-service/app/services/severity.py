"""Severity assessment combining complaint text, category and image findings."""
from app import gemini
from app.config import CATEGORIES, SEVERITY_LEVELS
from app.schemas.models import SeverityOut

RUBRIC = """Severity rubric for Indian municipal complaints:
- CRITICAL (score 9-10): immediate danger to life or major disruption - open/uncovered manhole, exposed live electrical wire,
  collapsing structure/bridge/wall, burst main flooding a road, sewage entering drinking water, large crater on an arterial road.
- HIGH (7-8): significant hazard or many people affected - deep potholes on busy roads, sewage overflow on streets,
  traffic signal failure at a junction, fallen tree blocking a road, whole street without lighting.
- MODERATE (4-6): localised problem needing timely repair - small potholes, garbage not collected for days, minor leak,
  single broken streetlight.
- LOW (1-3): cosmetic or minor inconvenience - faded paint, overgrown hedge, littering in low-traffic area.
Raise severity when it affects schools/hospitals, main roads, children/elderly, or has lasted a long time."""


def assess(category: str, description: str, image_findings: list[dict], address: str | None, linked_report_count: int) -> dict:
    images_txt = "; ".join(
        f"image {f.get('index')}: {f.get('detected_issue')} (visual severity {f.get('visual_severity')}, relevant={f.get('is_relevant')})"
        for f in image_findings
    ) or "no photos attached"
    prompt = (
        f"{RUBRIC}\n\nAssess this complaint.\nCitizen category: {category}\nDescription (English): \"{description[:3000]}\"\n"
        f"Location: {address or 'not given'}\nPhoto analysis: {images_txt}\n"
        f"Independent citizen reports of this same issue so far: {linked_report_count}.\n"
        "Also suggest the best category from: " + ", ".join(CATEGORIES) + "."
    )
    out = gemini.generate_structured([prompt], SeverityOut, temperature=0.1)
    level = out.severity_level.upper() if out.severity_level.upper() in SEVERITY_LEVELS else "MODERATE"
    return {
        "severity_level": level,
        "score": round(max(1.0, min(10.0, out.score)), 1),
        "factors": out.factors[:5],
        "explanation": out.explanation,
        "suggested_category": out.suggested_category if out.suggested_category in CATEGORIES else category,
        "category_confidence": round(max(0.0, min(1.0, out.category_confidence)), 3),
        "is_valid_civic_complaint": out.is_valid_civic_complaint,
        "method": "gemini",
        "model": gemini.active_model(),
    }
