/**
 * Admin Service Data Mapper
 */

export function toUIAdminOverview(dto) {
  if (!dto) return null;
  return {
    totalIncidents: Number(dto.total_incidents ?? dto.totalIncidents ?? 0),
    activeBacklog: Number(dto.active_backlog ?? dto.activeBacklog ?? 0),
    resolvedCount: Number(dto.resolved_count ?? dto.resolvedCount ?? 0),
    overdueCount: Number(dto.overdue_count ?? dto.overdueCount ?? 0),
    slaComplianceRate: Number(dto.sla_compliance_rate ?? dto.slaComplianceRate ?? 0),
    averageResolutionHours: Number(dto.average_resolution_hours ?? dto.averageResolutionHours ?? 0),
    citizenSatisfactionRate: Number(dto.citizen_satisfaction_rate ?? dto.citizenSatisfactionRate ?? 0),
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

export function toUIHotspots(dtoList) {
  if (!Array.isArray(dtoList)) return [];
  return dtoList.map((h) => ({
    id: h.id || h.cluster_id || 'HOTSPOT-0',
    ward: h.ward || 'Ward Central',
    zone: h.zone || 'North Zone',
    category: h.category || 'Roads',
    incidentCount: Number(h.incident_count ?? h.incidentCount ?? 0),
    centerCoordinates: {
      lat: Number(h.center?.lat ?? h.lat ?? 28.6139),
      lng: Number(h.center?.lng ?? h.lng ?? 77.2090),
    },
    severityWeight: h.severity_weight || h.severityWeight || 'MODERATE',
    isChronicFailure: Boolean(h.is_chronic_failure ?? h.isChronicFailure ?? false),
    isSandbox: Boolean(h.is_sandbox ?? h.isSandbox ?? false),
  }));
}

export function toUIDepartmentMetrics(dtoList) {
  if (!Array.isArray(dtoList)) return [];
  return dtoList.map((d) => ({
    department: d.department || 'Operations',
    activeTickets: Number(d.active_tickets ?? d.activeTickets ?? 0),
    resolvedThisMonth: Number(d.resolved_this_month ?? d.resolvedThisMonth ?? 0),
    slaCompliancePercent: Number(d.sla_compliance_percent ?? d.slaCompliancePercent ?? 0),
    meanTimeToResolveHours: Number(d.mttr_hours ?? d.meanTimeToResolveHours ?? 0),
    overdueTickets: Number(d.overdue_tickets ?? d.overdueTickets ?? 0),
    isSandbox: Boolean(d.is_sandbox ?? d.isSandbox ?? false),
  }));
}

export function toUIAuditLogs(dtoList) {
  if (!Array.isArray(dtoList)) return [];
  return dtoList.map((log) => ({
    id: log.id || `LOG-${Date.now()}`,
    timestamp: log.timestamp || new Date().toISOString(),
    ticketNumber: log.ticket_number || log.ticketNumber || 'N/A',
    actor: log.actor || 'System',
    actorRole: log.actor_role || log.actorRole || 'SYSTEM',
    action: log.action || 'STATUS_CHANGE',
    previousState: log.previous_state || log.previousState || null,
    newState: log.new_state || log.newState || null,
    notes: log.notes || '',
    isSandbox: Boolean(log.is_sandbox ?? log.isSandbox ?? false),
  }));
}

