const mongoose = require('mongoose');
const { Evidence } = require('../models');
const { getStorage } = require('../storage');
const { verifySignature } = require('../storage/signedUrl');
const { ApiError, asyncHandler } = require('../utils/http');

/**
 * GET /api/v1/files/:id?exp=&sig=
 * Streams a stored evidence file after validating its signed URL.
 */
const serveFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('File not found.');

  const check = verifySignature(id, req.query.exp, req.query.sig);
  if (!check.valid) {
    throw new ApiError(403, 'INVALID_FILE_SIGNATURE', check.reason === 'EXPIRED' ? 'File link has expired. Reload the page to get a fresh link.' : 'Invalid file link.');
  }

  const evidence = await Evidence.findById(id).lean();
  if (!evidence) throw ApiError.notFound('File not found.');

  const storage = getStorage();
  res.setHeader('Content-Type', evidence.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('Content-Disposition', 'inline');

  if (typeof storage.localPath === 'function') {
    // sendFile handles HTTP Range requests, which browsers need to seek audio
    return res.sendFile(storage.localPath(evidence.storageKey), { headers: { 'Content-Type': evidence.mimeType } }, (err) => {
      if (err && !res.headersSent) res.status(err.status || 404).json({ success: false, error: { code: 'FILE_MISSING', message: 'Stored file is unavailable.' } });
    });
  }
  const stream = storage.createReadStream(evidence.storageKey);
  stream.on('error', () => {
    if (!res.headersSent) res.status(404).end();
  });
  return stream.pipe(res);
});

module.exports = { serveFile };
