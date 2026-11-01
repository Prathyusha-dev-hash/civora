const { ApiError } = require('./http');

/**
 * Tiny declarative validator collecting all field issues before failing.
 */
class Validator {
  constructor() {
    this.issues = [];
  }

  require(field, value, message = 'is required') {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      this.issues.push({ field, issue: message });
      return false;
    }
    return true;
  }

  check(condition, field, issue) {
    if (!condition) this.issues.push({ field, issue });
    return condition;
  }

  throwIfInvalid(message = 'Request validation failed.') {
    if (this.issues.length) {
      const summary = this.issues.map((i) => `${i.field}: ${i.issue}`).join('; ');
      throw ApiError.unprocessable(`${message} ${summary}`, this.issues);
    }
  }
}

const isEmail = (v) => typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v);
const strongPassword = (v) => typeof v === 'string' && v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
const toNumber = (v) => (v === undefined || v === null || v === '' ? NaN : Number(v));
const clampStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const parseBool = (v) => v === true || v === 'true' || v === '1' || v === 1;

/**
 * Multipart bodies carry nested objects as JSON strings; accept both forms.
 */
function parseMaybeJson(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

module.exports = { Validator, isEmail, strongPassword, toNumber, clampStr, parseBool, parseMaybeJson };
