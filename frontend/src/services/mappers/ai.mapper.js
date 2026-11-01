/**
 * AI Service Data Mapper
 * 
 * Maps raw backend AI responses to clean UI presentation models.
 */

export function toUITranscription(dto) {
  if (!dto) return null;
  return {
    transcript: dto.transcript || '',
    confidence: Number(dto.confidence || 0),
    language: dto.language || dto.detected_language || 'en-US',
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

export function toUITranslation(dto) {
  if (!dto) return null;
  return {
    translatedText: dto.translated_text || dto.translatedText || '',
    sourceLanguage: dto.source_language || dto.sourceLanguage || 'en',
    targetLanguage: dto.target_language || dto.targetLanguage || 'en',
    translationStatus: dto.translation_status || dto.translationStatus || 'TRANSLATED',
    metadata: {
      provider: dto.metadata?.provider || 'Civora Neural MT',
      model: dto.metadata?.model || 'civic-translation-v2.1',
      translatedAt: dto.metadata?.translated_at || dto.metadata?.translatedAt || new Date().toISOString(),
      confidence: Number(dto.metadata?.confidence || 0.95),
    },
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

export function toUIRedaction(dto) {
  if (!dto) return null;
  return {
    redacted: Boolean(dto.redacted),
    redactedImageUrl: dto.redacted_image_url || dto.redactedImageUrl || '',
    redactedEvidenceId: dto.redacted_evidence_id || dto.redactedEvidenceId || null,
    facesDetected: Number(dto.faces_detected ?? dto.facesDetected ?? 0),
    licensePlatesDetected: Number(dto.license_plates_detected ?? dto.licensePlatesDetected ?? 0),
    processingTimeMs: Number(dto.processing_time_ms ?? dto.processingTimeMs ?? 0),
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

export function toUIImageAnalysis(dto) {
  if (!dto) return null;
  return {
    status: dto.status || 'UNCLEAR',
    isCivicIssue: Boolean(dto.is_civic_issue),
    matchesCategory: Boolean(dto.matches_category),
    issueType: dto.issue_type || 'unclear',
    detectedIssue: dto.detected_issue || '',
    description: dto.description || '',
    visibleObservations: list(dto.visible_observations),
    evidence: list(dto.evidence),
    uncertainties: list(dto.uncertainties),
    warnings: list(dto.warnings),
    suggestedCategory: dto.suggested_category || null,
    suggestedDepartment: dto.suggested_department || null,
    visualSeverity: dto.visual_severity || null,
    targetSlaHours: dto.target_sla_hours ?? null,
    confidence: typeof dto.confidence === 'number' ? dto.confidence : null,
    disclaimer: dto.disclaimer || '',
    // Raw findings are passed back to the severity preview so the photo informs the rating
    imageFindings: list(dto.image_findings),
  };
}

export function toUISeverityAssessment(dto) {
  if (!dto) return null;
  return {
    severityLevel: dto.severity_level || dto.severityLevel || 'MODERATE',
    score: Number(dto.score || 5),
    factors: Array.isArray(dto.factors) ? dto.factors : [],
    explanation: dto.explanation || '',
    suggestedDepartment: dto.suggested_department || dto.suggestedDepartment || 'Municipal Operations',
    targetSlaHours: Number(dto.target_sla_hours || dto.targetSlaHours || 24),
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

export function toUIDuplicates(dto) {
  if (!dto) return { hasDuplicates: false, duplicates: [] };
  const rawList = Array.isArray(dto.duplicates) ? dto.duplicates : [];
  return {
    hasDuplicates: Boolean(dto.has_duplicates ?? dto.hasDuplicates ?? rawList.length > 0),
    duplicates: rawList.map((item) => ({
      id: item.id || item.complaint_id || item.ticket_number || 'UNKNOWN',
      complaintId: item.complaint_id || item.id || item.ticket_number || 'UNKNOWN',
      category: item.category || 'other',
      description: item.english_translation || item.description || item.original_text || '',
      originalText: item.original_text || item.original_description || item.description || '',
      englishTranslation: item.english_translation || item.translated_description || null,
      originalLanguage: item.original_language || item.originalLanguage || 'en',
      inputMethod: item.input_method || item.inputMethod || 'text',
      hasAudio: Boolean(item.has_audio ?? item.hasAudio ?? false),
      audioUrl: item.original_audio_reference || item.audio_url || null,
      approxLocation: item.approx_location || item.approxLocation || 'Nearby',
      distanceMeters: Number(item.distance_meters ?? item.distanceMeters ?? 0),
      similarityScore: Number(item.similarity_score ?? item.similarityScore ?? 0.85),
      status: item.status || 'Active',
      supportCount: Number(item.support_count ?? item.supportCount ?? 1),
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      isSandbox: Boolean(item.is_sandbox ?? item.isSandbox ?? false),
    })),
  };
}

export function toUIResolutionVerification(dto) {
  if (!dto) return null;
  return {
    verified: Boolean(dto.verified),
    confidenceScore: Number(dto.confidence_score ?? dto.confidenceScore ?? 0),
    structuralMatchNotes: dto.structural_match_notes || dto.structuralMatchNotes || '',
    damageResolvedNotes: dto.damage_resolved_notes || dto.damageResolvedNotes || '',
    passedInspectionCriteria: Array.isArray(dto.passed_inspection_criteria)
      ? dto.passed_inspection_criteria
      : Array.isArray(dto.passedInspectionCriteria)
      ? dto.passedInspectionCriteria
      : [],
    requiresSupervisoryReview: Boolean(
      dto.requires_supervisory_review ?? dto.requiresSupervisoryReview ?? false
    ),
    isSandbox: Boolean(dto.is_sandbox ?? dto.isSandbox ?? false),
  };
}

