const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    // Complaint categories this department is responsible for (routing table)
    categories: { type: [String], default: [], index: true },
    contactEmail: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
