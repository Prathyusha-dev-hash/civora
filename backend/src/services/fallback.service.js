/**
 * Deterministic fallbacks used ONLY when the AI service is unavailable, so a
 * citizen complaint is still persisted, routed and visible. Every result is
 * labelled method: 'RULE_BASED_FALLBACK' and the complaint is flagged for
 * human review; these never masquerade as AI output.
 * (Keyword lists ported from the original Civora priority engine.)
 */
const CRITICAL_WORDS = ['open manhole', 'manhole', 'live wire', 'electrocut', 'collapse', 'collapsed', 'gas leak', 'sinkhole', 'cave-in', 'bridge crack'];
const HIGH_WORDS = ['dangerous', 'severe', 'accident', 'critical', 'major', 'hazard', 'deep', 'emergency', 'risk', 'busy road', 'flood', 'sewage', 'overflow', 'burst', 'school', 'hospital'];
const LOW_WORDS = ['minor', 'small', 'cosmetic', 'non-urgent', 'slight', 'low risk', 'faded'];

function ruleBasedSeverity(category, text) {
  const t = (text || '').toLowerCase();
  const hits = (list) => list.filter((w) => t.includes(w));
  const crit = hits(CRITICAL_WORDS);
  const high = hits(HIGH_WORDS);
  const low = hits(LOW_WORDS);

  let level = 'MODERATE';
  let score = 5;
  if (crit.length || category === 'safety') {
    level = crit.length ? 'CRITICAL' : 'HIGH';
    score = crit.length ? 9 : 7;
  } else if (high.length) {
    level = 'HIGH';
    score = 7;
  } else if (low.length) {
    level = 'LOW';
    score = 3;
  }
  const factors = [...crit, ...high, ...low].slice(0, 4).map((w) => `Keyword: "${w}"`);
  return {
    severity_level: level,
    score,
    factors: factors.length ? factors : ['Default rating for category'],
    explanation: 'AI service unavailable - provisional keyword-based rating; requires human review.',
    method: 'RULE_BASED_FALLBACK',
  };
}

const STOP = new Set(['the', 'and', 'for', 'near', 'with', 'from', 'this', 'that', 'there', 'are', 'was', 'has', 'have', 'our', 'very']);
function tokens(text) {
  return new Set((text || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.filter((w) => !STOP.has(w)) || []);
}

/** Jaccard word-overlap similarity (0..1), the original Civora text matcher. */
function jaccard(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => {
    if (B.has(w)) inter += 1;
  });
  return inter / (A.size + B.size - inter);
}

module.exports = { ruleBasedSeverity, jaccard };
