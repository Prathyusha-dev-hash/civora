/**
 * Authority Service Data Mapper
 */

export function toUIWorkOrder(dto) {
  if (!dto) return null;

  const originalText = dto.original_text || dto.original_description || dto.originalDescription || dto.description || '';
  const englishTranslation = dto.english_translation || dto.englishTranslation || dto.translated_description || dto.translatedDescription || null;
  const originalAudioRef = dto.original_audio_reference || dto.originalAudioReference || dto.audio_url || dto.audioUrl || null;

  return {
    id: dto.id || dto.work_order_id || 'WO-000',
    incidentId: dto.incident_id || dto.incidentId || dto.id,
    ticketNumber: dto.ticket_number || dto.ticketNumber || dto.incident_id || dto.id,
    title: dto.title || `${dto.category || 'Civic'} Repair Order`,
    category: dto.category || 'other',
    description: originalText,
    inputMethod: dto.input_method || dto.inputMethod || 'text',
    hasAudio: Boolean(dto.has_audio ?? dto.hasAudio ?? Boolean(originalAudioRef)),
    audioUrl: originalAudioRef,
    originalAudioReference: originalAudioRef,
    originalLanguage: dto.original_language || dto.originalLanguage || 'en',
    originalText: originalText,
    originalDescription: originalText,
    englishTranslation: englishTranslation,
    translatedDescription: englishTranslation,
    translationStatus: dto.translation_status || dto.translationStatus || (englishTranslation ? 'TRANSLATED' : (dto.original_language === 'en' ? 'NOT_APPLICABLE' : 'PENDING')),
    translationMetadata: dto.translation_metadata || dto.translationMetadata || null,
    priority: dto.priority || dto.severity_level || 'MODERATE',
    status: dto.status || 'ASSIGNED', // 'ASSIGNED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'RESOLVED' | 'ESCALATED'
    assignedCrew: dto.assigned_crew || dto.assignedCrew || 'Field Crew Alpha',
    leadOfficer: dto.lead_officer || dto.leadOfficer || 'Officer In-Charge',
    department: dto.department || 'Roadways & Infrastructure',
    location: {
      lat: Number(dto.location?.lat ?? dto.lat ?? 28.6139),
      lng: Number(dto.location?.lng ?? dto.lng ?? 77.2090),
      address: dto.location?.address || dto.address || 'Field Location',
      ward: dto.location?.ward || dto.ward || 'Ward 14',
    },
    slaDeadline: dto.sla_deadline || dto.slaDeadline || null,
    isOverdue: Boolean(dto.is_overdue ?? dto.isOverdue ?? false),
    originalImageUrl: dto.original_image_url || dto.originalImageUrl || null,
    resolutionProofUrl: dto.resolution_proof_url || dto.resolutionProofUrl || null,
    aiVerification: dto.ai_verification ? {
      verified: Boolean(dto.ai_verification.verified),
      confidenceScore: Number(dto.ai_verification.confidence_score ?? dto.ai_verification.confidenceScore ?? 0),
      notes: dto.ai_verification.notes || '',
    } : null,
    citizenSignOff: dto.citizen_sign_off || dto.citizenSignOff || {
      confirmed: false,
      feedbackNotes: null,
    },
    progressNotes: Array.isArray(dto.progress_notes || dto.progressNotes)
      ? (dto.progress_notes || dto.progressNotes).map((n) => ({
          timestamp: n.timestamp || new Date().toISOString(),
          author: n.author || 'Crew Member',
          note: n.note || '',
        }))
      : [],
    activityTimeline: Array.isArray(dto.activity_timeline || dto.activityTimeline)
      ? (dto.activity_timeline || dto.activityTimeline).map((a) => ({
          timestamp: a.timestamp || new Date().toISOString(),
          action: a.action || 'Updated',
          actor: a.actor || 'System',
          detail: a.detail || '',
        }))
      : [],
    createdAt: dto.created_at || dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updated_at || dto.updatedAt || new Date().toISOString(),
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

