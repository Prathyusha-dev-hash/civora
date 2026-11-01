#!/usr/bin/env node
/**
 * Civora setup doctor: checks every link in the chain and prints what to fix.
 *   cd backend && npm run doctor
 * Makes one tiny real Gemini call (via the AI service) to prove the key and model work.
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
const results = [];
const report = (ok, name, detail, fix) => {
  results.push(ok);
  console.log(`${ok ? '[ OK ]' : '[FAIL]'} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!ok && fix) console.log(`       fix: ${fix}`);
};

async function getJson(url, opts = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  console.log('Civora doctor\n');

  // 1. backend/.env
  if (!fs.existsSync(envPath)) {
    report(false, 'backend/.env', 'file not found', 'copy backend\\.env.example to backend\\.env and fill it in');
    process.exit(1);
  }
  require('dotenv').config({ path: envPath });
  const { config } = require('../src/config/env');
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
  report(!missing.length, 'backend/.env required values', missing.length ? `missing: ${missing.join(', ')}` : 'present', 'set them in backend\\.env');
  report(Boolean(config.ai.serviceToken), 'AI_SERVICE_TOKEN (backend)', config.ai.serviceToken ? 'set' : 'empty', 'set the same random value in backend\\.env and ai-service\\.env');
  report(Boolean(config.seed.staffPassword), 'SEED_STAFF_PASSWORD', config.seed.staffPassword ? 'set' : 'empty - staff/admin accounts will not be created', 'set SEED_STAFF_PASSWORD=Password@123 for the demo login cards');

  // 2. MongoDB
  if (config.mongoUri) {
    const mongoose = require('mongoose');
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
      report(true, 'MongoDB', `connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
      await mongoose.disconnect();
    } catch (err) {
      report(false, 'MongoDB', err.message, 'check the Atlas connection string, the database user password, and Atlas > Network Access (add your IP)');
    }
  }

  // 3. AI service reachable
  const ai = config.ai.serviceUrl;
  let health = null;
  try {
    health = (await getJson(`${ai}/health`)).body?.data;
    report(Boolean(health), 'AI service reachable', `${ai} (model ${health?.model})`);
    report(Boolean(health?.gemini_configured), 'GEMINI_API_KEY (ai-service)', health?.gemini_configured ? 'set' : 'empty', 'put your key in ai-service\\.env and restart the AI service');
    report(!String(health?.audio_converter).startsWith('unavailable'), 'Audio converter (ffmpeg)', health?.audio_converter, 'pip install imageio-ffmpeg in the ai-service venv');
  } catch (err) {
    report(false, 'AI service reachable', `${ai}: ${err.cause?.code || err.message}`, 'start it: cd ai-service && .venv\\Scripts\\activate && python main.py  (and make sure AI_SERVICE_URL matches its host/port)');
  }

  if (health) {
    // 4. Shared token (English->English translate is token-protected but needs no Gemini call)
    const tok = await getJson(`${ai}/api/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(config.ai.serviceToken ? { 'X-Service-Token': config.ai.serviceToken } : {}) },
      body: JSON.stringify({ text: 'ping', source_language: 'en', target_language: 'en' }),
    });
    report(tok.status === 200, 'AI_SERVICE_TOKEN matches', tok.status === 200 ? 'yes' : `AI service answered HTTP ${tok.status}`, 'make AI_SERVICE_TOKEN identical in backend\\.env and ai-service\\.env, then restart both');

    // 5. Real Gemini call
    try {
      const deep = (await getJson(`${ai}/health?deep=true`, {}, 60000)).body?.data?.checks;
      const g = deep?.generate;
      const e = deep?.embedding;
      report(Boolean(g?.ok), 'Gemini generation (transcription / vision / severity)', g?.ok ? `working with ${g.model}` : `${g?.code}: ${g?.error}`, g?.code === 'AI_AUTH_FAILED' ? 'the API key is invalid - create one at https://aistudio.google.com/apikey' : 'set GEMINI_MODEL in ai-service\\.env to a model from https://ai.google.dev/gemini-api/docs/models');
      report(Boolean(e?.ok), 'Gemini embeddings (duplicate detection)', e?.ok ? `${e.model}, ${e.dimensions} dims` : `${e?.code}: ${e?.error}`, 'check GEMINI_EMBED_MODEL in ai-service\\.env');
    } catch (err) {
      report(false, 'Gemini live check', err.message, 'check internet access from this machine');
    }
  }

  // 6. Backend itself (only if it is running)
  try {
    const b = (await getJson(`http://127.0.0.1:${config.port}/health`, {}, 4000)).body;
    report(b?.database?.status === 'connected' && b?.aiService?.status !== 'unreachable', 'Backend running', `db ${b?.database?.status}, ai ${b?.aiService?.status}`, 'restart the backend after fixing the items above');
  } catch {
    console.log(`[info] Backend is not running on port ${config.port} (that is fine while running the doctor).`);
  }

  const failed = results.filter((r) => !r).length;
  console.log(failed ? `\n${failed} problem(s) found - fix the [FAIL] items above, restart, and run again.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
})();
