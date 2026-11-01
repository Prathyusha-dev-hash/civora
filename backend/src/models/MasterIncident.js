const mongoose = require('mongoose');
const { CATEGORIES, SEVERITY_LEVELS } = require('../config/constants');

/**
 * Groups every citizen complaint that describes the same real-world issue.
 * One master incident owns exactly one work order.
 */
const masterIncidentSchema = new mongoose.Schema(
  {
    incidentNumber: { type: String, required: true, unique: true },
    category: { type: String, enum: CATEGORIES, required: true },
    title: { type: String, default: '' },
    primaryComplaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    complaintCount: { type: Number, default: 1, min: 1 },
    duplicateCount: { type: Number, default: 0, min: 0 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, default: '' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    severityLevel: { type: String, enum: SEVERITY_LEVELS, default: 'MODERATE' },
    severityScore: { type: Number, min: 0, max: 10, default: 5 },
    status: { type: String, default: 'ASSIGNED', index: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', default: null },
    firstReportedAt: { type: Date, default: Date.now },
    lastReportedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

masterIncidentSchema.index({ location: '2dsphere' });
masterIncidentSchema.index({ category: 1, status: 1, lastReportedAt: -1 });

module.exports = mongoose.model('MasterIncident', masterIncidentSchema);
