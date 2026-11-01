/**
 * Civora Centralized API Service Hub
 */

import { IncidentService } from './modules/incidents.service';
import { AiService } from './modules/ai.service';
import { AuthorityService } from './modules/authority.service';
import { AdminService } from './modules/admin.service';
import { AuthService } from './modules/auth.service';
import { NotificationService } from './modules/notification.service';
import { httpClient } from './http/httpClient';
import { ApiError } from './http/errorHandling';
import { ENDPOINTS, API_BASE_URL } from '../config/endpoints';

export {
  IncidentService,
  AiService,
  AuthorityService,
  AdminService,
  AuthService,
  NotificationService,
  httpClient,
  ApiError,
  ENDPOINTS,
  API_BASE_URL,
};

/**
 * Backward-compatible bridge for legacy components
 */
export const CivicApiService = {
  transcribeVoiceReport: (blob, lang) => AiService.transcribeAudio(blob, lang),
  translateText: (payload) => AiService.translateText(payload),
  redactPii: (file) => AiService.redactPii(file),
  assessSeverity: (payload) => AiService.assessSeverity(payload),
  checkDuplicateIncident: (criteria) => AiService.checkDuplicates(criteria),
  supportIncident: (id) => IncidentService.supportIncident(id),
  submitIncident: (payload) => IncidentService.createIncident(payload),
  getIncidentById: (id) => IncidentService.getIncidentById(id),
  getIncidents: (params) => IncidentService.getIncidents(params),
  verifyResolutionProof: (payload) => AiService.verifyResolutionProof(payload),
};

export default CivicApiService;

