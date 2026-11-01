import React, { useState, useEffect, useCallback } from 'react';
import { Search, Inbox, AlertCircle, MapPin, CheckCircle2, XCircle, Sparkles, Languages, Mic } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { IncidentService } from '../../../services';
import { useLanguage } from '../../../context/useLanguage';
import { getLanguageMetadata } from '../../../i18n';

export function ComplaintTracker({ initialTicketId = '', onNewReportClick }) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialTicketId);
  const [searchedIncident, setSearchedIncident] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Citizen Feedback State
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState(null);

  const performSearch = useCallback(async (ticketId) => {
    const term = (ticketId || '').trim();
    if (!term) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchedIncident(null);
    setFeedbackSuccessMsg(null);

    try {
      const result = await IncidentService.getIncidentById(term);
      if (result) {
        setSearchedIncident(result);
      } else {
        setSearchError(`No official complaint found matching Reference #${term}.`);
      }
    } catch (err) {
      setSearchError(err.message || 'Unable to query incident registry.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (initialTicketId) {
      IncidentService.getIncidentById(initialTicketId)
        .then((result) => {
          if (!isMounted) return;
          if (result) {
            setSearchedIncident(result);
          } else {
            setSearchError(`No official complaint found matching Reference #${initialTicketId}.`);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setSearchError(err.message || 'Unable to query incident registry.');
        });
    }
    return () => {
      isMounted = false;
    };
  }, [initialTicketId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performSearch(searchTerm);
  };

  const handleCitizenSignOff = async (confirmed) => {
    if (!searchedIncident) return;
    setIsSubmittingFeedback(true);
    setFeedbackSuccessMsg(null);

    try {
      await IncidentService.submitCitizenFeedback(searchedIncident.id, {
        confirmed,
        feedbackNotes: feedbackNotes.trim(),
      });

      setFeedbackSuccessMsg(
        confirmed
          ? 'Thank you! Your confirmation has officially closed this ticket.'
          : 'Your dispute was recorded. The ticket has been flagged for municipal re-work.'
      );

      // Refresh incident state
      performSearch(searchedIncident.id);
    } catch (err) {
      setSearchError(`Feedback submission failed: ${err.message}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const formattedDate = searchedIncident?.createdAt
    ? new Date(searchedIncident.createdAt).toLocaleDateString()
    : 'Recent Submission';

  const isPendingCitizenSignOff = searchedIncident?.status === 'PENDING_VERIFICATION';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tracker.title')}</CardTitle>
          <CardDescription>
            {t('tracker.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('tracker.placeholder')}
                className="block w-full min-h-[48px] rounded-xl text-base sm:text-lg border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB]"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSearching}
              icon={<Search className="w-5 h-5" />}
            >
              {t('tracker.searchBtn')}
            </Button>
          </form>

          {searchError && (
            <div className="mt-4 p-4 bg-red-50 text-red-900 text-sm sm:text-base rounded-xl border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Searched Incident Details Card */}
      {searchedIncident ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle>{t('tracker.ticketTitle', { id: searchedIncident.ticketNumber || searchedIncident.id })}</CardTitle>
                <Badge variant={searchedIncident.status === 'CLOSED_VERIFIED' ? 'success' : 'primary'} size="sm">
                  {searchedIncident.status}
                </Badge>
                {searchedIncident.isSandbox && (
                  <Badge variant="warning" size="sm">SANDBOX PREVIEW</Badge>
                )}
              </div>
              <CardDescription>
                {t('tracker.reportedOn', { date: formattedDate })}
              </CardDescription>
            </div>
            {searchedIncident.severityLevel && (
              <Badge variant={searchedIncident.severityLevel === 'CRITICAL' ? 'critical' : 'warning'} size="sm">
                {searchedIncident.severityLevel} Priority
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-4 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">{t('tracker.categoryLabel')}</span>
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] capitalize">
                    {t(`categories.${searchedIncident.category}.label`) || searchedIncident.category || 'Municipal Infrastructure'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">{t('tracker.assignedDeptLabel')}</span>
                  <span className="font-semibold text-[#7C97B0] dark:text-[#8FAFCB]">
                    {searchedIncident.assignedDepartment}
                  </span>
                </div>
              </div>

              {/* 1. Original Complaint in Native Language */}
              <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F]">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <span className="text-xs font-bold text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
                    {t('citizen.originalComplaint')}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(searchedIncident.inputMethod === 'audio' || searchedIncident.hasAudio) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-semibold text-[11px]">
                        <Mic className="w-3 h-3" />
                        <span>Voice (Transcribed)</span>
                      </span>
                    )}
                    {searchedIncident.originalLanguage && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-medium text-[11px]">
                        <Languages className="w-3 h-3" />
                        <span>{getLanguageMetadata(searchedIncident.originalLanguage)?.nativeName || searchedIncident.originalLanguage} ({getLanguageMetadata(searchedIncident.originalLanguage)?.label})</span>
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[#2E4A62] dark:text-[#F2F5F8] leading-relaxed text-sm sm:text-base font-normal">
                  {searchedIncident.originalText || searchedIncident.originalDescription || searchedIncident.description}
                </p>
                {(searchedIncident.audioUrl || searchedIncident.originalAudioReference) && (
                  <div className="mt-2.5 pt-2 border-t border-[#E1E7EE] dark:border-[#40515F]">
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#B7C3CE] block mb-1">
                      Attached Voice Note (Original Audio):
                    </span>
                    <audio controls src={searchedIncident.audioUrl || searchedIncident.originalAudioReference} className="w-full h-8 outline-none">
                      <track kind="captions" />
                    </audio>
                  </div>
                )}
              </div>

              {/* 2. English Translation (Permanent Cross-Language Record) */}
              <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F]">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <span className="text-xs font-bold text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider">
                    {t('citizen.englishTranslation')}
                  </span>
                  {searchedIncident.originalLanguage !== 'en' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2E7D6B]/15 dark:bg-[#2E7D6B]/30 text-[#2E7D6B] dark:text-[#4EAD97] font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{searchedIncident.translationStatus === 'FAILED' ? 'Translation Pending' : 'Verified Neural MT'}</span>
                    </span>
                  )}
                </div>

                {searchedIncident.originalLanguage === 'en' ? (
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] italic">
                    Original complaint was submitted in English. No additional translation required.
                  </p>
                ) : searchedIncident.englishTranslation || searchedIncident.translatedDescription ? (
                  <>
                    <p className="text-[#2E4A62] dark:text-[#F2F5F8] leading-relaxed text-sm sm:text-base font-normal">
                      {searchedIncident.englishTranslation || searchedIncident.translatedDescription}
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] italic">
                      * Standard English translation for cross-departmental coordination & SLA audits.
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-[#B7791F] dark:text-[#E09E3E]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>English translation is being processed by background pipeline.</span>
                  </div>
                )}
              </div>

              {searchedIncident.location && (
                <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#B7C3CE] pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#7C97B0] dark:text-[#8FAFCB]" />
                  <span>
                    {searchedIncident.location.address ||
                      `${searchedIncident.location.lat}, ${searchedIncident.location.lng}`}
                  </span>
                </div>
              )}
            </div>

            {/* CITIZEN RESOLUTION VERIFICATION GATEWAY */}
            {isPendingCitizenSignOff && (
              <div className="bg-[#B7791F]/10 dark:bg-[#B7791F]/20 rounded-xl p-5 border border-[#B7791F]/30 dark:border-[#E09E3E]/40 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#B7791F] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#B7791F] dark:text-[#E09E3E]">
                        Citizen Verification Required
                      </h4>
                      <Badge variant="warning" size="sm">Action Pending</Badge>
                    </div>
                    <p className="text-xs text-[#B7791F]/90 dark:text-[#E09E3E]/90 mt-1 leading-relaxed">
                      The authority crew has completed repair work and uploaded evidence. AI has evaluated the repair, but <strong>a complaint cannot be closed without your official confirmation</strong>.
                    </p>
                  </div>
                </div>

                {/* Evidence Comparison Preview */}
                {searchedIncident.resolutionProofUrl && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-white dark:bg-[#202C38] p-2.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F] text-center">
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#B7C3CE] block mb-1">
                        Reported Damage
                      </span>
                      {searchedIncident.originalImageUrl || searchedIncident.redactedImageUrl ? (
                        <img
                          src={searchedIncident.redactedImageUrl || searchedIncident.originalImageUrl}
                          alt="Reported damage"
                          className="h-32 w-full object-cover rounded"
                        />
                      ) : (
                        <div className="h-32 flex items-center justify-center bg-[#F7F9FB] dark:bg-[#2D3C49] rounded text-xs text-[#64748B]">
                          Initial Report
                        </div>
                      )}
                    </div>

                    <div className="bg-white dark:bg-[#202C38] p-2.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F] text-center">
                      <span className="text-[11px] font-semibold text-[#2E7D6B] dark:text-[#4EAD97] block mb-1 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D6B] dark:text-[#4EAD97]" /> Field Resolution Proof
                      </span>
                      <img
                        src={searchedIncident.resolutionProofUrl}
                        alt="Completed repair"
                        className="h-32 w-full object-cover rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Optional Feedback Input */}
                <div>
                  <label htmlFor="citizen-feedback-notes" className="block text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-1">
                    Inspection Remarks (Optional):
                  </label>
                  <input
                    id="citizen-feedback-notes"
                    type="text"
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder="e.g. Surface is completely level; debris was removed."
                    className="w-full text-xs p-2.5 bg-white dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB]"
                  />
                </div>

                {/* Citizen Sign-Off Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-[#B7791F]/30">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={isSubmittingFeedback}
                    icon={<XCircle className="w-4 h-4 text-[#C74949]" />}
                    onClick={() => handleCitizenSignOff(false)}
                  >
                    Dispute & Request Rework
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={isSubmittingFeedback}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleCitizenSignOff(true)}
                  >
                    Confirm & Close Ticket
                  </Button>
                </div>
              </div>
            )}

            {feedbackSuccessMsg && (
              <div className="p-3 bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 text-[#2E7D6B] dark:text-[#4EAD97] border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2E7D6B] dark:text-[#4EAD97] shrink-0" />
                <span>{feedbackSuccessMsg}</span>
              </div>
            )}

            {/* Lifecycle Timeline */}
            <div>
              <h5 className="text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-3 uppercase tracking-wider">
                Resolution Lifecycle
              </h5>
              <div className="relative pl-6 space-y-6 border-l-2 border-[#E1E7EE] dark:border-[#40515F] ml-3 text-xs">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#7C97B0] dark:bg-[#8FAFCB] border-2 border-white dark:border-[#2D3C49]" />
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">Report Registered</span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
                    Logged in municipal database.
                  </span>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#2D3C49] ${
                    searchedIncident.status !== 'SUBMITTED' ? 'bg-[#7C97B0] dark:bg-[#8FAFCB]' : 'bg-[#E1E7EE] dark:bg-[#40515F]'
                  }`} />
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">Field Dispatch</span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
                    Assigned to {searchedIncident.assignedDepartment}.
                  </span>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#2D3C49] ${
                    searchedIncident.resolutionProofUrl || searchedIncident.status === 'PENDING_VERIFICATION' || searchedIncident.status === 'CLOSED_VERIFIED'
                      ? 'bg-[#7C97B0] dark:bg-[#8FAFCB]'
                      : 'bg-[#E1E7EE] dark:bg-[#40515F]'
                  }`} />
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">AI Resolution Verification</span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
                    {searchedIncident.resolutionProofUrl
                      ? 'Post-repair computer vision model verification completed.'
                      : 'Awaiting field crew resolution proof upload.'}
                  </span>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#2D3C49] ${
                    searchedIncident.status === 'CLOSED_VERIFIED' ? 'bg-[#2E7D6B] dark:bg-[#4EAD97]' : 'bg-[#E1E7EE] dark:bg-[#40515F]'
                  }`} />
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">Citizen Verification & Sign-Off</span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
                    {searchedIncident.status === 'CLOSED_VERIFIED'
                      ? 'Citizen reporter confirmed resolution. Complaint officially closed.'
                      : 'Dual-key confirmation required before official ticket closure.'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No Active Ticket Selected"
          description="Enter a valid ticket reference number above to view real-time municipal status. Reports submitted in this session can be tracked directly."
          actionLabel="File a New Complaint"
          onAction={onNewReportClick}
        />
      )}
    </div>
  );
}

export default ComplaintTracker;
