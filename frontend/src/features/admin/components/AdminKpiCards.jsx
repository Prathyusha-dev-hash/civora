import React from 'react';
import { BarChart3, AlertOctagon, Clock, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';

export function AdminKpiCards({ overview }) {
  if (!overview) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              Total Logged
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] font-mono">
              {overview.totalIncidents}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Across all municipal wards
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              Active Backlog
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#D6E3EF]/60 dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#2E4A62] dark:text-[#8FAFCB] font-mono">
              {overview.activeBacklog}
            </span>
            <span className="text-xs text-[#7C97B0] dark:text-[#8FAFCB] font-medium">Under Action</span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Triaged to department crews
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              SLA Overdue
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#C74949]/15 dark:bg-[#E56B6B]/20 text-[#C74949] dark:text-[#E56B6B] flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#C74949] dark:text-[#E56B6B] font-mono">
              {overview.overdueCount}
            </span>
            <span className="text-xs text-[#C74949] dark:text-[#E56B6B] font-semibold">Breaches</span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Escalation flags raised
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              SLA Compliance
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#2E7D6B]/15 dark:bg-[#4EAD97]/20 text-[#2E7D6B] dark:text-[#4EAD97] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#2E7D6B] dark:text-[#4EAD97] font-mono">
              {overview.slaComplianceRate}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Citywide resolution target
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2 lg:col-span-1">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              Avg Turnaround
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#B7791F]/15 dark:bg-[#E09E3E]/20 text-[#B7791F] dark:text-[#E09E3E] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#B7791F] dark:text-[#E09E3E] font-mono">
              {overview.averageResolutionHours}h
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#B7C3CE]">MTTR</span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Mean time to verified resolve
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminKpiCards;
