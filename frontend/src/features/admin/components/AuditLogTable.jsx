import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export function AuditLogTable({ auditLogs = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTicket = log.ticketNumber?.toLowerCase().includes(term);
      const matchActor = log.actor?.toLowerCase().includes(term);
      const matchAction = log.action?.toLowerCase().includes(term);
      const matchNotes = log.notes?.toLowerCase().includes(term);
      if (!matchTicket && !matchActor && !matchAction && !matchNotes) return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Tamper-Evident Governance Audit Trail</CardTitle>
            <Badge variant="primary" size="sm">Immutable Ledger</Badge>
          </div>
          <CardDescription>
            Chronological log of every status transition, department assignment, and citizen verification event.
          </CardDescription>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-[#B7C3CE]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ticket or actor..."
              className="pl-8 pr-2.5 py-1 text-xs bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B] dark:placeholder:text-[#B7C3CE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7C97B0]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-1 px-2.5 text-xs bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] rounded-lg"
          >
            <option value="ALL" className="dark:bg-[#2D3C49]">All Roles</option>
            <option value="CITIZEN" className="dark:bg-[#2D3C49]">Citizen</option>
            <option value="AUTHORITY_FIELD_OFFICER" className="dark:bg-[#2D3C49]">Field Officer</option>
            <option value="AUTHORITY_SUPERVISOR" className="dark:bg-[#2D3C49]">Supervisor</option>
            <option value="SYSTEM" className="dark:bg-[#2D3C49]">System / AI</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F7F9FB] dark:bg-[#202C38] border-y border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-3">Ticket Ref</th>
              <th className="py-3 px-3">Actor & Role</th>
              <th className="py-3 px-3">Action Event</th>
              <th className="py-3 px-3">State Transition</th>
              <th className="py-3 px-4">Audit Details & Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E7EE] dark:divide-[#40515F]">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F7F9FB] dark:hover:bg-[#263746] transition-colors">
                <td className="py-3 px-4 font-mono text-[11px] text-[#64748B] dark:text-[#B7C3CE] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="py-3 px-3 font-mono font-bold text-[#2E4A62] dark:text-[#8FAFCB]">
                  #{log.ticketNumber}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">{log.actor}</span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#B7C3CE] font-mono">{log.actorRole}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-block bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-mono font-medium px-2 py-0.5 rounded text-[11px]">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
                  {log.previousState ? (
                    <span>{log.previousState} → <strong className="text-[#2E4A62] dark:text-[#8FAFCB]">{log.newState}</strong></span>
                  ) : (
                    <strong className="text-[#2E4A62] dark:text-[#8FAFCB]">{log.newState || 'INITIAL'}</strong>
                  )}
                </td>
                <td className="py-3 px-4 text-[#64748B] dark:text-[#B7C3CE] leading-relaxed max-w-xs truncate">
                  {log.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default AuditLogTable;
