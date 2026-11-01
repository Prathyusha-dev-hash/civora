import React from 'react';
import { HardHat, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';

export function AuthorityDashboardMetrics({ workOrders = [] }) {
  const total = workOrders.length;
  const critical = workOrders.filter((w) => w.priority === 'CRITICAL').length;
  const inProgress = workOrders.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'EN_ROUTE').length;
  const overdue = workOrders.filter((w) => w.isOverdue).length;
  const pendingSignOff = workOrders.filter((w) => w.status === 'PENDING_VERIFICATION').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              Active Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] flex items-center justify-center">
              <HardHat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] font-mono">{total}</span>
            <span className="text-xs text-[#64748B] dark:text-[#B7C3CE]">In Queue</span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">{inProgress}</span> crew units deployed
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              Critical Priority
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#C74949]/15 dark:bg-[#E56B6B]/20 text-[#C74949] dark:text-[#E56B6B] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#C74949] dark:text-[#E56B6B] font-mono">{critical}</span>
            <span className="text-xs text-[#C74949] dark:text-[#E56B6B] font-semibold">Immediate</span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            SLA target: 4-hour field response
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              SLA Overdue
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#B7791F]/15 dark:bg-[#E09E3E]/20 text-[#B7791F] dark:text-[#E09E3E] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#B7791F] dark:text-[#E09E3E] font-mono">{overdue}</span>
            <span className="text-xs text-[#B7791F] dark:text-[#E09E3E] font-medium">Breached</span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Requires supervisory escalation
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
              Pending Sign-Off
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#2E7D6B]/15 dark:bg-[#4EAD97]/20 text-[#2E7D6B] dark:text-[#4EAD97] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#2E7D6B] dark:text-[#4EAD97] font-mono">{pendingSignOff}</span>
            <span className="text-xs text-[#2E7D6B] dark:text-[#4EAD97] font-medium">AI Verified</span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Awaiting citizen verification
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthorityDashboardMetrics;
