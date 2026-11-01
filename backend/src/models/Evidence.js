const mongoose = require('mongoose');
const { EVIDENCE_KIND } = require('../config/constants');

/**
 * Metadata for every stored file. The binary lives in the storage provider
 * (local disk today, object storage later); this record holds the reference.
 */
const evidenceSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null, index: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', default: null, index: true },
    kind: { type: String, enum: Object.values(EVIDENCE_KIND), required: true },
    // STAGED = uploaded before the complaint exists (e.g. redaction preview); ATTACHED = linked
    status: { type: String, enum: ['STAGED', 'ATTACHED'], default: 'ATTACHED', index: true },
    // RESTRICTED files (unredacted originals) are only signed for staff and the uploader
    visibility: { type: String, enum: ['PUBLIC', 'RESTRICTED'], default: 'PUBLIC' },

    storageProvider: { type: String, required: true },
    storageKey: { type: String, required: true, unique: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    sha256: { type: String, required: true, index: true },

    // Image-only: 64-bit difference hash (hex) used for near-duplicate photo matching
    perceptualHash: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },

    derivedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

evidenceSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Evidence', evidenceSchema);
