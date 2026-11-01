const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

/**
 * Stores files on the local filesystem under a configurable root.
 *
 * Every storage provider implements the same interface:
 *   name, init(), put(key, buffer, mimeType), createReadStream(key, range?),
 *   stat(key), remove(key), and optionally localPath(key).
 * An S3/GCS/Azure provider can be added with the same interface and selected via
 * STORAGE_PROVIDER, without touching controllers or the Evidence model.
 */
class LocalStorageProvider {
  constructor(root) {
    this.name = 'local';
    this.root = path.resolve(root);
  }

  async init() {
    await fsp.mkdir(this.root, { recursive: true });
    // Verify the directory is writable at startup instead of failing on first upload
    const probe = path.join(this.root, `.write-test-${process.pid}`);
    await fsp.writeFile(probe, 'ok');
    await fsp.unlink(probe);
    console.log(`[Storage] Local provider ready at ${this.root}`);
  }

  resolve(key) {
    const full = path.resolve(this.root, key);
    // Prevent path traversal outside the storage root
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key, buffer) {
    const full = this.resolve(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    // Write to a temp file then rename, so a crash never leaves a partial file at the final key
    const tmp = `${full}.part`;
    await fsp.writeFile(tmp, buffer, { flag: 'wx' });
    await fsp.rename(tmp, full);
    return { key, size: buffer.length };
  }

  async stat(key) {
    const s = await fsp.stat(this.resolve(key));
    return { size: s.size };
  }

  createReadStream(key, range) {
    return fs.createReadStream(this.resolve(key), range || undefined);
  }

  async read(key) {
    return fsp.readFile(this.resolve(key));
  }

  async remove(key) {
    await fsp.rm(this.resolve(key), { force: true });
  }

  localPath(key) {
    return this.resolve(key);
  }
}

module.exports = LocalStorageProvider;
