const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CITIZEN, index: true },
    // Only authority users belong to a department
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    isActive: { type: Boolean, default: true },
    // Incremented on logout / password reset to invalidate previously issued JWTs
    tokenVersion: { type: Number, default: 0 },
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpiresAt: { type: Date, select: false, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, department: 1 });

module.exports = mongoose.model('User', userSchema);
