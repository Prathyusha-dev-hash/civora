const crypto = require('crypto');
const { config } = require('../config/env');

/**
 * Time-limited HMAC-signed URLs for evidence files.
 * <img>/<audio> tags cannot send Authorization headers, so access control is
 * enforced by issuing signatures only to users allowed to see a file.
 */
function signature(evidenceId, exp) {
  return crypto
    .createHmac('sha256', config.storage.signingSecret)
    .update(`${evidenceId}.${exp}`)
    .digest('base64url');
}

function signedFileUrl(evidenceId, ttlSeconds = config.storage.signedUrlTtlSeconds) {
  if (!evidenceId) return null;
  const id = String(evidenceId);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${config.storage.publicBaseUrl}/api/v1/files/${id}?exp=${exp}&sig=${signature(id, exp)}`;
}

function verifySignature(evidenceId, exp, sig) {
  const expNum = Number(exp);
  if (!sig || !Number.isFinite(expNum)) return { valid: false, reason: 'MISSING_SIGNATURE' };
  if (expNum < Math.floor(Date.now() / 1000)) return { valid: false, reason: 'EXPIRED' };
  const expected = Buffer.from(signature(String(evidenceId), expNum));
  const given = Buffer.from(String(sig));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }
  return { valid: true };
}

module.exports = { signedFileUrl, verifySignature };
