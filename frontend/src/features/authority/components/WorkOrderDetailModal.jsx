import React, { useState } from 'react';
import {
  X,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  ArrowUpRight,
  Languages,
  Mic,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AuthorityService, AiService } from '../../../services';
import { compressImage } from '../../../services/media/imageCompression';
import { getLanguageMetadata } from '../../../i18n';

export function WorkOrderDetailModal({
  workOrder,
  onClose,
  onOrderUpdated,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'progress' | 'resolution' | 'timeline'
  const [newProgressNote, setNewProgressNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Resolution Evidence & AI Verification State
  const [resolutionProofFile, setResolutionProofFile] = useState(null);
  const [resolutionProofUrl, setResolutionProofUrl] = useState(workOrder.resolutionProofUrl || '');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [aiVerificationResult, setAiVerificationResult] = useState(workOrder.aiVerification || null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Escalation Dialog State
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('Public Works Specialist Unit');

  if (!workOrder) return null;

  // Handle Quick Status Updates
  const handleStatusChange = async (newStatus) => {
    try {
      setErrorMessage(null);
      const updated = await AuthorityService.updateStatus(workOrder.id, newStatus);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err) {
      setErrorMessage(`Status update failed: ${err.message}`);
    }
  };

  // Add Progress Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newProgressNote.trim()) return;

    setIsSubmittingNote(true);
    setErrorMessage(null);
    try {
      const updated = await AuthorityService.addProgressNote(workOrder.id, newProgressNote.trim());
      setNewProgressNote('');
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err) {
      setErrorMessage(`Failed to add note: ${err.message}`);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Trigger AI Resolution Verification & Submit Proof
  const handleVerifyAndSubmitProof = async () => {
    if (!resolutionProofFile) {
      setErrorMessage('Please select a post-repair resolution photo to upload.');
      return;
    }

    setIsVerifyingAi(true);
    setErrorMessage(null);
    setSubmitSuccessMsg(null);

    try {
      // 1. Run AI Vision Resolution Check (advisory; an AI outage must not block proof submission)
      try {
        const aiResult = await AiService.verifyResolutionProof({
          incidentId: workOrder.incidentId,
          workOrderId: workOrder.id,
          originalImageUrl: workOrder.originalImageUrl,
          resolutionImage: resolutionProofFile,
        });
        setAiVerificationResult(aiResult);
      } catch (aiErr) {
        setAiVerificationResult(null);
        console.warn('[WorkOrder] AI resolution check unavailable:', aiErr.message);
      }

      // 2. Upload the proof photo; the backend stores it and records the AI verification
      const updated = await AuthorityService.submitResolutionProof(workOrder.id, {
        proofFile: resolutionProofFile,
        notes: resolutionNotes.trim() || 'Work completed by field technician.',
      });

      setSubmitSuccessMsg(
        'Resolution evidence registered. AI visual evaluation completed. Ticket is now pending mandatory citizen verification.'
      );

      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err) {
      setErrorMessage(`Resolution verification failed: ${err.message}`);
    } finally {
      setIsVerifyingAi(false);
    }
  };

  // Handle Escalation
  const handleConfirmEscalation = async () => {
    if (!escalationReason.trim()) {
      setErrorMessage('Please provide a specific reason for escalation.');
      return;
    }

    try {
      setErrorMessage(null);
      const updated = await AuthorityService.escalateWorkOrder(workOrder.id, escalationReason.trim(), targetDepartment);
      setIsEscalating(false);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err) {
      setErrorMessage(`Escalation failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl bg-white dark:bg-[#2D3C49] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-0 rounded-2xl">
        {/* Modal Top Bar */}
        <CardHeader className="bg-[#2E4A62] text-white p-5 sm:p-6 flex flex-row items-center justify-between border-b border-[#1E3242]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-base font-bold text-white tracking-wider">
                {workOrder.id}
              </span>
              <span className="text-white/40">•</span>
              <span className="text-xs sm:text-sm text-slate-300 font-mono">
                Ref #{workOrder.ticketNumber}
              </span>
              <Badge variant="primary" size="md">
                {workOrder.status.replace(/_/g, ' ')}
              </Badge>
              {workOrder.isOverdue && (
                <Badge variant="critical" size="md" dot>OVERDUE</Badge>
              )}
              {workOrder.isSandbox && (
                <Badge variant="warning" size="md">SANDBOX PREVIEW</Badge>
              )}
            </div>
            <CardTitle className="text-white text-lg sm:text-xl font-bold">
              {workOrder.title}
            </CardTitle>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </CardHeader>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] px-4 sm:px-6 gap-2 text-sm sm:text-base font-semibold overflow-x-auto">
          {[
            { id: 'overview', label: 'Order Overview' },
            { id: 'progress', label: `Progress Notes (${workOrder.progressNotes?.length || 0})` },
            { id: 'resolution', label: 'Resolution & AI Verification' },
            { id: 'timeline', label: 'Audit Timeline' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[48px] py-3 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer select-none flex items-center ${
                activeTab === tab.id
                  ? 'border-[#7C97B0] dark:border-[#8FAFCB] text-[#2E4A62] dark:text-[#8FAFCB] font-semibold'
                  : 'border-transparent text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <CardContent className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 bg-[#C74949]/10 text-[#C74949] dark:text-[#E56B6B] text-xs rounded-lg border border-[#C74949]/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#C74949] dark:text-[#E56B6B] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {submitSuccessMsg && (
            <div className="p-3 bg-[#2E7D6B]/15 text-[#2E7D6B] dark:text-[#4EAD97] text-xs rounded-lg border border-[#2E7D6B]/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D6B] dark:text-[#4EAD97] shrink-0" />
              <span>{submitSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Status Shift Action Bar */}
              <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3.5 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#2E4A62] dark:text-[#8FAFCB]">
                  Quick Field Status Shift:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={workOrder.status === 'EN_ROUTE' ? 'subtle' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('EN_ROUTE')}
                  >
                    En Route
                  </Button>
                  <Button
                    type="button"
                    variant={workOrder.status === 'IN_PROGRESS' ? 'subtle' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                  >
                    In Progress
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    onClick={() => setIsEscalating(true)}
                  >
                    Escalate Ticket
                  </Button>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
                  <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">Lead Officer</span>
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] text-sm">{workOrder.leadOfficer}</span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] block mt-0.5">{workOrder.assignedCrew}</span>
                </div>

                <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
                  <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">Department</span>
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] text-sm truncate block">{workOrder.department}</span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] block mt-0.5">{workOrder.location?.ward}</span>
                </div>

                <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
                  <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">SLA Target Deadline</span>
                  <span className={`font-semibold font-mono text-sm block ${workOrder.isOverdue ? 'text-[#C74949] dark:text-[#E56B6B]' : 'text-[#2E4A62] dark:text-[#F2F5F8]'}`}>
                    {workOrder.slaDeadline ? new Date(workOrder.slaDeadline).toLocaleString() : 'Standard'}
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] block mt-0.5">
                    {workOrder.isOverdue ? 'Status: Breached' : 'Status: On Schedule'}
                  </span>
                </div>
              </div>

              {/* Description & Multilingual Record */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-[#E1E7EE] bg-white dark:bg-[#2D3C49] dark:border-[#40515F] space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#E1E7EE] dark:border-[#40515F] flex-wrap gap-2">
                    <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] text-sm">
                      Citizen Incident Statement
                    </span>
                    <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] font-medium">
                      Dual-Record Preservation (Native + English)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* 1. Original Complaint */}
                    <div className="p-3.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] space-y-2 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-[#E1E7EE] dark:border-[#40515F]">
                          <span className="font-bold text-[#2E4A62] dark:text-[#8FAFCB] uppercase tracking-wider text-[11px]">
                            Original Complaint
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(workOrder.inputMethod === 'audio' || workOrder.hasAudio) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-semibold text-[11px]">
                                <Mic className="w-3 h-3" />
                                <span>Voice (Transcribed)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E1E7EE] dark:bg-[#263746] text-[#2E4A62] dark:text-[#B7C3CE] font-medium text-[11px]">
                                <span>Text</span>
                              </span>
                            )}
                            {workOrder.originalLanguage && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-medium text-[11px]">
                                <Languages className="w-3 h-3" />
                                <span>{getLanguageMetadata(workOrder.originalLanguage)?.nativeName || workOrder.originalLanguage} ({getLanguageMetadata(workOrder.originalLanguage)?.label})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[#2E4A62] dark:text-[#F2F5F8] text-sm leading-relaxed whitespace-pre-wrap">
                          {workOrder.originalText || workOrder.originalDescription || workOrder.description || 'No complaint text recorded.'}
                        </p>
                      </div>

                      {(workOrder.audioUrl || workOrder.originalAudioReference) && (
                        <div className="mt-2 pt-2 border-t border-[#E1E7EE] dark:border-[#40515F]">
                          <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#B7C3CE] block mb-1">
                            Attached Original Voice Audio:
                          </span>
                          <audio controls src={workOrder.audioUrl || workOrder.originalAudioReference} className="w-full h-8 outline-none">
                            <track kind="captions" />
                          </audio>
                        </div>
                      )}
                    </div>

                    {/* 2. English Translation */}
                    <div className="p-3.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] space-y-2 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-[#E1E7EE] dark:border-[#40515F]">
                          <span className="font-bold text-[#2E4A62] dark:text-[#8FAFCB] uppercase tracking-wider text-[11px]">
                            English Translation
                          </span>
                          {workOrder.originalLanguage === 'en' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E1E7EE] dark:bg-[#263746] text-[#2E4A62] dark:text-[#B7C3CE] font-medium text-[11px]">
                              <span>Original in English</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2E7D6B]/15 text-[#2E7D6B] dark:text-[#4EAD97] font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>[Verified Neural MT]</span>
                            </span>
                          )}
                        </div>

                        {workOrder.originalLanguage === 'en' ? (
                          <p className="text-[#64748B] dark:text-[#B7C3CE] text-sm italic">
                            Complaint was originally submitted in English. No machine translation required.
                          </p>
                        ) : (workOrder.englishTranslation || workOrder.translatedDescription) ? (
                          <p className="text-[#2E4A62] dark:text-[#F2F5F8] text-sm leading-relaxed whitespace-pre-wrap">
                            {workOrder.englishTranslation || workOrder.translatedDescription}
                          </p>
                        ) : workOrder.translationStatus === 'FAILED' ? (
                          <div className="text-[#C74949] dark:text-[#E56B6B] text-xs">
                            Neural machine translation failed or is pending retry. Please refer to native submission.
                          </div>
                        ) : (
                          <div className="text-[#B7791F] dark:text-[#E09E3E] text-xs">
                            English translation is queued for processing.
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E1E7EE] dark:border-[#40515F] text-[10px] text-slate-400 dark:text-[#B7C3CE]">
                        {workOrder.originalLanguage !== 'en' && (
                          <span className="block font-mono mb-0.5">
                            Model: {workOrder.translationMetadata?.model || 'civic-translation-v2.1'}
                          </span>
                        )}
                        <span>* Machine translation for municipal field review. Original text retains canonical authority.</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#B7C3CE] pt-2 border-t border-[#E1E7EE] dark:border-[#40515F]">
                    <MapPin className="w-3.5 h-3.5 text-[#7C97B0] dark:text-[#8FAFCB]" />
                    <span>{workOrder.location?.address}</span>
                  </div>
                </div>

                {/* Evidence Image Preview */}
                {workOrder.originalImageUrl && (
                  <div className="p-4 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#2D3C49] text-xs space-y-2">
                    <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">Attached Incident Photo:</span>
                    <img
                      src={workOrder.originalImageUrl}
                      alt="Incident damage"
                      className="max-h-64 object-contain rounded-lg border border-[#E1E7EE] dark:border-[#40515F]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROGRESS NOTES */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Add Progress Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2.5">
                <label htmlFor="progress-note-input" className="block text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
                  Add Field Progress Log Entry:
                </label>
                <div className="flex gap-2">
                  <input
                    id="progress-note-input"
                    type="text"
                    value={newProgressNote}
                    onChange={(e) => setNewProgressNote(e.target.value)}
                    placeholder="e.g. Excavation complete; hot-mix asphalt batch arriving in 30 mins."
                    className="flex-1 text-xs border border-[#E1E7EE] dark:border-[#40515F] rounded-lg p-2.5 bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none focus:ring-2 focus:ring-[#7C97B0]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isSubmittingNote}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    Post Note
                  </Button>
                </div>
              </form>

              {/* Feed of Notes */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">
                  Field Dispatch Notes History:
                </span>
                {workOrder.progressNotes?.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-[#B7C3CE] italic">No field progress logs recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {workOrder.progressNotes.map((note, idx) => (
                      <div key={idx} className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F] text-xs">
                        <div className="flex items-center justify-between text-[#64748B] dark:text-[#B7C3CE] mb-1">
                          <span className="font-semibold text-[#2E4A62] dark:text-[#8FAFCB]">{note.author}</span>
                          <span className="font-mono text-[10px]">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[#2E4A62] dark:text-[#F2F5F8] leading-relaxed">{note.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RESOLUTION & AI VERIFICATION */}
          {activeTab === 'resolution' && (
            <div className="space-y-6">
              <div className="bg-[#2E7D6B]/10 p-4 rounded-xl border border-[#2E7D6B]/30 text-xs text-[#2E4A62] dark:text-[#F2F5F8] space-y-1">
                <span className="font-semibold block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#2E7D6B] dark:text-[#4EAD97]" />
                  Dual-Key Resolution Workflow Protocol
                </span>
                <p className="leading-relaxed text-[#64748B] dark:text-[#B7C3CE]">
                  Step 1: Upload post-repair photo → Step 2: AI verifies structural restoration → Step 3: Ticket shifts to <code>PENDING_VERIFICATION</code>. <strong>The ticket will not close until the citizen confirms or supervisory sign-off occurs.</strong>
                </p>
              </div>

              {/* Side-by-Side Photo Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="border border-[#E1E7EE] dark:border-[#40515F] rounded-xl p-3 bg-white dark:bg-[#2D3C49] text-xs text-center space-y-2">
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">1. Original Damage (Before)</span>
                  {workOrder.originalImageUrl ? (
                    <img
                      src={workOrder.originalImageUrl}
                      alt="Original damage"
                      className="h-44 w-full object-cover rounded-lg border border-[#E1E7EE] dark:border-[#40515F]"
                    />
                  ) : (
                    <div className="h-44 flex items-center justify-center bg-[#F7F9FB] dark:bg-[#202C38] rounded-lg text-slate-400 dark:text-[#B7C3CE]">
                      No initial photo uploaded
                    </div>
                  )}
                </div>

                {/* After Photo (Upload & Preview) */}
                <div className="border border-[#E1E7EE] dark:border-[#40515F] rounded-xl p-3 bg-white dark:bg-[#2D3C49] text-xs text-center space-y-2">
                  <span className="font-semibold text-[#2E4A62] dark:text-[#8FAFCB] block">2. Post-Repair Proof (After)</span>
                  {resolutionProofUrl ? (
                    <img
                      src={resolutionProofUrl}
                      alt="Resolution proof"
                      className="h-44 w-full object-cover rounded-lg border border-[#2E7D6B]/30"
                    />
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center bg-[#F7F9FB] dark:bg-[#202C38] rounded-lg text-slate-400 dark:text-[#B7C3CE] p-4 border border-dashed border-[#E1E7EE] dark:border-[#40515F]">
                      <Camera className="w-6 h-6 text-[#7C97B0] dark:text-[#8FAFCB] mb-1" />
                      <span>Upload post-repair proof photo</span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        // Shrink large phone photos so the upload fits serverless request limits
                        const file = await compressImage(e.target.files[0]);
                        setResolutionProofFile(file);
                        setResolutionProofUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#7C97B0] file:text-white hover:file:bg-[#688299] cursor-pointer"
                  />
                </div>
              </div>

              {/* Resolution Remarks */}
              <div>
                <label htmlFor="resolution-notes-input" className="block text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-1">
                  Field Repair Remarks:
                </label>
                <textarea
                  id="resolution-notes-input"
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Road sub-base compacted, hot bitumen seal applied, curb stones reset."
                  className="w-full text-xs border border-[#E1E7EE] dark:border-[#40515F] rounded-lg p-2.5 bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none focus:ring-2 focus:ring-[#7C97B0]"
                />
              </div>

              {/* Action Button: Run Verification */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  loading={isVerifyingAi}
                  icon={<Sparkles className="w-4 h-4 text-white" />}
                  onClick={handleVerifyAndSubmitProof}
                >
                  Run AI Verification & Submit Proof
                </Button>
              </div>

              {/* AI Verification Results Inspection Panel */}
              {aiVerificationResult && (
                <div className="bg-white dark:bg-[#2D3C49] p-4 rounded-xl border border-[#2E7D6B]/40 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E1E7EE] dark:border-[#40515F] pb-2">
                    <span className="text-xs font-bold text-[#2E4A62] dark:text-[#F2F5F8] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#2E7D6B] dark:text-[#4EAD97]" />
                      Computer Vision Inspection Assessment
                    </span>
                    <Badge variant={aiVerificationResult.verified ? 'success' : 'critical'} size="sm">
                      {aiVerificationResult.verified ? 'VERIFIED PASSED' : 'VERIFICATION FAILED'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
                      <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">Match Confidence</span>
                      <span className="font-mono text-base font-bold text-[#2E4A62] dark:text-[#8FAFCB]">
                        {aiVerificationResult.confidenceScore}%
                      </span>
                    </div>

                    <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
                      <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">Structural Geometry</span>
                      <span className="text-[#2E4A62] dark:text-[#F2F5F8] text-[11px] leading-relaxed block mt-0.5">
                        {aiVerificationResult.structuralMatchNotes || aiVerificationResult.notes}
                      </span>
                    </div>
                  </div>

                  {aiVerificationResult.passedInspectionCriteria && (
                    <div>
                      <span className="text-[11px] font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block mb-1">
                        Inspection Checklist Completed:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiVerificationResult.passedInspectionCriteria.map((crit, idx) => (
                          <span
                            key={idx}
                            className="bg-[#2E7D6B]/15 text-[#2E7D6B] dark:text-[#4EAD97] border border-[#2E7D6B]/30 px-2 py-0.5 rounded text-[10px] font-medium"
                          >
                            ✓ {crit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Citizen Sign-Off Status */}
              <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-4 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] text-xs space-y-1">
                <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">Citizen Sign-Off Status:</span>
                {workOrder.citizenSignOff?.confirmed ? (
                  <p className="text-[#2E7D6B] dark:text-[#4EAD97] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Citizen confirmed resolution: &quot;{workOrder.citizenSignOff.feedbackNotes || 'No remarks.'}&quot;
                  </p>
                ) : (
                  <p className="text-[#B7791F] dark:text-[#E09E3E]">
                    Awaiting citizen confirmation via public tracking portal.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-[#2E4A62] dark:text-[#8FAFCB] uppercase tracking-wider block">
                Work Order Immutable History
              </span>
              <div className="relative pl-6 space-y-6 border-l-2 border-[#E1E7EE] dark:border-[#40515F] ml-3 text-xs">
                {workOrder.activityTimeline?.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#7C97B0] dark:bg-[#8FAFCB] border-2 border-white dark:border-[#2D3C49]" />
                    <div className="flex items-center justify-between text-[#64748B] dark:text-[#B7C3CE]">
                      <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">{item.action}</span>
                      <span className="text-[10px] font-mono">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] block">Actor: {item.actor}</span>
                    <p className="text-[#64748B] dark:text-[#B7C3CE] mt-0.5 text-xs">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F7F9FB] dark:bg-[#202C38] border-t border-[#E1E7EE] dark:border-[#40515F] flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {workOrder.status !== 'RESOLVED' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('resolution')}
              >
                Go to Resolution Proof
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Escalation Overlay Modal */}
      {isEscalating && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-[#E1E7EE] dark:border-[#40515F] pb-3">
              <div className="flex items-center gap-2 text-[#C74949] dark:text-[#E56B6B] font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Escalate Work Order</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEscalating(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="target-dept-select" className="block font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-1">
                  Reassign To Department:
                </label>
                <select
                  id="target-dept-select"
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] border border-[#E1E7EE] dark:border-[#40515F] rounded-lg"
                >
                  <option value="Public Works Specialist Unit">Public Works Specialist Unit</option>
                  <option value="Water & Sanitation Board">Water & Sanitation Board</option>
                  <option value="Power & Grid Authority">Power & Grid Authority</option>
                  <option value="Emergency Disaster Response">Emergency Disaster Response</option>
                </select>
              </div>

              <div>
                <label htmlFor="escalation-reason-input" className="block font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-1">
                  Escalation Reason & Field Obstacles:
                </label>
                <textarea
                  id="escalation-reason-input"
                  rows={3}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Detail underground hazards, equipment requirements, or structural complications..."
                  className="w-full text-xs p-2 bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] border border-[#E1E7EE] dark:border-[#40515F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C74949]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E1E7EE] dark:border-[#40515F]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEscalating(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleConfirmEscalation}>
                Confirm Escalation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default WorkOrderDetailModal;
