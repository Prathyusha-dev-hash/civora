const { config } = require('../config/env');
const LocalStorageProvider = require('./localProvider');
const GridFsStorageProvider = require('./gridfsProvider');

let instance = null;

/**
 * Returns the configured storage provider (singleton).
 */
function getStorage() {
  if (instance) return instance;
  switch (config.storage.provider) {
    case 'local':
      instance = new LocalStorageProvider(config.storage.localRoot);
      break;
    case 'gridfs':
      instance = new GridFsStorageProvider();
      break;
    default:
      throw new Error(`Unsupported STORAGE_PROVIDER "${config.storage.provider}". Supported: local, gridfs`);
  }
  return instance;
}

module.exports = { getStorage };
