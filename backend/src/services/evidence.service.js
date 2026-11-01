const crypto = require('crypto');
const path = require('path');
const sharp = require('sharp');
const { Evidence } = require('../models');
const { getStorage } = require('../storage');
const { config } = require('../config/env');
const { ApiError } = require('../utils/http');
const { EVIDENCE_KIND } = require('../config/constants');

/**
 * Detects the real file type from magic bytes. The client-supplied mimetype is
 * never trusted for storage decisions.
 */
function sniffType(buf) {
  if (!buf || buf.length < 12) return null;
  const hex = (s, e) => buf.subarray(s, e).toString('hex');
  const ascii = (s, e) => buf.subarray(s, e).toString('ascii');

  if (hex(0, 3) === 'ffd8ff') return { mime: 'image/jpeg', ext: 'jpg', family: 'image' };
  if (hex(0, 8) === '89504e470d0a1a0a') return { mime: 'image/png', ext: 'png', family: 'image' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp', family: 'image' };
  if (hex(0, 4) === '1a45dfa3') return { mime: 'audio/webm', ext: 'webm', family: 'audio' };
  if (ascii(0, 4) === 'OggS') return { mime: 'audio/ogg', ext: 'ogg', family: 'audio' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { mime: 'audio/wav', ext: 'wav', family: 'audio' };
  if (ascii(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg', ext: 'mp3', family: 'audio' };
  if (ascii(4, 8) === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a', family: 'audio' };
  return null;
}

/**
 * 64-bit difference hash: robust to resizing/re-compression, used to detect
 * near-identical photos of the same issue.
 */
async function differenceHash(buffer) {
  const { data } = await sharp(buffer).rotate().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits += data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0';
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

function hammingDistanceHex(a, b) {
  if (!a || !b) return null;
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (x) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

function storageKey(kind, ext) {
  const now = new Date();
  const folder = kind.toLowerCase().replace('_', '-');
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return path.posix.join(folder, String(yyyy), mm, `${crypto.randomUUID()}.${ext}`);
}

/**
 * Validates, stores and records one uploaded file.
 * @param {{buffer: Buffer, originalname?: string}} file multer file (memory storage)
 */
async function storeEvidence(file, { kind, uploadedBy = null, complaint = null, workOrder = null, status = 'ATTACHED', visibility = 'PUBLIC', derivedFrom = null }) {
  if (!file || !file.buffer || !file.buffer.length) throw ApiError.unprocessable('Uploaded file is empty.');

  const type = sniffType(file.buffer);
  const expectsImage = kind !== EVIDENCE_KIND.AUDIO;
  if (!type || (expectsImage && type.family !== 'image') || (!expectsImage && type.family !== 'audio')) {
    throw ApiError.unprocessable(
      expectsImage ? 'Unsupported image format. Use JPEG, PNG or WebP.' : 'Unsupported audio format. Use WebM, OGG, WAV, MP3 or M4A.',
      [{ field: file.fieldname || 'file', issue: 'INVALID_FILE_TYPE' }]
    );
  }
  const limit = expectsImage ? config.storage.maxImageBytes : config.storage.maxAudioBytes;
  if (file.buffer.length > limit) throw ApiError.unprocessable(`File exceeds ${Math.round(limit / 1048576)}MB limit.`);

  let meta = {};
  if (type.family === 'image') {
    try {
      const m = await sharp(file.buffer).metadata();
      meta = { width: m.width || null, height: m.height || null, perceptualHash: await differenceHash(file.buffer) };
    } catch {
      throw ApiError.unprocessable('Image file is corrupted or unreadable.');
    }
  }

  const storage = getStorage();
  const key = storageKey(kind, type.ext);
  await storage.put(key, file.buffer, type.mime);

  try {
    return await Evidence.create({
      complaint,
      workOrder,
      kind,
      status,
      visibility,
      storageProvider: storage.name,
      storageKey: key,
      originalName: (file.originalname || '').slice(0, 200),
      mimeType: type.mime,
      sizeBytes: file.buffer.length,
      sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
      uploadedBy,
      derivedFrom,
      ...meta,
    });
  } catch (err) {
    // Keep storage and database consistent: never leave orphaned files
    await storage.remove(key).catch(() => {});
    throw err;
  }
}

async function readEvidenceBuffer(evidence) {
  return getStorage().read(evidence.storageKey);
}

/**
 * Removes an evidence record and its stored file (used for rollback on failed submissions).
 */
async function deleteEvidence(evidence) {
  if (!evidence) return;
  await getStorage().remove(evidence.storageKey).catch(() => {});
  await Evidence.deleteOne({ _id: evidence._id });
}

module.exports = { storeEvidence, readEvidenceBuffer, deleteEvidence, sniffType, differenceHash, hammingDistanceHex };
