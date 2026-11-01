import React from 'react';
import { X, MapPin, Languages, Mic, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { getLanguageMetadata } from '../../../i18n';

export function AdminIncidentDetailModal({ incident, onClose }) {
  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl bg-white dark:bg-[#2D3C49] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-0">
        <CardHeader className="bg-[#2E4A62] text-white p-4 sm:p-5 flex flex-row items-center justify-between border-b border-[#1E3242]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#D6E3EF]">
                AUDIT VIEW: #{incident.ticketNumber || incident.id}
              </span>
              <Badge variant="primary" size="sm">{incident.status}</Badge>
              {incident.isSandbox && <Badge variant="warning" size="sm">SANDBOX PREVIEW</Badge>}
            </div>
            <CardTitle className="text-white text-base sm:text-lg mt-1">
              {incident.category.toUpperCase()} Inspection Record
            </CardTitle>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
              <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">Department Assigned</span>
              <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] text-sm">{incident.assignedDepartment}</span>
            </div>
            <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
              <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">Severity & Score</span>
              <span className="font-semibold text-[#C74949] dark:text-[#E56B6B] text-sm">{incident.severityLevel} ({incident.severityScore}/10)</span>
            </div>
            <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
              <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium block">SLA Target</span>
              <span className="font-semibold font-mono text-sm text-[#2E4A62] dark:text-[#F2F5F8]">{incident.targetSlaHours} Hours</span>
            </div>
          </div>

          {/* Description & Multilingual Record */}
          <div className="bg-white dark:bg-[#2D3C49] p-3.5 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E1E7EE] dark:border-[#40515F] flex-wrap gap-2">
              <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] text-sm">
                Complaint Statement Audit
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
                      {(incident.inputMethod === 'audio' || incident.hasAudio) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-semibold text-[11px]">
                          <Mic className="w-3 h-3" />
                          <span>Voice (Transcribed)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E1E7EE] dark:bg-[#263746] text-[#2E4A62] dark:text-[#B7C3CE] font-medium text-[11px]">
                          <span>Text</span>
                        </span>
                      )}
                      {incident.originalLanguage && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-medium text-[11px]">
                          <Languages className="w-3 h-3" />
                          <span>{getLanguageMetadata(incident.originalLanguage)?.nativeName || incident.originalLanguage} ({getLanguageMetadata(incident.originalLanguage)?.label})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[#2E4A62] dark:text-[#F2F5F8] text-sm leading-relaxed whitespace-pre-wrap">
                    {incident.originalText || incident.originalDescription || incident.description || 'No complaint text recorded.'}
                  </p>
                </div>

                {(incident.audioUrl || incident.originalAudioReference) && (
                  <div className="mt-2 pt-2 border-t border-[#E1E7EE] dark:border-[#40515F]">
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#B7C3CE] block mb-1">
                      Attached Original Voice Audio:
                    </span>
                    <audio controls src={incident.audioUrl || incident.originalAudioReference} className="w-full h-8 outline-none">
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
                    {incident.originalLanguage === 'en' ? (
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

                  {incident.originalLanguage === 'en' ? (
                    <p className="text-[#64748B] dark:text-[#B7C3CE] text-sm italic">
                      Complaint was originally submitted in English. No machine translation required.
                    </p>
                  ) : (incident.englishTranslation || incident.translatedDescription) ? (
                    <p className="text-[#2E4A62] dark:text-[#F2F5F8] text-sm leading-relaxed whitespace-pre-wrap">
                      {incident.englishTranslation || incident.translatedDescription}
                    </p>
                  ) : incident.translationStatus === 'FAILED' ? (
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
                  {incident.originalLanguage !== 'en' && (
                    <span className="block font-mono mb-0.5">
                      Model: {incident.translationMetadata?.model || 'civic-translation-v2.1'}
                    </span>
                  )}
                  <span>* Machine translation for administrative audit. Original text retains canonical authority.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#B7C3CE] pt-1.5 border-t border-[#E1E7EE] dark:border-[#40515F] text-xs">
              <MapPin className="w-3.5 h-3.5 text-[#7C97B0] dark:text-[#8FAFCB]" />
              <span>{incident.location?.address}</span>
            </div>
          </div>

          {/* Grouped citizen reports (master incident) */}
          {incident.masterIncidentId && (
            <div className="p-3.5 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
                  Master Incident {incident.masterIncidentId}
                </span>
                <span className="flex items-center gap-1.5">
                  <Badge variant={incident.linkedReportCount > 1 ? 'warning' : 'neutral'} size="sm">
                    {incident.linkedReportCount} citizen {incident.linkedReportCount === 1 ? 'report' : 'reports'}
                  </Badge>
                  {incident.workOrderId && <Badge variant="primary" size="sm">{incident.workOrderId}</Badge>}
                </span>
              </div>
              {incident.linkedReports.length > 0 ? (
                <ul className="divide-y divide-[#E1E7EE] dark:divide-[#40515F]">
                  {incident.linkedReports.map((r) => (
                    <li key={r.ticketNumber} className="py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-[#2E4A62] dark:text-[#8FAFCB] text-xs">
                          #{r.ticketNumber} {r.isPrimary ? '· Primary' : ''}
                        </span>
                        <p className="text-[#64748B] dark:text-[#B7C3CE] text-xs line-clamp-2">
                          {r.englishTranslation || r.originalText}
                        </p>
                      </div>
                      <div className="text-right shrink-0 text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
                        <span className="block">{r.inputMethod === 'audio' ? 'Voice' : 'Text'} · {r.originalLanguage}</span>
                        {r.duplicateScore != null && <span className="block font-mono">match {Math.round(r.duplicateScore * 100)}%</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#64748B] dark:text-[#B7C3CE]">Loading linked reports…</p>
              )}
              {incident.aiAnalysis?.severity && (
                <div className="pt-2 border-t border-[#E1E7EE] dark:border-[#40515F] text-xs text-[#64748B] dark:text-[#B7C3CE] space-y-1">
                  <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">
                    AI Triage ({incident.aiAnalysis.status}{incident.aiAnalysis.severity.method === 'RULE_BASED_FALLBACK' ? ' · provisional rule-based' : ''})
                  </span>
                  <p>{incident.aiAnalysis.severity.explanation}</p>
                  {Array.isArray(incident.aiAnalysis.severity.factors) && incident.aiAnalysis.severity.factors.length > 0 && (
                    <p>Factors: {incident.aiAnalysis.severity.factors.join(' · ')}</p>
                  )}
                  {(incident.aiAnalysis.image_verification?.images || []).map((img) => (
                    <p key={img.index}>
                      Photo {img.index + 1}:{' '}
                      <span className="font-semibold">
                        {img.status || (img.is_civic_issue && img.is_relevant ? 'CIVIC_ISSUE' : 'NOT_CIVIC')}
                      </span>{' '}
                      · {img.detected_issue} ({img.visual_severity}, {Math.round((img.confidence || 0) * 100)}%) — {img.description}
                    </p>
                  ))}
                  {incident.reviewReasons.length > 0 && (
                    <p className="text-[#B7791F] dark:text-[#E09E3E] font-semibold">Review flags: {incident.reviewReasons.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Before & After Comparison */}
          {(incident.originalImageUrl || incident.resolutionProofUrl) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] text-center bg-[#F7F9FB] dark:bg-[#202C38]">
                <span className="font-semibold text-[#64748B] dark:text-[#B7C3CE] block mb-1">Original Evidence</span>
                {incident.originalImageUrl || incident.redactedImageUrl ? (
                  <img
                    src={incident.redactedImageUrl || incident.originalImageUrl}
                    alt="Original"
                    className="h-36 w-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-36 flex items-center justify-center text-slate-400 dark:text-[#B7C3CE]">None attached</div>
                )}
              </div>

              <div className="p-2.5 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] text-center bg-[#F7F9FB] dark:bg-[#202C38]">
                <span className="font-semibold text-[#2E7D6B] dark:text-[#4EAD97] block mb-1">Resolution Evidence</span>
                {incident.resolutionProofUrl ? (
                  <img
                    src={incident.resolutionProofUrl}
                    alt="Resolved"
                    className="h-36 w-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-36 flex items-center justify-center text-slate-400 dark:text-[#B7C3CE]">Resolution proof pending</div>
                )}
              </div>
            </div>
          )}

          {/* Citizen Verification Confirmation Status */}
          <div className="p-3.5 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] space-y-1">
            <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">Citizen Sign-Off Verification:</span>
            {incident.citizenConfirmed ? (
              <span className="text-[#2E7D6B] dark:text-[#4EAD97] font-semibold flex items-center gap-1">
                ✓ Confirmed and verified by citizen reporter.
              </span>
            ) : (
              <span className="text-[#B7791F] dark:text-[#E09E3E]">
                Pending citizen review or in field progress.
              </span>
            )}
            {incident.citizenFeedbackNotes && (
              <p className="text-[#64748B] dark:text-[#B7C3CE] italic mt-0.5">
                Remarks: &quot;{incident.citizenFeedbackNotes}&quot;
              </p>
            )}
          </div>
        </CardContent>

        <div className="p-4 bg-[#F7F9FB] dark:bg-[#202C38] border-t border-[#E1E7EE] dark:border-[#40515F] flex justify-end">
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default AdminIncidentDetailModal;
