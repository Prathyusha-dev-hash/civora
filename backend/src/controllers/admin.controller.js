/**
 * City-admin analytics computed from live MongoDB data (no cached or sample figures).
 */
const { Complaint, WorkOrder, MasterIncident, AuditLog, Department } = require('../models');
const { OPEN_COMPLAINT_STATUSES } = require('../config/constants');
const { detectHotspots, haversineDistance } = require('../utils/gis.utils');
const { ok, asyncHandler } = require('../utils/http');

const round1 = (n) => Math.round(n * 10) / 10;
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/** SLA compliance = resolved on time + still open but not yet overdue, over all work orders with an SLA. */
async function slaStats(match = {}) {
  const now = new Date();
  const [row] = await WorkOrder.aggregate([
    { $match: { ...match, slaDeadline: { $ne: null } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        compliant: {
          $sum: {
            $cond: [
              { $or: [{ $and: [{ $eq: ['$status', 'RESOLVED'] }, { $lte: ['$resolvedAt', '$slaDeadline'] }] }, { $and: [{ $ne: ['$status', 'RESOLVED'] }, { $gte: ['$slaDeadline', now] }] }] },
              1,
              0,
            ],
          },
        },
        overdue: { $sum: { $cond: [{ $and: [{ $not: [{ $in: ['$status', ['RESOLVED', 'PENDING_VERIFICATION']] }] }, { $lt: ['$slaDeadline', now] }] }, 1, 0] } },
        resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
        resolvedHours: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] }, 0] } },
      },
    },
  ]);
  return {
    total: row?.total || 0,
    compliancePct: row?.total ? round1((row.compliant / row.total) * 100) : 100,
    overdue: row?.overdue || 0,
    mttrHours: row?.resolvedCount ? round1(row.resolvedHours / row.resolvedCount) : 0,
  };
}

/** GET /admin/overview */
const overview = asyncHandler(async (req, res) => {
  const [total, open, closed, duplicates, needsReview, masters, sla, confirmations, disputes, bySeverity, byCategory] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: { $in: OPEN_COMPLAINT_STATUSES } }),
    Complaint.countDocuments({ status: 'CLOSED_VERIFIED' }),
    Complaint.countDocuments({ isPrimary: false }),
    Complaint.countDocuments({ needsReview: true, status: { $in: OPEN_COMPLAINT_STATUSES } }),
    MasterIncident.countDocuments(),
    slaStats(),
    AuditLog.countDocuments({ action: 'RESOLUTION_CONFIRMED' }),
    AuditLog.countDocuments({ action: 'RESOLUTION_DISPUTED' }),
    Complaint.aggregate([{ $group: { _id: '$severityLevel', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  ok(res, {
    total_incidents: total,
    active_backlog: open,
    resolved_count: closed,
    overdue_count: sla.overdue,
    sla_compliance_rate: sla.compliancePct,
    average_resolution_hours: sla.mttrHours,
    citizen_satisfaction_rate: confirmations + disputes ? round1((confirmations / (confirmations + disputes)) * 100) : 0,
    master_incidents: masters,
    duplicate_reports: duplicates,
    needs_review: needsReview,
    by_severity: Object.fromEntries(bySeverity.map((r) => [r._id, r.count])),
    by_category: Object.fromEntries(byCategory.map((r) => [r._id, r.count])),
    is_sandbox: false,
  });
});

/** GET /admin/hotspots — 300 m spatial clusters of complaints from the last 90 days (reuses gis.utils clustering). */
const hotspots = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 90 * 86400000);
  const complaints = await Complaint.find({ createdAt: { $gte: since } }).select('location category severityScore ward address masterIncident').lean();
  const points = complaints.map((c) => ({ ...c, location: { latitude: c.location.coordinates[1], longitude: c.location.coordinates[0] } }));
  const clusters = detectHotspots(points, 300);

  // Attach per-cluster detail by re-assigning complaints to the nearest cluster centre
  const detail = clusters.map(() => ({ scores: [], wards: {}, masters: new Set() }));
  for (const p of points) {
    let best = 0;
    let bestD = Infinity;
    clusters.forEach((cl, i) => {
      const d = haversineDistance(p.location.latitude, p.location.longitude, cl.latitude, cl.longitude);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (!detail[best]) continue;
    detail[best].scores.push(p.severityScore || 5);
    const ward = p.ward || p.address?.split(',')[0] || '';
    if (ward) detail[best].wards[ward] = (detail[best].wards[ward] || 0) + 1;
    if (p.masterIncident) detail[best].masters.add(String(p.masterIncident));
  }

  const data = clusters
    .map((cl, i) => {
      const d = detail[i];
      const avg = d.scores.length ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : 5;
      const ward = Object.entries(d.wards).sort((a, b) => b[1] - a[1])[0]?.[0] || `Zone ${cl.latitude.toFixed(3)}, ${cl.longitude.toFixed(3)}`;
      return {
        id: `HS-${i + 1}`,
        ward,
        zone: ward,
        category: cl.primaryCategory,
        categories: cl.categories,
        incident_count: cl.complaintCount,
        distinct_incidents: d.masters.size,
        center: { lat: cl.latitude, lng: cl.longitude },
        radius_meters: cl.radiusMeters,
        severity_weight: avg >= 8.5 ? 'CRITICAL' : avg >= 6.5 ? 'HIGH' : avg >= 4 ? 'MODERATE' : 'LOW',
        is_chronic_failure: cl.complaintCount >= 5 || d.masters.size >= 3,
        is_sandbox: false,
      };
    })
    .sort((a, b) => b.incident_count - a.incident_count);
  ok(res, data);
});

/** GET /admin/metrics/departments */
const departmentMetrics = asyncHandler(async (req, res) => {
  const depts = await Department.find({ isActive: true }).lean();
  const monthStart = startOfMonth();
  const rows = await Promise.all(
    depts.map(async (d) => {
      const [active, resolvedThisMonth, sla] = await Promise.all([
        WorkOrder.countDocuments({ department: d._id, status: { $ne: 'RESOLVED' } }),
        WorkOrder.countDocuments({ department: d._id, status: 'RESOLVED', resolvedAt: { $gte: monthStart } }),
        slaStats({ department: d._id }),
      ]);
      return {
        department: d.name,
        code: d.code,
        active_tickets: active,
        resolved_this_month: resolvedThisMonth,
        sla_compliance_percent: sla.compliancePct,
        mttr_hours: sla.mttrHours,
        overdue_tickets: sla.overdue,
        total_work_orders: sla.total,
        is_sandbox: false,
      };
    })
  );
  ok(res, rows.sort((a, b) => b.active_tickets - a.active_tickets || b.total_work_orders - a.total_work_orders));
});

/** GET /admin/audit-logs?ticket=&action=&limit= */
const auditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.ticket) filter.ticketNumber = String(req.query.ticket).toUpperCase();
  if (req.query.action) filter.action = String(req.query.action);
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
  ok(
    res,
    logs.map((l) => ({
      id: String(l._id),
      timestamp: l.timestamp,
      ticket_number: l.ticketNumber,
      actor: l.actorName,
      actor_role: l.actorRole,
      action: l.action,
      entity_type: l.entityType,
      previous_state: l.previousState,
      new_state: l.newState,
      notes: l.notes,
      is_sandbox: false,
    }))
  );
});

module.exports = { overview, hotspots, departmentMetrics, auditLogs };
