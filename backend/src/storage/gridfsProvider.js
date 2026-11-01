const mongoose = require('mongoose');

/**
 * Stores files in MongoDB GridFS (same database as the app data).
 * Used on serverless hosts such as Vercel, where the local disk is not persistent.
 * Implements the same interface as LocalStorageProvider, minus localPath().
 */
class GridFsStorageProvider {
  constructor(bucketName = 'evidence') {
    this.name = 'gridfs';
    this.bucketName = bucketName;
    this.bucket = null;
  }

  getBucket() {
    if (this.bucket) return this.bucket;
    const db = mongoose.connection.db;
    if (!db) throw new Error('GridFS storage needs an open MongoDB connection');
    this.bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: this.bucketName });
    return this.bucket;
  }

  async init() {
    this.getBucket();
    console.log(`[Storage] GridFS provider ready (bucket "${this.bucketName}")`);
  }

  async findFile(key) {
    const file = await this.getBucket().find({ filename: key }).limit(1).next();
    if (!file) {
      const err = new Error(`Stored file not found: ${key}`);
      err.code = 'ENOENT';
      throw err;
    }
    return file;
  }

  put(key, buffer, mimeType) {
    return new Promise((resolve, reject) => {
      const upload = this.getBucket().openUploadStream(key, { contentType: mimeType });
      upload.once('error', reject);
      upload.once('finish', () => resolve({ key, size: buffer.length }));
      upload.end(buffer);
    });
  }

  async stat(key) {
    const file = await this.findFile(key);
    return { size: file.length };
  }

  /** @param {{start: number, end: number}} [range] inclusive byte range, as for fs.createReadStream */
  createReadStream(key, range) {
    const opts = range ? { start: range.start, end: range.end + 1 } : undefined; // GridFS end is exclusive
    return this.getBucket().openDownloadStreamByName(key, opts);
  }

  async read(key) {
    const chunks = [];
    for await (const chunk of this.createReadStream(key)) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async remove(key) {
    const files = await this.getBucket().find({ filename: key }).toArray();
    for (const f of files) await this.getBucket().delete(f._id);
  }
}

module.exports = GridFsStorageProvider;
