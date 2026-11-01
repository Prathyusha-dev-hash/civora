"""
AI service tests. The real google-genai SDK talks HTTP to tests/fake_gemini.py,
so request encoding and response handling are exercised end-to-end offline.
Run: pytest -q   (from ai-service/)
"""
import base64
import io
import os
import subprocess
import sys

import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fake_gemini  # noqa: E402
from app import gemini  # noqa: E402
from app.config import settings  # noqa: E402
from app.services.audio import _ffmpeg_path  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(scope="module")
def fake_server():
    server, port = fake_gemini.start()
    yield port
    server.shutdown()


@pytest.fixture()
def client(fake_server, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "gemini_base_url", f"http://127.0.0.1:{fake_server}")
    monkeypatch.setattr(settings, "service_token", "svc-secret")
    gemini.set_client_for_tests(None)
    gemini._active_model = None
    fake_gemini.REQUESTS.clear()
    yield TestClient(app, headers={"X-Service-Token": "svc-secret"})
    gemini.set_client_for_tests(None)


def jpeg(color=(120, 120, 120), size=(320, 240)) -> bytes:
    img = Image.new("RGB", size, color)
    # high-contrast pattern so blurring measurably changes pixels
    for x in range(0, size[0], 4):
        for y in range(size[1]):
            img.putpixel((x, y), (255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def test_health_reports_configuration(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["data"]["gemini_configured"] is True


def test_service_token_enforced(client):
    r = TestClient(app).post("/api/v1/translate", json={"text": "x", "source_language": "hi"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHORIZED"


def test_missing_api_key_returns_503(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    gemini.set_client_for_tests(None)
    r = client.post("/api/v1/translate", json={"text": "नमस्ते", "source_language": "hi"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_NOT_CONFIGURED"


def test_provider_auth_error_is_mapped(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "bad-key")
    gemini.set_client_for_tests(None)
    r = client.post("/api/v1/translate", json={"text": "नमस्ते", "source_language": "hi"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_AUTH_FAILED"


def test_translate_hindi_and_request_shape(client):
    r = client.post("/api/v1/translate", json={"text": "मुख्य चौराहे के पास गहरा गड्ढा है", "source_language": "hi-IN"})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["translation_status"] == "TRANSLATED" and d["source_language"] == "hi"
    assert "pothole" in d["translated_text"]
    req = fake_gemini.REQUESTS[-1]
    assert req["path"].endswith(f"models/{settings.gemini_model}:generateContent")
    gen = req["body"]["generationConfig"]
    assert gen["responseMimeType"] == "application/json"
    assert "translated_text" in (gen.get("responseSchema") or gen.get("responseJsonSchema"))["properties"]
    assert req["headers"].get("x-goog-api-key") == "test-key"


def test_translate_english_is_not_applicable_and_free(client):
    r = client.post("/api/v1/translate", json={"text": "Pothole near school", "source_language": "en"})
    assert r.json()["data"]["translation_status"] == "NOT_APPLICABLE"
    assert fake_gemini.REQUESTS == []


@pytest.mark.skipif(not _ffmpeg_path(), reason="ffmpeg required to synthesise WebM test audio")
def test_transcribe_converts_webm_to_wav(client, tmp_path):
    webm = tmp_path / "a.webm"
    subprocess.run([_ffmpeg_path(), "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-c:a", "libopus", str(webm)], check=True)
    r = client.post("/api/v1/transcribe", files={"audio": ("rec.webm", webm.read_bytes(), "audio/webm")}, data={"language": "hi-IN"})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["detected_language"] == "hi" and d["transcript"] and d["english_translation"]
    inline = fake_gemini.REQUESTS[-1]["body"]["contents"][0]["parts"][0]["inlineData"]
    assert (inline.get("mimeType") or inline.get("mime_type")) == "audio/wav"
    assert base64.urlsafe_b64decode(inline["data"] + "==")[:4] == b"RIFF"


def test_analyze_images_clamps_and_indexes(client):
    files = [("images", ("a.jpg", jpeg(), "image/jpeg")), ("images", ("b.jpg", jpeg((10, 90, 10)), "image/jpeg"))]
    r = client.post("/api/v1/analyze-images", files=files, data={"category": "roads", "description": "deep pothole"})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert [i["index"] for i in d["images"]] == [0, 1]
    assert all(i["confidence"] <= 1.0 for i in d["images"])  # fake returned 1.7
    assert d["overall_relevant"] is True
    f = d["images"][0]
    assert f["status"] == "CIVIC_ISSUE" and f["issue_type"] == "pothole_or_damaged_road"
    assert f["visible_observations"] == ["Asphalt road", "Dark depression in the lane"]  # blank entry dropped
    assert f["evidence"] and f["uncertainties"] and f["warnings"] == []


def test_analyze_png_is_accepted(client):
    buf = io.BytesIO()
    Image.new("RGB", (200, 150), (90, 90, 90)).save(buf, format="PNG")
    r = client.post("/api/v1/analyze-images", files=[("images", ("a.png", buf.getvalue(), "image/png"))], data={"category": "roads"})
    assert r.status_code == 200, r.text
    assert r.json()["data"]["images"][0]["status"] == "CIVIC_ISSUE"


def test_analyze_flags_unrelated_photo(client):
    files = [("images", ("a.jpg", jpeg(), "image/jpeg"))]
    r = client.post("/api/v1/analyze-images", files=files, data={"category": "roads", "description": "irrelevant-photo-test"})
    f = r.json()["data"]["images"][0]
    assert f["status"] == "NOT_CIVIC" and f["issue_type"] == "not_civic_issue"  # model's loose 'selfie' label normalised
    assert f["is_civic_issue"] is False and f["warnings"]
    assert r.json()["data"]["overall_relevant"] is False


def test_analyze_flags_blurry_photo(client):
    files = [("images", ("a.jpg", jpeg(), "image/jpeg"))]
    r = client.post("/api/v1/analyze-images", files=files, data={"category": "roads", "description": "blurry-photo-test"})
    f = r.json()["data"]["images"][0]
    assert f["status"] == "UNCLEAR" and f["issue_type"] == "unclear" and f["quality_ok"] is False
    assert "unclear" in f["warnings"][0]


def test_analyze_rejects_corrupt_image(client):
    r = client.post("/api/v1/analyze-images", files=[("images", ("x.jpg", b"not an image at all", "image/jpeg"))])
    assert r.status_code == 422
    msg = r.json()["error"]["message"]
    assert "JPEG, PNG or WebP" in msg and "BytesIO" not in msg  # no library internals leak to citizens


def test_analyze_rejects_empty_and_oversized(client, monkeypatch):
    r = client.post("/api/v1/analyze-images", files=[("images", ("e.jpg", b"", "image/jpeg"))])
    assert r.status_code == 422 and "empty" in r.json()["error"]["message"]
    monkeypatch.setattr(settings, "max_image_bytes", 1000)
    r = client.post("/api/v1/analyze-images", files=[("images", ("big.jpg", jpeg(size=(800, 600)), "image/jpeg"))])
    assert r.status_code == 422 and "exceeds" in r.json()["error"]["message"]


def test_analyze_reports_gemini_failure(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-quota-test")
    monkeypatch.setattr(settings, "gemini_fallback_models", [])
    r = client.post("/api/v1/analyze-images", files=[("images", ("a.jpg", jpeg(), "image/jpeg"))])
    assert r.status_code == 503 and r.json()["error"]["code"] == "AI_RATE_LIMITED"


def test_redact_blurs_detected_regions(client):
    original = jpeg()
    r = client.post("/api/v1/redact", files={"image": ("p.jpg", original, "image/jpeg")})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["faces_detected"] == 1 and d["license_plates_detected"] == 1
    out = Image.open(io.BytesIO(base64.b64decode(d["image_base64"]))).convert("RGB")
    src = Image.open(io.BytesIO(original)).convert("RGB")
    # Inside the face box pixels changed; far outside (bottom-left corner) unchanged-ish
    assert out.getpixel((80, 60)) != src.getpixel((80, 60)) or out.getpixel((81, 60)) != src.getpixel((81, 60))
    assert abs(out.getpixel((4, 236))[0] - src.getpixel((4, 236))[0]) < 40


def test_severity_and_embed(client):
    r = client.post("/api/v1/severity", json={"category": "safety", "description": "Open manhole near school gate", "image_findings": []})
    assert r.status_code == 200, r.text
    assert r.json()["data"]["severity_level"] == "CRITICAL"
    e = client.post("/api/v1/embed", json={"texts": ["deep pothole main road", "pothole on the main road", "garbage dump"]})
    assert e.status_code == 200, e.text
    v = e.json()["data"]["embeddings"]
    dot = lambda a, b: sum(x * y for x, y in zip(a, b))  # noqa: E731
    assert len(v) == 3 and len(v[0]) == 768
    assert abs(dot(v[0], v[0]) - 1) < 1e-6
    assert dot(v[0], v[1]) > dot(v[0], v[2])


def test_verify_resolution(client):
    r = client.post(
        "/api/v1/verify-resolution",
        files={"before_image": ("b.jpg", jpeg(), "image/jpeg"), "after_image": ("a.jpg", jpeg((60, 60, 60)), "image/jpeg")},
        data={"category": "roads", "description": "pothole"},
    )
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["verified"] is True and d["confidence_score"] == 91 and d["requires_supervisory_review"] is False


def test_unavailable_model_falls_back_and_is_remembered(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-2.5-flash")  # fixture rejects this like a new key would
    monkeypatch.setattr(settings, "gemini_fallback_models", ["gemini-retired-test", "gemini-3.6-flash"])
    r = client.post("/api/v1/translate", json={"text": "गड्ढा", "source_language": "hi"})
    assert r.status_code == 200, r.text
    assert r.json()["data"]["metadata"]["model"] == "gemini-3.6-flash"
    tried = [q["path"].split("/models/")[1].split(":")[0] for q in fake_gemini.REQUESTS]
    assert tried == ["gemini-2.5-flash", "gemini-retired-test", "gemini-3.6-flash"]
    fake_gemini.REQUESTS.clear()
    client.post("/api/v1/translate", json={"text": "पानी", "source_language": "hi"})
    assert fake_gemini.REQUESTS[0]["path"].split("/models/")[1].startswith("gemini-3.6-flash"), "working model must be reused"


def test_no_available_model_gives_actionable_error(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-2.5-flash")
    monkeypatch.setattr(settings, "gemini_fallback_models", ["gemini-retired-test"])
    r = client.post("/api/v1/translate", json={"text": "गड्ढा", "source_language": "hi"})
    assert r.status_code == 503
    err = r.json()["error"]
    assert err["code"] == "AI_MODEL_UNAVAILABLE" and "GEMINI_MODEL" in err["message"]


def test_quota_exhausted_model_falls_back(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-quota-test")
    monkeypatch.setattr(settings, "gemini_fallback_models", ["gemini-3.6-flash"])
    r = client.post("/api/v1/translate", json={"text": "गड्ढा", "source_language": "hi"})
    assert r.status_code == 200, r.text
    assert r.json()["data"]["metadata"]["model"] == "gemini-3.6-flash"


def test_all_models_out_of_quota_gives_rate_limit_error(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-quota-test")
    monkeypatch.setattr(settings, "gemini_fallback_models", [])
    r = client.post("/api/v1/translate", json={"text": "गड्ढा", "source_language": "hi"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_RATE_LIMITED"


def test_deep_health_check(client):
    d = client.get("/health?deep=true").json()["data"]
    assert d["status"] == "ok" and d["checks"]["generate"]["ok"] and d["checks"]["embedding"]["dimensions"] == 768
