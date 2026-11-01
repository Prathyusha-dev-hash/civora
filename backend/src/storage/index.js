const { config } = require('../config/env');
const LocalStorageProvider = require('./localProvider');

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
    default:
      throw new Error(`Unsupported STORAGE_PROVIDER "${config.storage.provider}". Supported: local`);
  }
  return instance;
}

module.exports = { getStorage };
