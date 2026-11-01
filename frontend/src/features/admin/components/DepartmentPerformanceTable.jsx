import React from 'react';
import { Building2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export function DepartmentPerformanceTable({ departmentMetrics = [] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Department Benchmarks & SLA Compliance</CardTitle>
          <CardDescription>
            Accountability matrix tracking Mean Time to Resolve (MTTR) and SLA fulfillment velocity.
          </CardDescription>
        </div>
        <Badge variant="primary" size="sm">Executive Oversight</Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F7F9FB] dark:bg-[#202C38] border-y border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Municipal Department</th>
              <th className="py-3 px-3 text-center">Active Backlog</th>
              <th className="py-3 px-3 text-center">Resolved (Month)</th>
              <th className="py-3 px-3">SLA Compliance</th>
              <th className="py-3 px-3 text-center">MTTR (Hours)</th>
              <th className="py-3 px-4 text-right">Overdue Breaches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E7EE] dark:divide-[#40515F]">
            {departmentMetrics.map((dept, index) => (
              <tr key={index} className="hover:bg-[#F7F9FB] dark:hover:bg-[#263746] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-[#2E4A62] dark:text-[#F2F5F8] flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#7C97B0] dark:text-[#8FAFCB]" />
                  <span>{dept.department}</span>
                </td>
                <td className="py-3.5 px-3 text-center font-mono font-medium text-[#2E4A62] dark:text-[#F2F5F8]">
                  {dept.activeTickets}
                </td>
                <td className="py-3.5 px-3 text-center font-mono font-medium text-[#2E7D6B] dark:text-[#4EAD97]">
                  {dept.resolvedThisMonth}
                </td>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-[#E1E7EE] dark:bg-[#40515F] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          dept.slaCompliancePercent >= 90 ? 'bg-[#2E7D6B] dark:bg-[#4EAD97]' : 'bg-[#B7791F]'
                        }`}
                        style={{ width: `${Math.min(dept.slaCompliancePercent, 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono font-bold ${
                      dept.slaCompliancePercent >= 90 ? 'text-[#2E7D6B] dark:text-[#4EAD97]' : 'text-[#B7791F] dark:text-[#E09E3E]'
                    }`}>
                      {dept.slaCompliancePercent}%
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-center font-mono font-medium text-[#2E4A62] dark:text-[#F2F5F8]">
                  {dept.meanTimeToResolveHours}h
                </td>
                <td className="py-3.5 px-4 text-right">
                  {dept.overdueTickets > 0 ? (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[#C74949] dark:text-[#E56B6B] bg-[#C74949]/15 dark:bg-[#E56B6B]/20 px-2 py-0.5 rounded border border-[#C74949]/30">
                      <AlertTriangle className="w-3 h-3 text-[#C74949] dark:text-[#E56B6B]" />
                      {dept.overdueTickets} overdue
                    </span>
                  ) : (
                    <span className="text-[#2E7D6B] dark:text-[#4EAD97] font-mono text-[11px]">0 breaches</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default DepartmentPerformanceTable;
