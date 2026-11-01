import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AlertCircle,
  MapPin,
  Building2,
  FileText,
  Filter,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AdminKpiCards } from './components/AdminKpiCards';
import { GeographicHotspotMap } from './components/GeographicHotspotMap';
import { DepartmentPerformanceTable } from './components/DepartmentPerformanceTable';
import { CategoryAnalysisCard } from './components/CategoryAnalysisCard';
import { AuditLogTable } from './components/AuditLogTable';
import { AdminIncidentDetailModal } from './components/AdminIncidentDetailModal';
import { AdminService, IncidentService } from '../../services';
import { useLanguage } from '../../context/useLanguage';

export function AdminPortal() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('spatial'); // 'spatial' | 'departments' | 'audit'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [overview, setOverview] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [departmentMetrics, setDepartmentMetrics] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Filter states for citywide incidents
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, hotspotsData, deptsData, logsData, incidentsData] = await Promise.all([
        AdminService.getOverview(),
        AdminService.getHotspots(),
        AdminService.getDepartmentMetrics(),
        AdminService.getAuditLogs(),
        IncidentService.getIncidents(),
      ]);

      setOverview(overviewData);
      setHotspots(hotspotsData);
      setDepartmentMetrics(deptsData);
      setAuditLogs(logsData);
      setIncidents(incidentsData);
    } catch (err) {
      setError(err.message || 'Failed to retrieve municipal analytics data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      AdminService.getOverview(),
      AdminService.getHotspots(),
      AdminService.getDepartmentMetrics(),
      AdminService.getAuditLogs(),
      IncidentService.getIncidents(),
    ])
      .then(([overviewData, hotspotsData, deptsData, logsData, incidentsData]) => {
        if (isMounted) {
          setOverview(overviewData);
          setHotspots(hotspotsData);
          setDepartmentMetrics(deptsData);
          setAuditLogs(logsData);
          setIncidents(incidentsData);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to retrieve municipal analytics data.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered incidents for the administrative oversight table
  const filteredIncidents = incidents.filter((inc) => {
    if (deptFilter !== 'ALL' && inc.assignedDepartment !== deptFilter) return false;
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    return true;
  });

  const uniqueDepartments = Array.from(
    new Set(incidents.map((i) => i.assignedDepartment).filter(Boolean))
  );

  return (
    <div className="space-y-8">
      {/* Admin Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white dark:bg-[#2D3C49] p-6 sm:p-8 rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs transition-colors duration-150">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
              {t('admin.title')}
            </h1>
            <Badge variant="primary" size="md">{t('admin.badge')}</Badge>
          </div>
          <p className="text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] max-w-3xl leading-relaxed">
            {t('admin.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <Button
            type="button"
            variant="outline"
            size="md"
            loading={isLoading}
            icon={<RefreshCw className="w-5 h-5" />}
            onClick={fetchAdminData}
          >
            {t('admin.syncAnalytics')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 sm:p-5 bg-[#C74949]/10 text-[#C74949] dark:text-[#E56B6B] border border-[#C74949]/30 dark:border-[#E56B6B]/30 rounded-2xl text-sm sm:text-base flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#C74949] dark:text-[#E56B6B] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Level KPIs */}
      <AdminKpiCards overview={overview} />

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-2 border-b border-[#E1E7EE] dark:border-[#40515F] pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('spatial')}
          className={`min-h-[48px] flex items-center gap-2.5 px-5 py-3 text-sm sm:text-base font-bold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap select-none ${
            activeTab === 'spatial'
              ? 'bg-white dark:bg-[#2D3C49] border-t-2 border-x border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#8FAFCB] -mb-px shadow-2xs'
              : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
          }`}
        >
          <MapPin className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB]" />
          <span>{t('admin.spatialTab')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`min-h-[48px] flex items-center gap-2.5 px-5 py-3 text-sm sm:text-base font-bold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap select-none ${
            activeTab === 'departments'
              ? 'bg-white dark:bg-[#2D3C49] border-t-2 border-x border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#8FAFCB] -mb-px shadow-2xs'
              : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
          }`}
        >
          <Building2 className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB]" />
          <span>{t('admin.departmentsTab')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`min-h-[48px] flex items-center gap-2.5 px-5 py-3 text-sm sm:text-base font-bold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap select-none ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-[#2D3C49] border-t-2 border-x border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#8FAFCB] -mb-px shadow-2xs'
              : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
          }`}
        >
          <FileText className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB]" />
          <span>{t('admin.auditTab')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-[#2D3C49] rounded-xl p-12 border border-[#E1E7EE] dark:border-[#40515F]">
          <LoadingSpinner label="Compiling citywide governance intelligence..." />
        </div>
      ) : (
        <>
          {/* TAB 1: Spatial Hotspots & Citywide Complaints */}
          {activeTab === 'spatial' && (
            <div className="space-y-6">
              {/* Map + Category Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <GeographicHotspotMap hotspots={hotspots} incidents={incidents} />
                </div>
                <div className="lg:col-span-1">
                  <CategoryAnalysisCard incidents={incidents} />
                </div>
              </div>

              {/* Citywide Complaint Oversight Table */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Citywide Complaints Ledger</CardTitle>
                    <CardDescription>
                      Complete municipal incident intake across all divisions with status and SLA indicators.
                    </CardDescription>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 bg-[#F7F9FB] dark:bg-[#202C38] px-3.5 py-2 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] min-h-[44px]">
                      <SlidersHorizontal className="w-4 h-4 text-[#64748B] dark:text-[#B7C3CE] shrink-0" />
                      <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="bg-transparent border-0 text-sm sm:text-base text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none cursor-pointer"
                      >
                        <option value="ALL" className="dark:bg-[#2D3C49]">All Departments</option>
                        {uniqueDepartments.map((dept) => (
                          <option key={dept} value={dept} className="dark:bg-[#2D3C49]">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-[#F7F9FB] dark:bg-[#202C38] px-3.5 py-2 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] min-h-[44px]">
                      <Filter className="w-4 h-4 text-[#64748B] dark:text-[#B7C3CE] shrink-0" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent border-0 text-sm sm:text-base text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none cursor-pointer"
                      >
                        <option value="ALL" className="dark:bg-[#2D3C49]">All Statuses</option>
                        <option value="SUBMITTED" className="dark:bg-[#2D3C49]">Submitted</option>
                        <option value="TRIAGED" className="dark:bg-[#2D3C49]">Triaged</option>
                        <option value="ASSIGNED" className="dark:bg-[#2D3C49]">Assigned</option>
                        <option value="IN_PROGRESS" className="dark:bg-[#2D3C49]">In Progress</option>
                        <option value="ESCALATED" className="dark:bg-[#2D3C49]">Escalated</option>
                        <option value="RESOLVED" className="dark:bg-[#2D3C49]">Resolved</option>
                        <option value="CLOSED" className="dark:bg-[#2D3C49]">Closed</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  {filteredIncidents.length === 0 ? (
                    <div className="p-10 text-center text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE]">
                      No complaints match the specified department or status criteria.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm sm:text-base">
                      <thead>
                        <tr className="bg-[#F7F9FB] dark:bg-[#202C38] border-y border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] font-bold uppercase tracking-wider text-xs sm:text-sm">
                          <th className="py-4 px-4 sm:px-5">Ticket</th>
                          <th className="py-4 px-4">Category</th>
                          <th className="py-4 px-4">Department</th>
                          <th className="py-4 px-4">Severity</th>
                          <th className="py-4 px-4">Status</th>
                          <th className="py-4 px-4">Reports</th>
                          <th className="py-4 px-4">SLA Target</th>
                          <th className="py-4 px-4 sm:px-5 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E7EE] dark:divide-[#40515F]">
                        {filteredIncidents.map((inc) => (
                          <tr key={inc.id} className="hover:bg-[#F7F9FB] dark:hover:bg-[#263746] transition-colors">
                            <td className="py-4 px-4 sm:px-5 font-mono font-bold text-[#2E4A62] dark:text-[#8FAFCB]">
                              #{inc.ticketNumber || inc.id}
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] capitalize">
                                {inc.category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-[#64748B] dark:text-[#B7C3CE] font-medium">
                              {inc.assignedDepartment || 'Pending Assignment'}
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant={
                                  inc.severityLevel === 'CRITICAL'
                                    ? 'critical'
                                    : inc.severityLevel === 'HIGH'
                                    ? 'warning'
                                    : 'neutral'
                                }
                                size="md"
                              >
                                {inc.severityLevel} ({inc.severityScore || 'N/A'})
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant={
                                  inc.status === 'RESOLVED' || inc.status === 'CLOSED' || inc.status === 'CLOSED_VERIFIED'
                                    ? 'success'
                                    : inc.status === 'ESCALATED'
                                    ? 'critical'
                                    : 'primary'
                                }
                                size="md"
                              >
                                {inc.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge variant={inc.linkedReportCount > 1 ? 'warning' : 'neutral'} size="sm">
                                  {inc.linkedReportCount} {inc.linkedReportCount === 1 ? 'report' : 'reports'}
                                </Badge>
                                {!inc.isPrimaryReport && inc.masterIncidentId && (
                                  <span className="text-[11px] font-mono text-[#64748B] dark:text-[#B7C3CE]">Duplicate · {inc.masterIncidentId}</span>
                                )}
                                {inc.needsReview && (
                                  <span className="text-[11px] font-semibold text-[#B7791F] dark:text-[#E09E3E]">Needs review</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 font-mono text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE]">
                              {inc.targetSlaHours ? `${inc.targetSlaHours}h` : 'N/A'}
                            </td>
                            <td className="py-4 px-4 sm:px-5 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                icon={<Eye className="w-4 h-4" />}
                                onClick={async () => {
                                  setSelectedIncident(inc);
                                  // Load full record: linked duplicate reports + AI analysis
                                  try {
                                    const full = await IncidentService.getIncidentById(inc.ticketNumber || inc.id);
                                    if (full) setSelectedIncident(full);
                                  } catch (err) {
                                    console.warn('[AdminPortal] Failed to load incident details:', err.message);
                                  }
                                }}
                              >
                                Inspect
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: Department Performance & SLA */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <DepartmentPerformanceTable departmentMetrics={departmentMetrics} />

              {/* Department SLA Explainer Note */}
              <div className="p-4 bg-white dark:bg-[#2D3C49] rounded-xl border border-[#E1E7EE] dark:border-[#40515F] text-xs text-[#64748B] dark:text-[#B7C3CE] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D6B] dark:text-[#4EAD97] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-0.5">Municipal SLA Compliance Thresholds</h4>
                  <p className="leading-relaxed">
                    Departments maintaining &gt;90% SLA compliance adhere to municipal ordinance response mandates. Complaints exceeding statutory turnarounds are automatically escalated to ward superintendents and flagged in the administrative audit ledger.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Audit Ledger */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <AuditLogTable auditLogs={auditLogs} />
            </div>
          )}
        </>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <AdminIncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

export default AdminPortal;
