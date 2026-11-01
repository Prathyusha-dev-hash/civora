/**
 * AI Domain Service
 * 
 * Centralizes all AI & Vision models:
 * - Speech-to-Text transcription
 * - PII image privacy redaction
 * - Severity and SLA assessment
 * - Duplicate incident proximity check
 * - Before-and-after computer vision resolution verification
 */

import { httpClient } from '../http/httpClient';
import { ENDPOINTS } from '../../config/endpoints';
import {
  toUITranscription,
  toUITranslation,
  toUIRedaction,
  toUIImageAnalysis,
  toUISeverityAssessment,
  toUIDuplicates,
  toUIResolutionVerification,
} from '../mappers/ai.mapper';

// Gemini-backed calls can take several seconds (audio transcription, vision)
const AI_TIMEOUT = { timeout: 60000 };

export class AiService {
  /**
   * Translate text into English (or another target language) using Neural MT.
   */
  static async translateText({ text, sourceLanguage, targetLanguage = 'en' }) {
    const payload = {
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
    };

    const response = await httpClient.post(ENDPOINTS.AI.TRANSLATE, payload, AI_TIMEOUT);
    const data = response?.data || response;
    return toUITranslation(data);
  }
  /**
   * Transcribe multilingual audio.
   */
  static async transcribeAudio(audioBlob, language = 'en-US') {
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording_${Date.now()}.webm`);
    formData.append('language', language);

    const response = await httpClient.postFormData(ENDPOINTS.AI.TRANSCRIBE, formData, AI_TIMEOUT);
    const data = response?.data || response;
    return toUITranscription(data);
  }

  /**
   * Redact sensitive PII (faces, license plates).
   */
  static async redactPii(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await httpClient.postFormData(ENDPOINTS.AI.REDACT_PII, formData, AI_TIMEOUT);
    const data = response?.data || response;
    return toUIRedaction(data);
  }

  /**
   * Analyse an evidence photo: civic issue type, visible observations, department and visual priority.
   * Preview only; the backend stores nothing.
   */
  static async analyzeImage(imageFile, { category, description } = {}) {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (category) formData.append('category', category);
    if (description) formData.append('description', description);

    const response = await httpClient.postFormData(ENDPOINTS.AI.ANALYZE_IMAGE, formData, AI_TIMEOUT);
    const data = response?.data || response;
    return toUIImageAnalysis(data);
  }

  /**
   * Assess civic severity and SLA tier.
   */
  static async assessSeverity(criteria) {
    const response = await httpClient.post(ENDPOINTS.AI.ASSESS_SEVERITY, criteria, AI_TIMEOUT);
    const data = response?.data || response;
    return toUISeverityAssessment(data);
  }

  /**
   * Proximity duplicate incident detection across regional languages.
   * Compares geographic location, issue category, and semantic similarity via English translation.
   */
  static async checkDuplicates(criteria) {
    const response = await httpClient.post(ENDPOINTS.INCIDENTS.CHECK_DUPLICATES, criteria, AI_TIMEOUT);
    const data = response?.data || response;
    return toUIDuplicates(data);
  }

  /**
   * Before/After Computer Vision resolution proof verification.
   */
  static async verifyResolutionProof({ incidentId, workOrderId, originalImageUrl, resolutionImage }) {
    const formData = new FormData();
    if (incidentId) formData.append('incident_id', incidentId);
    if (workOrderId) formData.append('work_order_id', workOrderId);
    if (originalImageUrl) formData.append('original_image_url', originalImageUrl);
    formData.append('resolution_image', resolutionImage);

    const response = await httpClient.postFormData(ENDPOINTS.AI.VERIFY_RESOLUTION, formData, AI_TIMEOUT);
    const data = response?.data || response;
    return toUIResolutionVerification(data);
  }
}

export default AiService;

