const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ROLES } = require('../config/constants');
const { config } = require('../config/env');
const { signToken } = require('../middleware/auth.middleware');
const { ApiError, ok, asyncHandler } = require('../utils/http');
const { Validator, isEmail, strongPassword, clampStr } = require('../utils/validate');
const { serializeUser } = require('../services/serializers');
const audit = require('../services/audit.service');

const RESET_TTL_SECONDS = 900;

function tokenExpirySeconds(token) {
  const decoded = jwt.decode(token);
  return decoded?.exp && decoded?.iat ? decoded.exp - decoded.iat : null;
}

/** POST /auth/register — public, citizen accounts only. */
const register = asyncHandler(async (req, res) => {
  const name = clampStr(req.body.full_name ?? req.body.name, 120);
  const email = clampStr(req.body.email, 200).toLowerCase();
  const phone = clampStr(String(req.body.mobile ?? req.body.phone ?? ''), 20).replace(/[^\d+]/g, '');
  const address = clampStr(req.body.address || '', 300);
  const password = req.body.password;

  const v = new Validator();
  v.require('full_name', name);
  v.check(isEmail(email), 'email', 'must be a valid email address');
  v.check(strongPassword(password), 'password', 'must be at least 8 characters and include a letter and a number');
  if (phone) v.check(phone.replace(/\D/g, '').length >= 10, 'mobile', 'must contain at least 10 digits');
  v.throwIfInvalid();

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists.');

  // Role is forced to CITIZEN: staff accounts are provisioned by administrators
  const user = await User.create({ name, email, phone, address, role: ROLES.CITIZEN, passwordHash: await bcrypt.hash(password, 10) });
  await audit.record({ actor: user, action: 'USER_REGISTERED', entityType: 'User', entityId: user._id, req });

  const token = signToken(user);
  ok(res, { user: serializeUser(user), token, expiresIn: tokenExpirySeconds(token), message: 'Citizen account registered successfully.' }, 201);
});

/** POST /auth/login — unified login for all roles. */
const login = asyncHandler(async (req, res) => {
  const email = clampStr(req.body.email, 200).toLowerCase();
  const password = req.body.password;
  const v = new Validator();
  v.require('email', email);
  v.require('password', password);
  v.throwIfInvalid();

  const user = await User.findOne({ email }).select('+passwordHash').populate('department', 'name code');
  const valid = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw ApiError.unauthorized('Invalid email or password.');

  user.lastLoginAt = new Date();
  await user.save();
  await audit.record({ actor: user, action: 'USER_LOGIN', entityType: 'User', entityId: user._id, req });

  const token = signToken(user);
  ok(res, { user: serializeUser(user), token, expiresIn: tokenExpirySeconds(token) });
});

/** GET /auth/me */
const me = asyncHandler(async (req, res) => {
  ok(res, { user: serializeUser(req.user) });
});

/** POST /auth/logout — invalidates every token issued before now. */
const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  ok(res, { message: 'Session terminated successfully.' });
});

/**
 * POST /auth/forgot-password
 * Always responds identically whether or not the email exists (no account enumeration).
 * No email service is configured, so outside production the token is returned
 * as `devResetToken` and logged to the server console.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const email = clampStr(req.body.email, 200).toLowerCase();
  if (!isEmail(email)) throw ApiError.unprocessable('A valid email is required.', [{ field: 'email', issue: 'invalid' }]);

  const user = await User.findOne({ email });
  let devResetToken;
  if (user) {
    const token = `rst_${crypto.randomBytes(16).toString('hex')}`;
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TTL_SECONDS * 1000);
    await user.save();
    await audit.record({ actor: user, action: 'PASSWORD_RESET_REQUESTED', entityType: 'User', entityId: user._id, req });
    if (!config.isProd) {
      devResetToken = token;
      console.log(`[Auth] Password reset token for ${email}: ${token} (valid ${RESET_TTL_SECONDS / 60} min)`);
    }
  }
  ok(res, {
    message: 'If an account exists for this email, password reset instructions have been issued.',
    expiresIn: RESET_TTL_SECONDS,
    ...(devResetToken ? { devResetToken } : {}),
  });
});

/** POST /auth/reset-password */
const resetPassword = asyncHandler(async (req, res) => {
  const email = clampStr(req.body.email, 200).toLowerCase();
  const token = String(req.body.token || '');
  const newPassword = req.body.new_password ?? req.body.newPassword;

  const v = new Validator();
  v.check(isEmail(email), 'email', 'must be a valid email');
  v.require('token', token);
  v.check(strongPassword(newPassword), 'new_password', 'must be at least 8 characters and include a letter and a number');
  v.throwIfInvalid();

  const user = await User.findOne({ email }).select('+resetTokenHash +resetTokenExpiresAt');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  if (!user || !user.resetTokenHash || user.resetTokenHash !== hash || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw ApiError.badRequest('Reset token is invalid or has expired.');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  user.tokenVersion += 1;
  await user.save();
  await audit.record({ actor: user, action: 'PASSWORD_RESET', entityType: 'User', entityId: user._id, req });
  ok(res, { message: 'Password updated successfully.' });
});

module.exports = { register, login, me, logout, forgotPassword, resetPassword };
