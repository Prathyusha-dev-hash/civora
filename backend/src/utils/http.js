const crypto = require('crypto');

/**
 * Error type carrying an HTTP status and a machine-readable code,
 * serialised into the spec's error envelope by the error middleware.
 */
class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) { return new ApiError(400, 'BAD_REQUEST', message, details); }
  static unauthorized(message = 'Authentication required.') { return new ApiError(401, 'UNAUTHORIZED', message); }
  static forbidden(message = 'You do not have permission to perform this action.') { return new ApiError(403, 'FORBIDDEN', message); }
  static notFound(message = 'Resource not found.') { return new ApiError(404, 'RESOURCE_NOT_FOUND', message); }
  static conflict(message) { return new ApiError(409, 'CONFLICT', message); }
  static unprocessable(message, details) { return new ApiError(422, 'VALIDATION_ERROR', message, details); }
  static unavailable(message) { return new ApiError(503, 'SERVICE_UNAVAILABLE', message); }
}

const requestId = () => `req_${crypto.randomBytes(6).toString('hex')}`;

function ok(res, data, status = 200, meta = {}) {
  return res.status(status).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), requestId: res.locals.requestId || requestId(), ...meta },
  });
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, ok, asyncHandler, requestId };
