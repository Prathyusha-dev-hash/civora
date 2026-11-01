"""
Live Gemini smoke test - makes REAL API calls with the key in ai-service/.env.
Run from ai-service/:   python scripts/smoke_test_gemini.py
Uses only a handful of requests (well within the free tier).
"""
import io
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image, ImageDraw  # noqa: E402

from app import gemini  # noqa: E402
from app.config import settings  # noqa: E402
from app.services import severity, translation, vision  # noqa: E402


def step(name, fn):
    t = time.monotonic()
    try:
        out = fn()
        print(f"[PASS] {name} ({(time.monotonic() - t) * 1000:.0f} ms)\n       {out}")
        return True
    except Exception as err:
        print(f"[FAIL] {name}: {err}")
        return False


def synthetic_road_photo() -> bytes:
    img = Image.new("RGB", (640, 480), (95, 95, 100))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 640, 160], fill=(150, 190, 230))  # sky
    d.ellipse([230, 260, 430, 360], fill=(40, 35, 30))  # dark pothole
    d.line([320, 160, 320, 480], fill=(240, 240, 240), width=6)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def main():
    if not settings.gemini_api_key:
        print("GEMINI_API_KEY is empty. Put it in ai-service/.env first.")
        sys.exit(1)
    print(f"Model: {settings.gemini_model} | Embeddings: {settings.gemini_embed_model}\n")
    results = [
        step("Translate Hindi -> English", lambda: translation.translate("मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं", "hi")["translated_text"]),
        step("Translate Tamil -> English", lambda: translation.translate("மழைக்கால வடிகால் அடைபட்டு சாலையில் சாக்கடை நீர் தேங்கியுள்ளது", "ta")["translated_text"]),
        step("Severity", lambda: {k: v for k, v in severity.assess("safety", "Open manhole without cover outside a primary school", [], "MG Road", 1).items() if k in ("severity_level", "score", "factors")}),
        step("Embeddings", lambda: f"{len(gemini.embed(['deep pothole on main road'])[0])} dims"),
        step("Image verification", lambda: vision.analyze_images([synthetic_road_photo()], "roads", "Big pothole in the middle of the road")["images"]),
        step("PII redaction (detection call)", lambda: {k: v for k, v in vision.redact(synthetic_road_photo()).items() if k != "image_base64"}),
    ]
    print(f"\n{sum(results)}/{len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
