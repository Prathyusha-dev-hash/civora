import logging
import os

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.routes import router as ai_router
from app.errors import AIServiceError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Civora AI Service",
    description="Gemini-powered transcription, translation, image verification, PII redaction, severity and embeddings.",
    version="2.0.0",
)


@app.exception_handler(AIServiceError)
async def ai_error_handler(request: Request, exc: AIServiceError):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": {"code": exc.code, "message": str(exc)}})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in e.get("loc", [])), "issue": e.get("msg")} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid request.", "details": details}})


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logging.getLogger("civora.ai").exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"success": False, "error": {"code": "AI_INTERNAL_ERROR", "message": "Internal AI service error."}})


app.include_router(health_router)
app.include_router(ai_router)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run("main:app", host=host, port=port, reload=os.getenv("RELOAD", "false").lower() == "true")
