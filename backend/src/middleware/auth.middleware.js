const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { config } = require('../config/env');
const { ApiError } = require('../utils/http');

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

async function resolveUser(token) {
  const decoded = jwt.verify(token, config.jwt.secret);
  const user = await User.findById(decoded.sub).populate('department', 'name code');
  if (!user || !user.isActive) throw ApiError.unauthorized('Account no longer exists or is disabled.');
  if ((decoded.ver ?? 0) !== user.tokenVersion) throw ApiError.unauthorized('Session has ended. Please log in again.');
  return user;
}

/** Requires a valid Bearer token. */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized('Authentication token required. Please log in.');
    req.user = await resolveUser(token);
    next();
  } catch (err) {
    next(err instanceof ApiError ? err : ApiError.unauthorized('Invalid or expired authentication token.'));
  }
};

/** Attaches req.user when a valid token is present; continues anonymously otherwise. */
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = await resolveUser(token);
  } catch {
    req.user = null;
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Access denied. Your role cannot access this resource.'));
  next();
};

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, ver: user.tokenVersion }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

module.exports = { requireAuth, optionalAuth, requireRole, signToken };
