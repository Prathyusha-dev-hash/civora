const mongoose = require('mongoose');

/**
 * Atomic sequence generator for human-readable ids (CIV-000001, MI-000001, WO-000001).
 * Replaces the old random 4-digit id + retry loop, which could collide.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

async function nextSequence(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

async function nextId(prefix) {
  const seq = await nextSequence(prefix);
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

module.exports = { Counter, nextSequence, nextId };
