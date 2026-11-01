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
  let size;
  try {
    ({ size } = await storage.stat(evidence.storageKey));
  } catch {
    throw new ApiError(404, 'FILE_MISSING', 'Stored file is unavailable.');
  }
  res.setHeader('Accept-Ranges', 'bytes');

  // Streaming providers: handle a single "bytes=start-end" range so browsers can seek audio
  let range;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      res.setHeader('Content-Range', `bytes */${size}`);
      return res.status(416).end();
    }
    range = { start, end };
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', end - start + 1);
  } else {
    res.setHeader('Content-Length', size);
  }

  const stream = storage.createReadStream(evidence.storageKey, range);
  stream.on('error', () => {
    if (!res.headersSent) res.status(404).end();
    else res.destroy();
  });
  return stream.pipe(res);
});

module.exports = { serveFile };
