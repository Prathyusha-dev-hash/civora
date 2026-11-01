/**
 * Centralised, validated environment configuration.
 * All secrets come from environment variables (see backend/.env.example).
 */
require('dotenv').config();
const path = require('path');

const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const isProd = process.env.NODE_ENV === 'production';

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || '',
  corsOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    localRoot: path.resolve(process.env.STORAGE_LOCAL_ROOT || path.join(__dirname, '..', '..', 'storage', 'uploads')),
    signingSecret: process.env.FILE_URL_SIGNING_SECRET || process.env.JWT_SECRET || '',
    signedUrlTtlSeconds: num(process.env.FILE_URL_TTL_SECONDS, 6 * 3600),
    publicBaseUrl: (process.env.PUBLIC_API_BASE_URL || '').replace(/\/$/, ''),
    maxImageBytes: num(process.env.MAX_IMAGE_MB, 10) * 1024 * 1024,
    maxAudioBytes: num(process.env.MAX_AUDIO_MB, 15) * 1024 * 1024,
    maxImagesPerComplaint: num(process.env.MAX_IMAGES_PER_COMPLAINT, 5),
  },

  ai: {
    serviceUrl: (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, ''),
    serviceToken: process.env.AI_SERVICE_TOKEN || '',
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 45000),
  },

  duplicates: {
    radiusMeters: num(process.env.DUP_RADIUS_METERS, 250),
    windowDays: num(process.env.DUP_WINDOW_DAYS, 30),
    threshold: num(process.env.DUP_THRESHOLD, 0.72),
  },

  sla: {
    CRITICAL: num(process.env.SLA_CRITICAL_HOURS, 4),
    HIGH: num(process.env.SLA_HIGH_HOURS, 12),
    MODERATE: num(process.env.SLA_MODERATE_HOURS, 48),
    LOW: num(process.env.SLA_LOW_HOURS, 96),
  },

  seed: {
    staffPassword: process.env.SEED_STAFF_PASSWORD || '',
    demoCitizenPassword: process.env.SEED_DEMO_CITIZEN_PASSWORD || '',
  },
};

/**
 * Fails fast on missing critical configuration instead of silently degrading.
 */
function assertConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwt.secret || config.jwt.secret.length < 16) missing.push('JWT_SECRET (min 16 chars)');
  if (missing.length) {
    const err = new Error(`Missing required environment variables: ${missing.join(', ')}. Copy backend/.env.example to backend/.env and fill them in.`);
    err.code = 'CONFIG_ERROR';
    throw err;
  }
}

module.exports = { config, assertConfig };
