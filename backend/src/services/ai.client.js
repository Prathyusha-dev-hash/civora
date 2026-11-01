/**
 * HTTP client for the Python AI service (ai-service/). All Gemini calls happen
 * there; this module handles timeouts, the shared service token and errors.
 */
const { config } = require('../config/env');

class AiServiceError extends Error {
  constructor(message, status = 503, code = 'AI_SERVICE_UNAVAILABLE') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function headers(extra = {}) {
  const h = { ...extra };
  if (config.ai.serviceToken) h['X-Service-Token'] = config.ai.serviceToken;
  return h;
}

async function call(path, { method = 'POST', json, form, timeoutMs = config.ai.timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${config.ai.serviceUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: json ? headers({ 'Content-Type': 'application/json' }) : headers(),
      body: json ? JSON.stringify(json) : form,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      const msg = body?.error?.message || `AI service returned HTTP ${res.status}`;
      throw new AiServiceError(msg, res.status >= 500 ? 503 : res.status, body?.error?.code || 'AI_SERVICE_ERROR');
    }
    return body.data;
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    if (err.name === 'AbortError') throw new AiServiceError(`AI service timed out after ${timeoutMs}ms`, 503, 'AI_TIMEOUT');
    throw new AiServiceError(`AI service unreachable at ${config.ai.serviceUrl}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

const blobOf = (buffer, mime) => new Blob([buffer], { type: mime });

async function checkAiHealth() {
  try {
    const data = await call('/health', { method: 'GET', timeoutMs: 3000 });
    return { status: 'reachable', ...data };
  } catch (err) {
    return { status: 'unreachable', error: err.message };
  }
}

function transcribe(buffer, mimeType, language) {
  const form = new FormData();
  form.append('audio', blobOf(buffer, mimeType), 'audio');
  if (language) form.append('language', language);
  return call('/api/v1/transcribe', { form });
}

function translate(text, sourceLanguage, targetLanguage = 'en') {
  return call('/api/v1/translate', { json: { text, source_language: sourceLanguage, target_language: targetLanguage } });
}

/** @param {{buffer: Buffer, mimeType: string, id: string}[]} images */
function analyzeImages(images, { category, description }) {
  const form = new FormData();
  images.forEach((img) => form.append('images', blobOf(img.buffer, img.mimeType), img.id));
  form.append('category', category || 'other');
  form.append('description', description || '');
  return call('/api/v1/analyze-images', { form });
}

function redactImage(buffer, mimeType) {
  const form = new FormData();
  form.append('image', blobOf(buffer, mimeType), 'image');
  return call('/api/v1/redact', { form });
}

function assessSeverity(payload) {
  return call('/api/v1/severity', { json: payload });
}

function embedTexts(texts) {
  return call('/api/v1/embed', { json: { texts } });
}

function verifyResolution({ before, after, category, description }) {
  const form = new FormData();
  if (before) form.append('before_image', blobOf(before.buffer, before.mimeType), 'before');
  form.append('after_image', blobOf(after.buffer, after.mimeType), 'after');
  form.append('category', category || 'other');
  form.append('description', description || '');
  return call('/api/v1/verify-resolution', { form });
}

module.exports = { AiServiceError, checkAiHealth, transcribe, translate, analyzeImages, redactImage, assessSeverity, embedTexts, verifyResolution };
