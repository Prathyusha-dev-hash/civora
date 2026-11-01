const mongoose = require('mongoose');

const Mixed = mongoose.Schema.Types.Mixed;

/**
 * Immutable record of one AI pipeline run for a complaint. Keeping runs as
 * separate documents preserves an auditable history of AI decisions.
 */
const aiAnalysisSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    status: { type: String, enum: ['COMPLETED', 'PARTIAL', 'FALLBACK'], required: true },
    provider: { type: String, default: '' },
    models: { type: Mixed, default: {} },

    transcription: { type: Mixed, default: null }, // { text, language, confidence, source }
    translation: { type: Mixed, default: null }, // { text, sourceLanguage, status, source }
    imageVerification: { type: Mixed, default: null }, // { overallRelevant, images: [...] }
    severity: { type: Mixed, default: null }, // { level, score, factors, explanation, method }
    routing: { type: Mixed, default: null }, // { category, department, method }
    duplicate: { type: Mixed, default: null }, // { isDuplicate, masterIncident, scores, method }

    stageErrors: [{ stage: String, message: String, _id: false }],
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AiAnalysis', aiAnalysisSchema);
