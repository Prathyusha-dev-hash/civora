const mongoose = require('mongoose');
const { checkAiHealth } = require('../services/ai.client');

const DB_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

/** GET /health — liveness plus dependency status (DB, AI service). */
const getHealthStatus = async (req, res) => {
  const ai = await checkAiHealth();
  const db = DB_STATES[mongoose.connection.readyState] || 'unknown';
  res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected' ? 'ok' : 'degraded',
    service: 'civora-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: { status: db, name: mongoose.connection.name || null },
    aiService: ai,
    environment: process.env.NODE_ENV || 'development',
  });
};

module.exports = { getHealthStatus };
