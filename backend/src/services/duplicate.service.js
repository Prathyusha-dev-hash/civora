/**
 * Duplicate detection: semantic similarity (Gemini embeddings of the English
 * text) + image similarity (perceptual hash) + geographic proximity (2dsphere
 * query + Haversine) + category agreement, scored against open master incidents.
 */
const { MasterIncident, Complaint } = require('../models');
const { config } = require('../config/env');
const { haversineDistance } = require('../utils/gis.utils');
const { hammingDistanceHex } = require('./evidence.service');
const { jaccard } = require('./fallback.service');

const SEMANTIC_MIN_EMBEDDING = Number(process.env.DUP_SEMANTIC_MIN || 0.7);
const SEMANTIC_MIN_JACCARD = 0.25;
const CLOSED_STATUSES = ['RESOLVED'];

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : null;
}

async function findCandidateMasters({ lng, lat }, { excludeMasterId = null } = {}) {
  const since = new Date(Date.now() - config.duplicates.windowDays * 86400 * 1000);
  const query = {
    location: { $nearSphere: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: config.duplicates.radiusMeters } },
    status: { $nin: CLOSED_STATUSES },
    lastReportedAt: { $gte: since },
  };
  if (excludeMasterId) query._id = { $ne: excludeMasterId };
  return MasterIncident.find(query).limit(15);
}

/**
 * Scores the new report against one master incident.
 * @param {{text: string, embedding?: number[], imageHashes: string[], category: string, lat: number, lng: number}} probe
 */
async function scoreMaster(probe, master, excludeComplaintId = null) {
  const filter = { masterIncident: master._id };
  if (excludeComplaintId) filter._id = { $ne: excludeComplaintId };
  const members = await Complaint.find(filter)
    .select('+textEmbedding ticketNumber englishTranslation originalText category location images isPrimary createdAt status supportCount originalLanguage inputMethod audio')
    .populate('images', 'perceptualHash');
  if (!members.length) return null;

  let semantic = null;
  let semanticMethod = 'embedding';
  for (const m of members) {
    const s = cosine(probe.embedding, m.textEmbedding);
    if (s !== null) semantic = Math.max(semantic ?? -1, s);
  }
  if (semantic === null) {
    semanticMethod = 'jaccard';
    semantic = Math.max(...members.map((m) => jaccard(probe.text, m.englishTranslation || m.originalText)));
  }

  let image = null;
  const memberHashes = members.flatMap((m) => (m.images || []).map((i) => i.perceptualHash).filter(Boolean));
  if (probe.imageHashes.length && memberHashes.length) {
    for (const a of probe.imageHashes) for (const b of memberHashes) image = Math.max(image ?? 0, 1 - hammingDistanceHex(a, b) / 64);
  }

  const distanceMeters = Math.min(
    ...members.map((m) => haversineDistance(probe.lat, probe.lng, m.location.coordinates[1], m.location.coordinates[0]))
  );
  const geo = Math.max(0, 1 - distanceMeters / config.duplicates.radiusMeters);
  const sameCategory = members.some((m) => m.category === probe.category) || master.category === probe.category;
  const cat = sameCategory ? 1 : 0;

  const combined = image !== null ? 0.45 * semantic + 0.25 * image + 0.2 * geo + 0.1 * cat : 0.6 * semantic + 0.28 * geo + 0.12 * cat;

  const semanticFloor = semanticMethod === 'embedding' ? SEMANTIC_MIN_EMBEDDING : SEMANTIC_MIN_JACCARD;
  const nearIdenticalPhoto = image !== null && image >= 0.9 && distanceMeters <= 100;
  let isDuplicate = combined >= config.duplicates.threshold && semantic >= semanticFloor;
  // Different problems at the same spot (e.g. pothole vs streetlight) are not merged unless text is near-identical
  if (!sameCategory && semantic < 0.85) isDuplicate = false;
  if (nearIdenticalPhoto) isDuplicate = true;

  const primary = members.find((m) => m.isPrimary) || members[0];
  return {
    master,
    primary,
    isDuplicate,
    scores: {
      combined: Number(combined.toFixed(4)),
      semantic: Number(semantic.toFixed(4)),
      semanticMethod,
      image: image === null ? null : Number(image.toFixed(4)),
      geo: Number(geo.toFixed(4)),
      category: cat,
      distanceMeters,
    },
  };
}

/**
 * Returns scored candidates, best first.
 */
async function evaluate(probe, opts = {}) {
  const masters = await findCandidateMasters(probe, opts);
  const scored = [];
  for (const m of masters) {
    const s = await scoreMaster(probe, m, opts.excludeComplaintId);
    if (s) scored.push(s);
  }
  return scored.sort((a, b) => b.scores.combined - a.scores.combined);
}

module.exports = { evaluate, cosine, findCandidateMasters };
