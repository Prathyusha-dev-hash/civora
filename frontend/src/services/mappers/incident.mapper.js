/**
 * Incident Data Mapper
 * 
 * Translates between Backend DTO schemas and Frontend Presentation models.
 * Isolates React components from backend property name changes.
 */

export function toUIIncident(dto) {
  if (!dto) return null;

  const originalText = dto.original_text || dto.original_description || dto.originalText || dto.description || '';
  const englishTranslation = dto.english_translation || dto.englishTranslation || dto.translated_description || dto.translatedDescription || null;
  const originalAudioRef = dto.original_audio_reference || dto.originalAudioReference || dto.audio_url || dto.audioUrl || null;

  return {
    id: dto.id || dto.complaint_id || dto.complaintId || dto.ticket_number || dto.ticketNumber || 'UNKNOWN',
    complaintId: dto.complaint_id || dto.complaintId || dto.id || dto.ticket_number || dto.ticketNumber || 'UNKNOWN',
    ticketNumber: dto.ticket_number || dto.ticketNumber || dto.complaint_id || dto.id || 'UNKNOWN',
    category: dto.category || 'other',
    description: originalText,
    inputMethod: dto.input_method || dto.inputMethod || 'text',
    originalLanguage: dto.original_language || dto.originalLanguage || 'en',
    originalText: originalText,
    originalDescription: originalText,
    originalAudioReference: originalAudioRef,
    hasAudio: Boolean(dto.has_audio ?? dto.hasAudio ?? Boolean(originalAudioRef)),
    audioUrl: originalAudioRef,
    englishTranslation: englishTranslation,
    translatedDescription: englishTranslation,
    transcriptionStatus: dto.transcription_status || dto.transcriptionStatus || 'none',
    translationStatus: dto.translation_status || dto.translationStatus || (englishTranslation ? 'TRANSLATED' : (dto.original_language === 'en' ? 'NOT_APPLICABLE' : 'PENDING')),
    translationMetadata: dto.translation_metadata || dto.translationMetadata || null,
    status: dto.status || 'SUBMITTED',
    severityLevel: dto.severity_level || dto.severityLevel || 'MODERATE',
    severityScore: Number(dto.severity_score || dto.severityScore || 5),
    assignedDepartment: dto.assigned_department || dto.assignedDepartment || 'Municipal Operations',
    slaDeadline: dto.sla_deadline || dto.slaDeadline || null,
    targetSlaHours: Number(dto.target_sla_hours || dto.targetSlaHours || 24),
    location: {
      lat: Number(dto.location?.lat ?? dto.lat ?? 28.6139),
      lng: Number(dto.location?.lng ?? dto.lng ?? 77.2090),
      address: dto.location?.address || dto.address || 'Location Coordinates',
      ward: dto.location?.ward || dto.ward || 'Ward 14',
    },
    hasImage: Boolean(dto.has_image ?? dto.hasImage ?? false),
    isRedacted: Boolean(dto.is_redacted ?? dto.isRedacted ?? false),
    originalImageUrl: dto.original_image_url || dto.originalImageUrl || null,
    redactedImageUrl: dto.redacted_image_url || dto.redactedImageUrl || null,
    resolutionProofUrl: dto.resolution_proof_url || dto.resolutionProofUrl || null,
    resolutionNotes: dto.resolution_notes || dto.resolutionNotes || '',
    supportCount: Number(dto.support_count || dto.supportCount || 1),
    citizenConfirmed: Boolean(dto.citizen_confirmed ?? dto.citizenConfirmed ?? false),
    citizenFeedbackNotes: dto.citizen_feedback_notes || dto.citizenFeedbackNotes || null,
    images: Array.isArray(dto.images) ? dto.images : [],
    redactedImages: Array.isArray(dto.redacted_images) ? dto.redacted_images : [],
    workOrderId: dto.work_order_id || dto.workOrderId || null,
    masterIncidentId: dto.master_incident_id || dto.masterIncidentId || null,
    isPrimaryReport: dto.is_primary_report ?? dto.isPrimaryReport ?? true,
    duplicateCount: Number(dto.duplicate_count ?? dto.duplicateCount ?? 0),
    linkedReportCount: Number(dto.linked_report_count ?? dto.linkedReportCount ?? 1),
    linkedReports: Array.isArray(dto.linked_reports)
      ? dto.linked_reports.map((r) => ({
          ticketNumber: r.ticket_number,
          isPrimary: Boolean(r.is_primary),
          status: r.status,
          originalLanguage: r.original_language,
          originalText: r.original_text,
          englishTranslation: r.english_translation,
          inputMethod: r.input_method,
          duplicateScore: r.duplicate_score,
          supportCount: r.support_count,
          createdAt: r.created_at,
        }))
      : [],
    aiStatus: dto.ai_status || dto.aiStatus || null,
    needsReview: Boolean(dto.needs_review ?? dto.needsReview ?? false),
    reviewReasons: Array.isArray(dto.review_reasons) ? dto.review_reasons : [],
    aiAnalysis: dto.ai_analysis || null,
    statusHistory: Array.isArray(dto.status_history) ? dto.status_history : [],
    isOverdue: Boolean(dto.is_overdue ?? false),
    createdAt: dto.created_at || dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updated_at || dto.updatedAt || dto.created_at || new Date().toISOString(),
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

export function toCreateIncidentDTO(uiModel) {
  const origText = uiModel.originalText || uiModel.originalDescription || uiModel.description || '';
  const engTrans = uiModel.englishTranslation || uiModel.translatedDescription || undefined;
  // Browser blob: URLs are temporary and never sent as file references; the files themselves are uploaded
  const rawAudioRef = uiModel.originalAudioReference || uiModel.audioUrl || undefined;
  const audioRef = rawAudioRef && !String(rawAudioRef).startsWith('blob:') ? rawAudioRef : undefined;
  const redactedId = uiModel.redactedEvidenceId || uiModel.redactedData?.redactedEvidenceId;

  return {
    complaint_id: uiModel.complaintId || uiModel.id,
    category: uiModel.category,
    description: origText,
    original_text: origText,
    original_language: uiModel.originalLanguage || 'en',
    input_method: uiModel.inputMethod || 'text',
    original_audio_reference: audioRef || null,
    has_audio: Boolean(uiModel.hasAudio || uiModel.audioBlob || audioRef),
    audio_url: audioRef,
    english_translation: engTrans || null,
    translated_description: engTrans || null,
    transcription_status: uiModel.transcriptionStatus || (uiModel.inputMethod === 'audio' ? 'transcribed' : 'none'),
    translation_status: uiModel.translationStatus || (uiModel.originalLanguage === 'en' ? 'NOT_APPLICABLE' : (engTrans ? 'TRANSLATED' : 'PENDING')),
    translation_metadata: uiModel.translationMetadata || null,
    location: {
      lat: uiModel.location?.lat || uiModel.coordinates?.lat,
      lng: uiModel.location?.lng || uiModel.coordinates?.lng,
      address: uiModel.address || uiModel.location?.address || undefined,
    },
    has_image: Boolean(uiModel.hasImage || uiModel.imageFile),
    is_redacted: Boolean(uiModel.isRedacted || uiModel.redactedData?.redacted),
    redacted_evidence_ids: redactedId ? [redactedId] : [],
    created_at: uiModel.createdAt || new Date().toISOString(),
  };
}

/**
 * Builds the multipart body for POST /incidents: JSON fields plus the actual
 * image and audio files (never temporary browser URLs).
 */
export function toCreateIncidentFormData(uiModel) {
  const dto = toCreateIncidentDTO(uiModel);
  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
  const images = uiModel.imageFiles || (uiModel.imageFile ? [uiModel.imageFile] : []);
  images.filter(Boolean).forEach((file) => form.append('images', file, file.name || 'photo.jpg'));
  if (uiModel.audioBlob) {
    const ext = (uiModel.audioBlob.type || '').includes('mp4') ? 'm4a' : (uiModel.audioBlob.type || '').includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', uiModel.audioBlob, `voice-complaint.${ext}`);
  }
  return form;
}

