const multer = require('multer');
const { ApiError } = require('../utils/http');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  if (err instanceof multer.MulterError) {
    status = 422;
    code = 'UPLOAD_REJECTED';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds the size limit.' : `Upload rejected: ${err.message}`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists.`;
  } else if (err.name === 'ValidationError') {
    status = 422;
    code = 'VALIDATION_ERROR';
    details = Object.entries(err.errors).map(([field, e]) => ({ field, issue: e.message }));
    message = 'Validation failed.';
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'BAD_REQUEST';
    message = `Invalid value for ${err.path}.`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'Malformed JSON body.';
  } else if (!(err instanceof ApiError) && status >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
    if (process.env.NODE_ENV === 'production') message = 'Internal Server Error';
  }

  res.status(status).json({ success: false, error: { code, message, details } });
};

module.exports = errorHandler;
