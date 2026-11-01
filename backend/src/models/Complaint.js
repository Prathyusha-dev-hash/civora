const mongoose = require('mongoose');
const { CATEGORIES, SEVERITY_LEVELS, COMPLAINT_STATUS, LANGUAGES } = require('../config/constants');

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
        message: 'Invalid coordinates',
      },
    },
  },
  { _id: false }
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * One record per citizen report. Never merged or deleted when a duplicate is
 * detected: duplicates are linked to a MasterIncident instead.
 */
const complaintSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: CATEGORIES, required: true },

    // Multilingual preservation: originalText is immutable once written
    inputMethod: { type: String, enum: ['text', 'audio'], required: true, default: 'text' },
    originalLanguage: { type: String, enum: LANGUAGES, default: 'en' },
    originalText: { type: String, required: true, trim: true, maxlength: 5000, immutable: true },
    englishTranslation: { type: String, default: null, maxlength: 5000 },
    transcriptionStatus: { type: String, enum: ['none', 'transcribed', 'failed'], default: 'none' },
    translationStatus: { type: String, enum: ['NOT_APPLICABLE', 'TRANSLATED', 'PENDING', 'FAILED'], default: 'PENDING' },
    translationMetadata: { type: mongoose.Schema.Types.Mixed, default: null },

    location: { type: pointSchema, required: true },
    address: { type: String, default: '', maxlength: 300 },
    ward: { type: String, default: '' },

    images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    redactedImages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    audio: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', default: null },

    status: { type: String, enum: Object.values(COMPLAINT_STATUS), default: COMPLAINT_STATUS.SUBMITTED, index: true },
    statusHistory: { type: [statusEventSchema], default: [] },

    severityLevel: { type: String, enum: SEVERITY_LEVELS, default: 'MODERATE' },
    severityScore: { type: Number, min: 0, max: 10, default: 5 },
    targetSlaHours: { type: Number, default: 48 },
    slaDeadline: { type: Date, default: null },
    assignedDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },

    // Duplicate grouping
    masterIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterIncident', default: null, index: true },
    isPrimary: { type: Boolean, default: true },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
    duplicateScore: { type: Number, default: null },

    // AI processing state
    aiStatus: { type: String, enum: ['PENDING', 'COMPLETED', 'PARTIAL', 'FALLBACK'], default: 'PENDING' },
    latestAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'AiAnalysis', default: null },
    needsReview: { type: Boolean, default: false },
    reviewReasons: { type: [String], default: [] },
    // English-text embedding used for semantic duplicate matching (not sent to clients)
    textEmbedding: { type: [Number], default: undefined, select: false },

    supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    supportCount: { type: Number, default: 1, min: 1 },

    citizenFeedback: {
      confirmed: { type: Boolean, default: null },
      notes: { type: String, default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ assignedDepartment: 1, status: 1 });
complaintSchema.index({ reporter: 1, createdAt: -1 });
complaintSchema.index({ createdAt: -1 });

complaintSchema.methods.pushStatus = function pushStatus(status, by = null, note = '') {
  if (this.status === status && this.statusHistory.length) return;
  this.status = status;
  this.statusHistory.push({ status, by, note, at: new Date() });
};

module.exports = mongoose.model('Complaint', complaintSchema);
