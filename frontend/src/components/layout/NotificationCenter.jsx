import { useState, useRef, useEffect, useCallback } from 'react';
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
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/useNotification';
import { useLanguage } from '../../context/useLanguage';

function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function NotificationCenter() {
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

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'ACTION_REQUIRED'
  const [inspectItem, setInspectItem] = useState(null); // notification object for photo comparison modal
  const [disputeItem, setDisputeItem] = useState(null); // notification object for dispute modal
  const [disputeReason, setDisputeReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null); // notification id
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (inspectItem) {
          setInspectItem(null);
        } else if (disputeItem) {
          setDisputeItem(null);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inspectItem, disputeItem]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.read;
    if (activeTab === 'ACTION_REQUIRED') return n.actionRequired;
    return true;
  });

  const handleNotificationClick = (item) => {
    if (!item.read) {
      markAsRead(item.id).catch(() => {});
    }
  };

  const handleConfirm = useCallback(
    async (item) => {
      if (!item.complaintId) return;
      try {
        setActionInProgress(item.id);
        await confirmResolution(item.complaintId, 'Confirmed by citizen via Notification Center');
        setActionSuccessMsg(
          t('notifications.confirmSuccessMsg', { id: item.complaintId }) ||
            `Complaint #${item.complaintId} verified and closed.`
        );
        setTimeout(() => setActionSuccessMsg(null), 4000);
        if (inspectItem?.id === item.id) {
          setInspectItem(null);
        }
      } catch (err) {
        console.error('[NotificationCenter] Confirm error:', err);
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
      console.error('[NotificationCenter] Dispute error:', err);
    } finally {
      setActionInProgress(null);
    }
  }, [disputeItem, disputeReason, disputeResolution, t]);



  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('notifications.bellAria', { count: unreadCount }) || `Notifications (${unreadCount} unread)`}
        title={t('notifications.title') || 'Notifications'}
        className="relative min-h-[46px] min-w-[46px] p-2.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-[#2E4A62] dark:text-[#F2F5F8] border border-[#E1E7EE] dark:border-[#40515F] transition-all duration-150 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C97B0] dark:focus-visible:ring-[#8FAFCB]"
      >
        <Bell className="w-5 h-5 text-[#2E4A62] dark:text-[#F2F5F8]" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 bg-[#C74949] text-white font-bold text-xs rounded-full flex items-center justify-center border-2 border-[#E7EEF5] dark:border-[#263746] shadow-sm animate-pulse"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label={t('notifications.title') || 'Notifications'}
          className="absolute right-0 mt-2 w-[92vw] sm:w-[480px] md:w-[520px] max-w-[540px] bg-white dark:bg-[#2D3C49] rounded-2xl shadow-2xl border border-[#E1E7EE] dark:border-[#40515F] z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E1E7EE] dark:border-[#40515F] bg-[#E7EEF5]/70 dark:bg-[#263746] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] flex items-center justify-center font-bold">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] leading-tight">
                  {t('notifications.title') || 'Notifications'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-[#7C97B0] dark:text-[#8FAFCB]">
                    {unreadCount}{' '}
                    {t('notifications.tabUnread') || 'Unread'}
                  </span>
                  {actionRequiredCount > 0 && (
                    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 bg-[#B7791F]/15 text-[#B7791F] dark:bg-[#B7791F]/25 dark:text-[#E09E3E] rounded-full border border-[#B7791F]/30 dark:border-[#E09E3E]/40">
                      {actionRequiredCount} {t('notifications.priorityActionRequired') || 'Action Required'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="min-h-[40px] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#2E4A62] dark:text-[#8FAFCB] hover:text-[#2E4A62] dark:hover:text-white bg-[#D6E3EF]/80 dark:bg-[#344656] hover:bg-[#D6E3EF] dark:hover:bg-[#40515F] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  title={t('notifications.markAllAsRead') || 'Mark all as read'}
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('notifications.markAllAsRead') || 'Mark all as read'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#64748B] hover:text-[#2E4A62] dark:text-[#B7C3CE] dark:hover:text-white hover:bg-[#D6E3EF]/50 dark:hover:bg-[#40515F] transition-colors cursor-pointer"
                aria-label={t('common.cancel') || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Success Alert Banner */}
          {actionSuccessMsg && (
            <div className="p-3.5 bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 border-b border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 text-[#2E7D6B] dark:text-[#4EAD97] text-sm font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E7D6B] dark:text-[#4EAD97]" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-2 bg-[#F7F9FB] dark:bg-[#202C38] border-b border-[#E1E7EE] dark:border-[#40515F] text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer text-center ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-[#2D3C49] text-[#2E4A62] dark:text-[#8FAFCB] shadow-xs font-bold border border-[#E1E7EE] dark:border-[#40515F]'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
              }`}
            >
              {t('notifications.tabAll') || 'All'} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNREAD')}
              className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer text-center ${
                activeTab === 'UNREAD'
                  ? 'bg-white dark:bg-[#2D3C49] text-[#2E4A62] dark:text-[#8FAFCB] shadow-xs font-bold border border-[#E1E7EE] dark:border-[#40515F]'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
              }`}
            >
              {t('notifications.tabUnread') || 'Unread'} ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACTION_REQUIRED')}
              className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer text-center ${
                activeTab === 'ACTION_REQUIRED'
                  ? 'bg-white dark:bg-[#2D3C49] text-[#2E4A62] dark:text-[#8FAFCB] shadow-xs font-bold border border-[#E1E7EE] dark:border-[#40515F]'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
              }`}
            >
              {t('notifications.tabActionRequired') || 'Action Required'} ({actionRequiredCount})
            </button>
          </div>

          {/* Notification List Body */}
          <div className="overflow-y-auto divide-y divide-[#E1E7EE] dark:divide-[#40515F] max-h-[55vh] p-2">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#D6E3EF] dark:bg-[#344656] flex items-center justify-center text-[#7C97B0] dark:text-[#8FAFCB]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8]">
                  {t('notifications.empty') || 'All caught up!'}
                </h3>
                <p className="text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] mt-1 max-w-sm mx-auto">
                  {t('notifications.emptySubtitle') ||
                    'Updates regarding your complaints, work orders, and assignments will appear here.'}
                </p>
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
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 sm:p-4 rounded-xl transition-all duration-150 mb-1.5 border ${
                      !n.read
                        ? 'bg-[#D6E3EF]/30 dark:bg-[#344656]/30 border-[#7C97B0]/40 dark:border-[#8FAFCB]/30 shadow-xs'
                        : 'bg-white dark:bg-[#2D3C49]/60 border-[#E1E7EE] dark:border-[#40515F] hover:bg-[#F7F9FB] dark:hover:bg-[#2D3C49]'
                    }`}
                  >
                    {/* Top Row: Priority Pill, Ticket Ref, Timestamp, Unread Indicator */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Priority Pill */}
                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C74949]/15 text-[#C74949] dark:bg-[#C74949]/25 dark:text-[#E56B6B] border border-[#C74949]/30">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {t('notifications.priorityUrgent') || 'Urgent'}
                          </span>
                        )}
                        {isActionRequired && !isUrgent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#B7791F]/15 text-[#B7791F] dark:bg-[#B7791F]/25 dark:text-[#E09E3E] border border-[#B7791F]/30">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t('notifications.priorityActionRequired') || 'Action Required'}
                          </span>
                        )}
                        {!isUrgent && !isActionRequired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E1E7EE] text-[#2E4A62] dark:bg-[#40515F] dark:text-[#B7C3CE]">
                            {t('notifications.priorityInfo') || 'Update'}
                          </span>
                        )}

                        {/* Complaint or Work Order ID */}
                        {n.complaintId && (
                          <span className="text-xs font-mono font-bold text-[#2E4A62] dark:text-[#8FAFCB] bg-[#D6E3EF] dark:bg-[#344656] px-2 py-0.5 rounded-md border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30">
                            #{n.complaintId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#B7C3CE]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(n.createdAt)}</span>
                        {!n.read && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-[#7C97B0] dark:bg-[#8FAFCB] inline-block"
                            title="Unread"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8] leading-snug">
                      {titleText}
                    </h3>

                    {/* Message */}
                    <p className="text-sm sm:text-base text-[#2E4A62]/90 dark:text-[#B7C3CE] mt-1 leading-relaxed">
                      {messageText}
                    </p>

                    {/* Resolution Verification Workflow Card */}
                    {isResolutionVerify && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[#B7791F]/10 dark:bg-[#B7791F]/20 border border-[#B7791F]/30 dark:border-[#E09E3E]/40">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#B7791F] dark:text-[#E09E3E]">
                            <Sparkles className="w-4 h-4 text-[#B7791F] dark:text-[#E09E3E]" />
                            <span>
                              {t('notifications.aiVerificationBadge', {
                                confidence: n.aiConfidence || 93,
                              }) || `AI Computer Vision: ${n.aiConfidence || 93}% Verified`}
                            </span>
                          </div>
                          {n.resolutionProofUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectItem(n);
                              }}
                              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#7C97B0] dark:text-[#8FAFCB] hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('notifications.beforeAfterPhotos') || 'Inspect Photos'}</span>
                            </button>
                          )}
                        </div>

                        {/* Interactive Decision Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2.5">
                          <button
                            type="button"
                            disabled={actionInProgress === n.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirm(n);
                            }}
                            className="min-h-[46px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2E7D6B] hover:bg-[#246355] text-white font-bold text-sm sm:text-base rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t('notifications.confirmResolution') || 'Confirm Resolution'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionInProgress === n.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDispute(n);
                            }}
                            className="min-h-[46px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#C74949] hover:bg-[#A83939] text-white font-bold text-sm sm:text-base rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>{t('notifications.reportNotFixed') || 'Report Problem Not Fixed'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Footer Row: Navigation Link & Mark Read */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-[#E1E7EE] dark:border-[#40515F] text-xs sm:text-sm">
                      {n.linkUrl ? (
                        <Link
                          to={n.linkUrl}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 font-bold text-[#7C97B0] dark:text-[#8FAFCB] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]"
                        >
                          <span>{t('common.inspect') || 'View Details'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span />
                      )}

                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="text-xs font-semibold text-[#64748B] hover:text-[#2E4A62] dark:text-[#B7C3CE] dark:hover:text-white cursor-pointer"
                        >
                          {t('notifications.markAsRead') || 'Mark read'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer of Dropdown */}
          <div className="p-3 sm:p-4 border-t border-[#E1E7EE] dark:border-[#40515F] bg-[#E7EEF5]/70 dark:bg-[#263746] flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-[#64748B] dark:text-[#B7C3CE]">
              {t('notifications.sandboxNotice') || 'Live civic event notifications'}
            </span>
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#7C97B0] dark:text-[#8FAFCB] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8] cursor-pointer"
            >
              <span>{t('notifications.viewAll') || 'View All Notifications'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Before / After Photo Comparison Inspection Modal */}
      {inspectItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="comparison-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-[#2D3C49] rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-[#E1E7EE] dark:border-[#40515F] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E1E7EE] dark:border-[#40515F] pb-4 mb-4">
              <div>
                <h2
                  id="comparison-title"
                  className="text-2xl sm:text-3xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8]"
                >
                  {t('notifications.beforeAfterPhotos') || 'Inspect Repair Evidence'}
                </h2>
                <p className="text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] mt-0.5">
                  Complaint #{inspectItem.complaintId} •{' '}
                  {t('notifications.aiVerificationBadge', { confidence: inspectItem.aiConfidence || 93 }) ||
                    `AI Confidence: ${inspectItem.aiConfidence || 93}%`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="w-10 h-10 rounded-full hover:bg-[#D6E3EF]/50 dark:hover:bg-[#40515F] flex items-center justify-center text-[#64748B] dark:text-[#B7C3CE] cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Photo Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 my-4">
              {/* Before Photo */}
              <div className="rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] overflow-hidden bg-[#F7F9FB] dark:bg-[#202C38]">
                <div className="px-3.5 py-2.5 bg-[#E1E7EE]/60 dark:bg-[#263746] font-bold text-sm sm:text-base text-[#2E4A62] dark:text-[#F2F5F8] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C74949] inline-block" />
                  <span>{t('notifications.beforePhoto') || 'Reported Issue (Before)'}</span>
                </div>
                {inspectItem.originalImageUrl ? (
                  <img
                    src={inspectItem.originalImageUrl}
                    alt="Before Repair"
                    className="w-full h-56 sm:h-64 object-cover"
                  />
                ) : (
                  <div className="h-56 sm:h-64 flex items-center justify-center text-[#64748B] dark:text-[#B7C3CE] text-sm">
                    No initial photo available
                  </div>
                )}
              </div>

              {/* After Photo */}
              <div className="rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] overflow-hidden bg-[#F7F9FB] dark:bg-[#202C38]">
                <div className="px-3.5 py-2.5 bg-[#2E7D6B]/15 dark:bg-[#2E7D6B]/30 font-bold text-sm sm:text-base text-[#2E7D6B] dark:text-[#4EAD97] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D6B] dark:bg-[#4EAD97] inline-block" />
                  <span>{t('notifications.afterPhoto') || 'Authority Resolution Proof (After)'}</span>
                </div>
                {inspectItem.resolutionProofUrl ? (
                  <img
                    src={inspectItem.resolutionProofUrl}
                    alt="After Repair"
                    className="w-full h-56 sm:h-64 object-cover"
                  />
                ) : (
                  <div className="h-56 sm:h-64 flex items-center justify-center text-[#64748B] dark:text-[#B7C3CE] text-sm">
                    No resolution proof image
                  </div>
                )}
              </div>
            </div>

            {/* Decision Actions Inside Modal */}
            <div className="p-4 rounded-2xl bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] mt-4">
              <h4 className="text-base sm:text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8] mb-1">
                {t('tracker.citizenSignOffTitle') || 'Citizen Resolution Sign-Off'}
              </h4>
              <p className="text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] mb-4">
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
                  className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C74949] hover:bg-[#A83939] text-white font-bold text-base sm:text-lg rounded-xl transition-colors cursor-pointer disabled:opacity-50"
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
          aria-labelledby="dispute-modal-title"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3
                  id="dispute-modal-title"
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

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              {t('notifications.disputeModalDesc') ||
                'Please explain why the issue is not fixed so the municipal department can perform immediate rework on complaint #' +
                  disputeItem.complaintId +
                  '.'}
            </p>

            <div className="mb-5">
              <label
                htmlFor="disputeNotes"
                className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2"
              >
                {t('tracker.feedbackNotesLabel') || 'Reason / Details'}
              </label>
              <textarea
                id="disputeNotes"
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

export default NotificationCenter;
