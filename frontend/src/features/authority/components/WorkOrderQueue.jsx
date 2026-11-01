import React from 'react';
import {
  Clock,
  MapPin,
  ChevronRight,
  HardHat,
  Filter,
  Inbox
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

export function WorkOrderQueue({
  workOrders = [],
  selectedOrderId = null,
  onSelectOrder,
  filterStatus = 'ALL',
  onFilterStatusChange,
  filterPriority = 'ALL',
  onFilterPriorityChange,
}) {
  const filteredOrders = workOrders.filter((w) => {
    if (filterStatus !== 'ALL' && w.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && w.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'warning';
      case 'MODERATE': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'ASSIGNED': return 'neutral';
      case 'EN_ROUTE': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'PENDING_VERIFICATION': return 'primary';
      case 'RESOLVED': return 'success';
      case 'ESCALATED': return 'critical';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Triage Bar */}
      <div className="bg-white dark:bg-[#2D3C49] p-4 sm:p-5 rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
        <div className="flex items-center gap-2.5">
          <Filter className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
          <span className="text-sm sm:text-base font-bold text-[#2E4A62] dark:text-[#F2F5F8]">Dispatch Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange && onFilterStatusChange(e.target.value)}
            className="min-h-[44px] text-sm sm:text-base font-medium bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] rounded-xl px-3.5 py-2 text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none focus:ring-2 focus:ring-[#7C97B0] cursor-pointer"
          >
            <option value="ALL" className="dark:bg-[#2D3C49]">All Statuses</option>
            <option value="ASSIGNED" className="dark:bg-[#2D3C49]">Assigned</option>
            <option value="EN_ROUTE" className="dark:bg-[#2D3C49]">En Route</option>
            <option value="IN_PROGRESS" className="dark:bg-[#2D3C49]">In Progress</option>
            <option value="PENDING_VERIFICATION" className="dark:bg-[#2D3C49]">Pending Verification</option>
            <option value="RESOLVED" className="dark:bg-[#2D3C49]">Resolved</option>
            <option value="ESCALATED" className="dark:bg-[#2D3C49]">Escalated</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => onFilterPriorityChange && onFilterPriorityChange(e.target.value)}
            className="min-h-[44px] text-sm sm:text-base font-medium bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] rounded-xl px-3.5 py-2 text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none focus:ring-2 focus:ring-[#7C97B0] cursor-pointer"
          >
            <option value="ALL" className="dark:bg-[#2D3C49]">All Priorities</option>
            <option value="CRITICAL" className="dark:bg-[#2D3C49]">Critical Priority</option>
            <option value="HIGH" className="dark:bg-[#2D3C49]">High Priority</option>
            <option value="MODERATE" className="dark:bg-[#2D3C49]">Moderate Priority</option>
          </select>

          <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-[#B7C3CE] font-mono pl-1">
            ({filteredOrders.length} records)
          </span>
        </div>
      </div>

      {/* Work Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No Work Orders Match Filter"
          description="Adjust your priority or status filter criteria to view active department tickets."
          actionLabel="Clear Filters"
          onAction={() => {
            if (onFilterStatusChange) onFilterStatusChange('ALL');
            if (onFilterPriorityChange) onFilterPriorityChange('ALL');
          }}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const isSelected = selectedOrderId === order.id;

            return (
              <div
                key={order.id}
                onClick={() => {
                  if (onSelectOrder) onSelectOrder(order);
                }}
                className={`bg-white dark:bg-[#2D3C49] rounded-2xl p-5 sm:p-6 border transition-all duration-150 cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'border-[#7C97B0] dark:border-[#8FAFCB] ring-2 ring-[#7C97B0]/20 bg-[#D6E3EF]/20 dark:bg-[#344656]/40'
                    : 'border-[#E1E7EE] dark:border-[#40515F] hover:border-[#7C97B0] dark:hover:border-[#8FAFCB] hover:bg-[#F7F9FB] dark:hover:bg-[#263746]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-[#2E4A62] dark:text-[#8FAFCB]">
                        {order.id}
                      </span>
                      <span className="text-slate-400 dark:text-[#B7C3CE]">•</span>
                      <span className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] font-mono">
                        Ref #{order.ticketNumber}
                      </span>
                      <Badge variant={getPriorityVariant(order.priority)} size="md">
                        {order.priority}
                      </Badge>
                      <Badge variant={getStatusVariant(order.status)} size="md">
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                      {order.isOverdue && (
                        <Badge variant="critical" size="md" dot>
                          OVERDUE
                        </Badge>
                      )}
                      {order.isSandbox && (
                        <Badge variant="warning" size="md">
                          SANDBOX
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8] line-clamp-1 leading-snug">
                      {order.title || order.description}
                    </h4>

                    <div className="flex items-center gap-4 text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] flex-wrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        <HardHat className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB]" />
                        {order.assignedCrew}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB]" />
                        {order.location?.address || 'Field Location'}
                      </span>
                      {order.slaDeadline && (
                        <span className={`flex items-center gap-1.5 font-mono ${
                          order.isOverdue ? 'text-[#C74949] dark:text-[#E56B6B] font-bold' : 'text-[#64748B] dark:text-[#B7C3CE]'
                        }`}>
                          <Clock className="w-4 h-4" />
                          SLA Target: {new Date(order.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                    <Button
                      type="button"
                      variant={isSelected ? 'primary' : 'outline'}
                      size="md"
                      icon={<ChevronRight className="w-5 h-5" />}
                      iconPosition="right"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectOrder) onSelectOrder(order);
                      }}
                    >
                      {isSelected ? 'Active Details' : 'Inspect Ticket'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WorkOrderQueue;
