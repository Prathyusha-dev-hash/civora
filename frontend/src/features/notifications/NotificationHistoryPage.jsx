import { useState, useCallback, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  Eye,
  Clock,
  ShieldAlert,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/useNotification';
import { useLanguage } from '../../context/useLanguage';

function formatNotificationTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function NotificationHistoryPage() {
  const {
    notifications,
    unreadCount,
    actionRequiredCount,
    markAsRead,
    markAllAsRead,
    confirmResolution,
    disputeResolution,
  } = useNotification();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'ACTION_REQUIRED' | 'URGENT'
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectItem, setInspectItem] = useState(null);
  const [disputeItem, setDisputeItem] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'UNREAD' && n.read) return false;
      if (activeTab === 'ACTION_REQUIRED' && !n.actionRequired) return false;
      if (activeTab === 'URGENT' && n.priority !== 'URGENT') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (n.title || '').toLowerCase().includes(query);
        const msgMatch = (n.message || '').toLowerCase().includes(query);
        const ticketMatch = (n.complaintId || '').toLowerCase().includes(query);
        const woMatch = (n.workOrderId || '').toLowerCase().includes(query);
        return titleMatch || msgMatch || ticketMatch || woMatch;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const handleConfirm = useCallback(
    async (item) => {
      if (!item.complaintId) return;
      try {
        setActionInProgress(item.id);
        await confirmResolution(item.complaintId, 'Confirmed by citizen via Notification History');
        setActionSuccessMsg(
          t('notifications.confirmSuccessMsg', { id: item.complaintId }) ||
            `Complaint #${item.complaintId} verified and closed.`
        );
        setTimeout(() => setActionSuccessMsg(null), 4000);
        if (inspectItem?.id === item.id) {
          setInspectItem(null);
        }
      } catch (err) {
        console.error('[NotificationHistoryPage] Confirm error:', err);
      } finally {
        setActionInProgress(null);
      }
    },
    [confirmResolution, inspectItem, t]
  );

  const handleOpenDispute = (item) => {
    setDisputeItem(item);
    setDisputeReason('');
    if (inspectItem) {
      setInspectItem(null);
    }
  };

  const handleSubmitDispute = useCallback(async () => {
    if (!disputeItem?.complaintId) return;
    try {
      setActionInProgress(disputeItem.id);
      await disputeResolution(disputeItem.complaintId, disputeReason);
      setActionSuccessMsg(
        t('notifications.disputeSuccessMsg', { id: disputeItem.complaintId }) ||
          `Complaint #${disputeItem.complaintId} returned for rework.`
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setDisputeItem(null);
      setDisputeReason('');
    } catch (err) {
      console.error('[NotificationHistoryPage] Dispute error:', err);
    } finally {
      setActionInProgress(null);
    }
  }, [disputeItem, disputeReason, disputeResolution, t]);

  return (
    <div className="min-h-screen bg-[#F7F9FB] dark:bg-[#202C38] py-8 sm:py-12 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#D6E3EF] text-[#2E4A62] dark:bg-[#344656] dark:text-[#8FAFCB] border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30">
                  <Bell className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB]" />
                  <span>Civic Activity Feed</span>
                </span>
                <span className="text-xs bg-[#B7791F]/15 text-[#B7791F] dark:text-[#E09E3E] font-mono px-2 py-0.5 rounded border border-[#B7791F]/30">
                  Sandbox Simulation
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
                {t('notifications.title') || 'Notification Center'}
              </h1>
              <p className="text-lg sm:text-xl text-[#64748B] dark:text-[#B7C3CE] mt-2 max-w-2xl leading-relaxed">
                {t('notifications.emptySubtitle') ||
                  'Real-time status updates, field crew dispatches, resolution verification proofs, and SLA milestones.'}
              </p>
            </div>

            {/* Quick Actions */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-base font-bold text-white bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] dark:text-[#202C38] transition-colors shadow-xs cursor-pointer select-none"
              >
                <CheckCheck className="w-5 h-5" />
                <span>{t('notifications.markAllAsRead') || 'Mark All as Read'}</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] shadow-xs">
              <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider block">
                Total
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] mt-1 block">
                {notifications.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] shadow-xs">
              <span className="text-xs sm:text-sm font-semibold text-[#7C97B0] dark:text-[#8FAFCB] uppercase tracking-wider block">
                Unread
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] mt-1 block">
                {unreadCount}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] shadow-xs">
              <span className="text-xs sm:text-sm font-semibold text-[#B7791F] dark:text-[#E09E3E] uppercase tracking-wider block">
                Action Required
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#B7791F] dark:text-[#E09E3E] mt-1 block">
                {actionRequiredCount}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] shadow-xs">
              <span className="text-xs sm:text-sm font-semibold text-[#C74949] dark:text-[#E56B6B] uppercase tracking-wider block">
                Urgent
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#C74949] dark:text-[#E56B6B] mt-1 block">
                {notifications.filter((n) => n.priority === 'URGENT').length}
              </span>
            </div>
          </div>
        </div>

        {/* Action Success Alert Banner */}
        {actionSuccessMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 text-[#2E7D6B] dark:text-[#4EAD97] text-base font-bold flex items-center gap-3 animate-in fade-in shadow-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#2E7D6B] dark:text-[#4EAD97]" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-[#2D3C49] p-4 rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] shadow-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-base font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-[#7C97B0] text-white dark:bg-[#8FAFCB] dark:text-[#202C38] shadow-sm'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:bg-[#F7F9FB] dark:hover:bg-[#344656]'
              }`}
            >
              {t('notifications.tabAll') || 'All'} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNREAD')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-base font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'UNREAD'
                  ? 'bg-[#7C97B0] text-white dark:bg-[#8FAFCB] dark:text-[#202C38] shadow-sm'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:bg-[#F7F9FB] dark:hover:bg-[#344656]'
              }`}
            >
              {t('notifications.tabUnread') || 'Unread'} ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACTION_REQUIRED')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-base font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ACTION_REQUIRED'
                  ? 'bg-[#B7791F] text-white dark:bg-[#E09E3E] dark:text-[#202C38] shadow-sm'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:bg-[#F7F9FB] dark:hover:bg-[#344656]'
              }`}
            >
              {t('notifications.tabActionRequired') || 'Action Required'} ({actionRequiredCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('URGENT')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-base font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'URGENT'
                  ? 'bg-[#C74949] text-white dark:bg-[#E56B6B] dark:text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:bg-[#F7F9FB] dark:hover:bg-[#344656]'
              }`}
            >
              {t('notifications.priorityUrgent') || 'Urgent'} (
              {notifications.filter((n) => n.priority === 'URGENT').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] md:max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-[#B7C3CE]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications, #tickets..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] text-base focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB]"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-[#2D3C49] rounded-3xl p-12 text-center border border-[#E1E7EE] dark:border-[#40515F] shadow-xs">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#D6E3EF] dark:bg-[#344656] flex items-center justify-center text-[#7C97B0] dark:text-[#8FAFCB]">
                <Filter className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8]">
                No matching notifications found
              </h3>
              <p className="text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] mt-2 max-w-md mx-auto">
                Try switching filter tabs or clearing your search query to view all civic alerts.
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-[#F7F9FB] hover:bg-[#E1E7EE] dark:bg-[#202C38] dark:hover:bg-[#344656] text-[#2E4A62] dark:text-[#F2F5F8] text-base font-bold transition-colors cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const titleText = (n.titleKey && t(n.titleKey, n.params)) || n.title;
              const messageText = (n.messageKey && t(n.messageKey, n.params)) || n.message;
              const isResolutionVerify = n.actionType === 'VERIFY_RESOLUTION' && n.actionRequired;
              const isUrgent = n.priority === 'URGENT';
              const isActionRequired = n.priority === 'ACTION_REQUIRED' || n.actionRequired;

              return (
                <div
                  key={n.id}
                  className={`p-5 sm:p-6 rounded-3xl border transition-all duration-150 ${
                    !n.read
                      ? 'bg-[#D6E3EF]/30 dark:bg-[#344656]/30 border-[#7C97B0]/40 dark:border-[#8FAFCB]/30 shadow-sm'
                      : 'bg-white dark:bg-[#2D3C49] border-[#E1E7EE] dark:border-[#40515F] shadow-xs'
                  }`}
                >
                  {/* Top Meta Row */}
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#C74949]/15 text-[#C74949] dark:bg-[#C74949]/25 dark:text-[#E56B6B] border border-[#C74949]/30">
                          <ShieldAlert className="w-4 h-4" />
                          {t('notifications.priorityUrgent') || 'Urgent Priority'}
                        </span>
                      )}
                      {isActionRequired && !isUrgent && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#B7791F]/15 text-[#B7791F] dark:bg-[#B7791F]/25 dark:text-[#E09E3E] border border-[#B7791F]/30">
                          <AlertTriangle className="w-4 h-4" />
                          {t('notifications.priorityActionRequired') || 'Action Required'}
                        </span>
                      )}
                      {!isUrgent && !isActionRequired && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-[#E1E7EE] text-[#2E4A62] dark:bg-[#40515F] dark:text-[#B7C3CE]">
                          {t('notifications.priorityInfo') || 'Information'}
                        </span>
                      )}

                      {n.complaintId && (
                        <span className="text-xs sm:text-sm font-mono font-bold text-[#2E4A62] dark:text-[#8FAFCB] bg-[#D6E3EF] dark:bg-[#344656] px-2.5 py-1 rounded-lg border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30">
                          Ticket #{n.complaintId}
                        </span>
                      )}

                      {n.workOrderId && (
                        <span className="text-xs sm:text-sm font-mono font-semibold text-[#64748B] dark:text-[#B7C3CE] bg-[#F7F9FB] dark:bg-[#202C38] px-2.5 py-1 rounded-lg">
                          Work Order #{n.workOrderId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-[#64748B] dark:text-[#B7C3CE]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{formatNotificationTime(n.createdAt)}</span>
                      </div>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(n.id)}
                          className="text-xs sm:text-sm font-bold text-[#7C97B0] dark:text-[#8FAFCB] hover:text-[#2E4A62] dark:hover:text-white cursor-pointer"
                        >
                          {t('notifications.markAsRead') || 'Mark Read'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Body */}
                  <h3 className="text-xl sm:text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] leading-tight">
                    {titleText}
                  </h3>
                  <p className="text-base sm:text-lg text-[#2E4A62]/90 dark:text-[#B7C3CE] mt-2 leading-relaxed">
                    {messageText}
                  </p>

                  {/* Resolution Verification Workflow Card */}
                  {isResolutionVerify && (
                    <div className="mt-4 p-5 rounded-2xl bg-[#B7791F]/10 dark:bg-[#B7791F]/20 border border-[#B7791F]/30 dark:border-[#E09E3E]/40">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#B7791F] dark:text-[#E09E3E]" />
                          <span className="font-bold text-base sm:text-lg text-[#B7791F] dark:text-[#E09E3E]">
                            {t('notifications.aiVerificationBadge', {
                              confidence: n.aiConfidence || 93,
                            }) || `AI Computer Vision: ${n.aiConfidence || 93}% Verified`}
                          </span>
                        </div>
                        {n.resolutionProofUrl && (
                          <button
                            type="button"
                            onClick={() => setInspectItem(n)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] font-bold text-sm sm:text-base text-[#2E4A62] dark:text-[#F2F5F8] hover:bg-[#F7F9FB] dark:hover:bg-[#344656] transition-colors shadow-xs cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{t('notifications.beforeAfterPhotos') || 'Inspect Before / After Photos'}</span>
                          </button>
                        )}
                      </div>

                      <p className="text-sm sm:text-base text-[#B7791F] dark:text-[#E09E3E] mb-4 leading-relaxed">
                        Notice: While AI verification passed, municipal standards require your explicit confirmation as
                        the reporting citizen before closing the ticket.
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                          type="button"
                          disabled={actionInProgress === n.id}
                          onClick={() => handleConfirm(n)}
                          className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#2E7D6B] hover:bg-[#246355] text-white font-bold text-base sm:text-lg rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>{t('notifications.confirmResolution') || 'Confirm Resolution'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionInProgress === n.id}
                          onClick={() => handleOpenDispute(n)}
                          className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C74949] hover:bg-[#A83939] text-white font-bold text-base sm:text-lg rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <AlertTriangle className="w-5 h-5" />
                          <span>{t('notifications.reportNotFixed') || 'Report Problem Not Fixed'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Details Link */}
                  {n.linkUrl && (
                    <div className="mt-4 pt-3 border-t border-[#E1E7EE] dark:border-[#40515F] flex justify-end">
                      <Link
                        to={n.linkUrl}
                        className="inline-flex items-center gap-2 text-base font-bold text-[#7C97B0] dark:text-[#8FAFCB] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]"
                      >
                        <span>{t('common.inspect') || 'View Complete Ticket Details'}</span>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Before / After Photo Comparison Inspection Modal */}
      {inspectItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-comparison-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h2
                  id="history-comparison-title"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white"
                >
                  {t('notifications.beforeAfterPhotos') || 'Inspect Repair Evidence'}
                </h2>
                <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
                  Complaint #{inspectItem.complaintId} •{' '}
                  {t('notifications.aiVerificationBadge', { confidence: inspectItem.aiConfidence || 93 }) ||
                    `AI Confidence: ${inspectItem.aiConfidence || 93}%`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Photo Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 my-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 font-bold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span>{t('notifications.beforePhoto') || 'Reported Issue (Before)'}</span>
                </div>
                {inspectItem.originalImageUrl ? (
                  <img
                    src={inspectItem.originalImageUrl}
                    alt="Before Repair"
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-base">
                    No initial photo available
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] overflow-hidden bg-[#F7F9FB] dark:bg-[#202C38]">
                <div className="px-4 py-3 bg-[#2E7D6B]/15 dark:bg-[#2E7D6B]/30 font-bold text-base text-[#2E7D6B] dark:text-[#4EAD97] flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#2E7D6B] dark:bg-[#4EAD97] inline-block" />
                  <span>{t('notifications.afterPhoto') || 'Authority Resolution Proof (After)'}</span>
                </div>
                {inspectItem.resolutionProofUrl ? (
                  <img
                    src={inspectItem.resolutionProofUrl}
                    alt="After Repair"
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-[#64748B] dark:text-[#B7C3CE] text-base">
                    No resolution proof image
                  </div>
                )}
              </div>
            </div>

            {/* Citizen Decision Prompt */}
            <div className="p-5 rounded-2xl bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] mt-4">
              <h4 className="text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8] mb-1">
                {t('tracker.citizenSignOffTitle') || 'Citizen Resolution Sign-Off'}
              </h4>
              <p className="text-base text-[#64748B] dark:text-[#B7C3CE] mb-4 leading-relaxed">
                {t('tracker.citizenSignOffPrompt') ||
                  'Municipal crews reported this issue as resolved. Has the issue been satisfactorily remediated?'}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  disabled={actionInProgress === inspectItem.id}
                  onClick={() => handleConfirm(inspectItem)}
                  className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#2E7D6B] hover:bg-[#246355] text-white font-bold text-base sm:text-lg rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t('notifications.confirmResolution') || 'Confirm Resolution'}</span>
                </button>
                <button
                  type="button"
                  disabled={actionInProgress === inspectItem.id}
                  onClick={() => handleOpenDispute(inspectItem)}
                  className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-bold text-base sm:text-lg rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>{t('notifications.reportNotFixed') || 'Report Problem Not Fixed'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Reason Modal */}
      {disputeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-dispute-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3
                  id="history-dispute-modal-title"
                  className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
                >
                  {t('notifications.disputeModalTitle') || 'Report Problem Not Fixed'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDisputeItem(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-base text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              {t('notifications.disputeModalDesc') ||
                'Please explain why the issue is not fixed so the municipal department can perform immediate rework on complaint #' +
                  disputeItem.complaintId +
                  '.'}
            </p>

            <div className="mb-5">
              <label
                htmlFor="historyDisputeNotes"
                className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2"
              >
                {t('tracker.feedbackNotesLabel') || 'Reason / Details'}
              </label>
              <textarea
                id="historyDisputeNotes"
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={
                  t('notifications.disputeReasonPlaceholder') ||
                  'Describe what remains unresolved (e.g., pothole still unpaved, water still leaking)...'
                }
                className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisputeItem(null)}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-base cursor-pointer"
              >
                {t('notifications.disputeCancelBtn') || 'Cancel'}
              </button>
              <button
                type="button"
                disabled={actionInProgress === disputeItem.id}
                onClick={handleSubmitDispute}
                className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base sm:text-lg shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('notifications.disputeSubmitBtn') || 'Submit Dispute & Request Rework'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationHistoryPage;

