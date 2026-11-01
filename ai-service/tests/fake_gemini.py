"""
TEST FIXTURE ONLY - a local HTTP server that speaks the Gemini REST wire format.

The real google-genai SDK is pointed at it via GEMINI_BASE_URL so the whole request
path (SDK request encoding, response parsing, our validation) is exercised without
network access. Responses are deterministic stand-ins, not model output. It is never
imported by the application.

Run standalone:  python tests/fake_gemini.py 8765
"""
import base64
import hashlib
import json
import math
import re
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REQUESTS: list[dict] = []
# Models this fake "key" may not use (mirrors Google limiting 2.5 models to legacy users)
UNAVAILABLE_MODELS = {"gemini-2.5-flash", "gemini-retired-test"}
# Models whose free-tier daily quota this fake "key" has used up
QUOTA_EXHAUSTED_MODELS = {"gemini-quota-test"}
DIM = 768


def _fake_embedding(text: str) -> list[float]:
    """Hashed bag-of-words: texts sharing words get high cosine similarity."""
    vec = [0.0] * DIM
    for word in re.findall(r"[a-z0-9]+", text.lower()):
        if len(word) < 3:
            continue
        h = int(hashlib.md5(word.encode()).hexdigest(), 16)
        vec[h % DIM] += 1.0 if (h >> 8) % 2 else -1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _schema_keys(body: dict) -> set:
    cfg = body.get("generationConfig") or body.get("generation_config") or {}
    schema = cfg.get("responseSchema") or cfg.get("responseJsonSchema") or {}
    return set((schema.get("properties") or {}).keys())


def _texts(body: dict) -> str:
    out = []
    for c in body.get("contents", []):
        for p in c.get("parts", []):
            if "text" in p:
                out.append(p["text"])
    return "\n".join(out)


def _inline(body: dict) -> list[dict]:
    return [p["inlineData"] for c in body.get("contents", []) for p in c.get("parts", []) if "inlineData" in p]


def _answer(body: dict) -> dict:
    keys = _schema_keys(body)
    prompt = _texts(body)
    low = prompt.lower()
    if keys == {"ok"}:
        return {"ok": True}
    if "transcript" in keys:
        return {"is_speech": True, "transcript": "मुख्य सड़क पर बहुत बड़ा गड्ढा है", "detected_language": "hi", "confidence": 0.93,
                "english_translation": "There is a very big pothole on the main road"}
    if "translated_text" in keys:
        return {"translated_text": "There is a deep pothole near the main road crossing", "detected_source_language": "hi", "confidence": 0.95}
    if "images" in keys:
        n = sum(1 for d in _inline(body) if (d.get("mimeType") or d.get("mime_type") or "").startswith("image/"))
        irrelevant = "irrelevant-photo-test" in low
        blurry = "blurry-photo-test" in low
        civic = not irrelevant and not blurry
        return {"images": [{"index": i, "is_civic_issue": civic, "is_relevant": civic, "matches_category": civic,
                            "suggested_category": "roads",
                            # deliberately loose labels: the service must normalise them
                            "issue_type": "pothole_or_damaged_road" if civic else ("unclear" if blurry else "selfie"),
                            "detected_issue": "pothole" if civic else ("blurred scene" if blurry else "person selfie"),
                            "visual_severity": "HIGH", "description": "Road surface with a pothole.",
                            "visible_observations": ["Asphalt road", "Dark depression in the lane"] + [""],
                            "evidence": ["Broken asphalt edge around a depression"], "uncertainties": ["Depth cannot be judged"],
                            "confidence": 1.7, "quality_ok": not blurry}
                           for i in range(n)]}
    if "detections" in keys:
        return {"detections": [{"label": "face", "box_2d": [100, 100, 400, 400]}, {"label": "license_plate", "box_2d": [600, 500, 700, 800]}]}
    if "severity_level" in keys:
        desc = low.split("description (english):", 1)[-1][:400]
        critical = "manhole" in desc or "live wire" in desc
        return {"severity_level": "CRITICAL" if critical else "HIGH", "score": 9.4 if critical else 7.6,
                "factors": ["Traffic hazard", "Two-wheeler risk"], "explanation": "Hazard on a public road.",
                "suggested_category": "roads", "category_confidence": 0.9, "is_valid_civic_complaint": True}
    if "verified" in keys:
        return {"verified": True, "confidence_score": 91, "structural_match_notes": "Same kerb and wall.",
                "damage_resolved_notes": "Surface patched and level.", "passed_inspection_criteria": ["Location match", "Surface level"],
                "failed_inspection_criteria": []}
    return {}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, code: int, payload: dict):
        data = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        REQUESTS.append({"path": self.path, "body": body, "headers": dict(self.headers)})
        if self.headers.get("x-goog-api-key") == "bad-key":
            return self._send(403, {"error": {"code": 403, "message": "API key not valid.", "status": "PERMISSION_DENIED"}})
        if "batchEmbedContents" in self.path:
            texts = [" ".join(p.get("text", "") for p in r["content"]["parts"]) for r in body.get("requests", [])]
            return self._send(200, {"embeddings": [{"values": _fake_embedding(t)} for t in texts]})
        if "embedContent" in self.path:
            text = " ".join(p.get("text", "") for p in body["content"]["parts"])
            return self._send(200, {"embedding": {"values": _fake_embedding(text)}})
        model = self.path.split("/models/")[-1].split(":")[0] if "/models/" in self.path else ""
        if model in UNAVAILABLE_MODELS and "generateContent" in self.path:
            return self._send(404, {"error": {"code": 404, "message": f"models/{model} is not found for API version v1beta, or is not supported for generateContent.", "status": "NOT_FOUND"}})
        if model in QUOTA_EXHAUSTED_MODELS and "generateContent" in self.path:
            return self._send(429, {"error": {"code": 429, "message": "You exceeded your current quota, please check your plan and billing details.", "status": "RESOURCE_EXHAUSTED"}})
        if "generateContent" in self.path:
            text =json.dumps(_answer(body), ensure_ascii=False)
            return self._send(200, {"candidates": [{"content": {"role": "model", "parts": [{"text": text}]}, "finishReason": "STOP"}],
                                    "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 10}})
        return self._send(404, {"error": {"code": 404, "message": "unknown path"}})


def start(port: int = 0) -> tuple[ThreadingHTTPServer, int]:
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


if __name__ == "__main__":
    srv, p = start(int(sys.argv[1]) if len(sys.argv) > 1 else 8765)
    print(f"Fake Gemini (TEST FIXTURE) on http://127.0.0.1:{p}", flush=True)
    threading.Event().wait()
