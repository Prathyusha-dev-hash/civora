const multer = require('multer');
const { config } = require('../config/env');

/**
 * Multer in memory mode: files are validated (magic bytes, size) and then
 * persisted through the storage provider by evidence.service. Nothing is
 * written to disk until validation passes.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(config.storage.maxImageBytes, config.storage.maxAudioBytes),
    files: config.storage.maxImagesPerComplaint + 2,
    fields: 60,
  },
});

module.exports = { upload };
