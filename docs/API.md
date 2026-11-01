# Civora API Reference (v1)

Base URL: `http://localhost:5000/api/v1` (the frontend calls `/api/v1` through the Vite proxy).

**Envelopes**

```json
{ "success": true, "data": { }, "meta": { "timestamp": "...", "requestId": "req_..." } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "...", "issue": "..." }] } }
```

Status codes: `200`, `201`, `400` malformed, `401` no/expired token, `403` wrong role or department, `404`, `409` conflict / invalid transition, `422` validation or rejected file, `503` AI unavailable.

**Auth:** `Authorization: Bearer <jwt>`. Roles: `CITIZEN`, `AUTHORITY_FIELD_OFFICER`, `AUTHORITY_SUPERVISOR`, `CITY_ADMIN`.

**Identifiers:** complaint `CIV-000001`, master incident `MI-000001`, work order `WO-000001`.

---

## Authentication

| Method | Path | Access | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | public | `full_name, email, mobile?, password, address?` | Always creates a `CITIZEN`. The password needs 8+ characters with a letter and a number. Returns `user`, `token`. |
| POST | `/auth/login` | public | `email, password` | Returns `{ user, token, expiresIn }`. |
| GET | `/auth/me` | any | | |
| POST | `/auth/logout` | any | | Invalidates all of this user's tokens. |
| POST | `/auth/forgot-password` | public | `email` | The response is the same whether or not the account exists. With no email service, non-production builds return `devResetToken`. |
| POST | `/auth/reset-password` | public | `email, token, new_password` | Single use, valid for 15 minutes. Invalidates existing sessions. |

## Citizen incidents (complaints)

### `POST /incidents` (authenticated) — `multipart/form-data` or JSON

| Field | Type | Notes |
|---|---|---|
| `category` | string | `roads, water, sanitation, lighting, safety, traffic, parks, other` |
| `input_method` | `text` \| `audio` | `audio` requires the `audio` file. |
| `original_language` | string | `en hi bn gu kn ml mr pa ta te ur` (`hi-IN` is accepted). |
| `original_text` | string | The citizen's text or reviewed transcript. Stored **immutably**. If it's missing for audio, the server transcribes. |
| `location` | JSON string | `{"lat":..,"lng":..,"address":"..","ward":".."}` |
| `images` | file × 0–5 | JPEG/PNG/WebP, max 10 MB each. Checked by file signature. |
| `audio` | file × 0–1 | WebM/OGG/WAV/MP3/M4A, max 15 MB. |
| `redacted_evidence_ids` | JSON array | Optional ids returned by `/ai/redact-pii`. |

Client-supplied `english_translation` is **ignored**; the server translates itself. Processing order:

1. Store the files.
2. Create the complaint (`SUBMITTED`).
3. Translate.
4. Run image verification, redaction and embedding in parallel.
5. Assess severity.
6. Detect duplicates.
7. Create or link the master incident and work order.
8. Set the department and SLA (`ASSIGNED`).
9. Send notifications and write the audit log.

Response `201`: the full complaint. Key fields:

```json
{
  "id": "CIV-000002", "ticket_number": "CIV-000002", "status": "ASSIGNED",
  "category": "roads", "severity_level": "HIGH", "severity_score": 7.6,
  "assigned_department": "Roadways & Infrastructure", "target_sla_hours": 12, "sla_deadline": "...",
  "input_method": "audio", "original_language": "hi", "original_text": "मुख्य सड़क पर ...",
  "english_translation": "There is a very big pothole ...", "translation_status": "TRANSLATED",
  "has_audio": true, "original_audio_reference": "/api/v1/files/<id>?exp=...&sig=...",
  "images": [{ "id": "...", "kind": "IMAGE", "url": "/api/v1/files/..." }],
  "redacted_images": [{ "id": "...", "kind": "REDACTED_IMAGE", "url": "..." }],
  "original_image_url": "...", "redacted_image_url": "...",
  "master_incident_id": "MI-000001", "is_primary_report": false,
  "duplicate_count": 1, "linked_report_count": 2, "duplicate_score": 0.97,
  "work_order_id": "WO-000001",
  "ai_status": "COMPLETED", "needs_review": false, "review_reasons": [],
  "status_history": [{ "status": "SUBMITTED", "at": "..." }, { "status": "ASSIGNED", "at": "..." }]
}
```

`ai_status` values:
- `COMPLETED`: every AI stage succeeded.
- `PARTIAL`: some stages failed.
- `FALLBACK`: the AI was unreachable. The complaint still gets a keyword-based severity, routing and grouping, and is flagged `AI_UNAVAILABLE`.

`review_reasons` values: `IMAGE_NOT_RELEVANT`, `POSSIBLY_NOT_CIVIC`, `CATEGORY_MISMATCH:<cat>`, `AI_UNAVAILABLE`, `TRANSLATION_FAILED`.

### Other incident endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/incidents` | any | Scoped by role: citizen = own, authority = their department, admin = all. Filters: `status, category, severity, needs_review, page, limit`. `meta.total`. |
| GET | `/incidents/:id` | public / any | Anonymous users get redacted images only and no reporter details. Staff also get `reporter`, `linked_reports[]` and `ai_analysis`. Authorities only see their own department's complaints. |
| POST | `/incidents/duplicates/check` | any | `{lat, lng, category, englishTranslation?, description?, originalLanguage}` → `{ has_duplicates, duplicates: [{ ticket_number, master_incident_id, similarity_score (0-100), distance_meters, support_count, status, ... }] }` |
| POST | `/incidents/:id/support` | any | Endorses an existing complaint (once per user) → `{ updatedSupportCount, alreadySupported }` |
| POST | `/incidents/:id/feedback` | reporting citizen | `{ confirmed: bool, feedback_notes }`. Only allowed in `PENDING_VERIFICATION`. Confirm → `CLOSED_VERIFIED` (work order `RESOLVED`). Dispute → `DISPUTED_REWORK_REQUIRED` (work order back to `IN_PROGRESS`, priority at least HIGH). |

## AI (authenticated)

| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/ai/transcribe` | multipart `audio`, `language` | `transcript` (native script), `confidence`, `language`, `english_translation` |
| POST | `/ai/translate` | `{text, source_language, target_language='en'}` | `translated_text, source_language, translation_status, metadata{provider, model, confidence, translated_at}` |
| POST | `/ai/redact-pii` | multipart `image` | `redacted, redacted_image_url, redacted_evidence_id, faces_detected, license_plates_detected, processing_time_ms` |
| POST | `/ai/assess-severity` | `{category, description, location}` | `severity_level, score, factors[], explanation, suggested_department, target_sla_hours, method, is_fallback` |
| POST | `/ai/check-duplicates` | Same as `/incidents/duplicates/check` | |
| POST | `/ai/verify-resolution` | multipart `resolution_image` + `work_order_id` or `incident_id` (staff only) | `verified, confidence_score, structural_match_notes, damage_resolved_notes, passed_inspection_criteria[], failed_inspection_criteria[], requires_supervisory_review` |

## Authority work orders (field officer, supervisor, admin)

Authorities only see and act on their own department's work orders; admins see all of them.

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/authority/work-orders` | Query: `status, priority, department` (admin only), `page, limit` | Sorted by SLA deadline. |
| GET | `/authority/work-orders/:id` | | Includes `linked_reports[]`. |
| GET | `/authority/work-orders/:id/timeline` | | |
| PATCH | `/authority/work-orders/:id/status` | `{status, officer_name}` | Allowed values: `ASSIGNED, EN_ROUTE, IN_PROGRESS, ESCALATED`. Transitions are validated. Officers **cannot** set `RESOLVED`. |
| POST | `/authority/work-orders/:id/progress` | `{note}` | |
| POST | `/authority/work-orders/:id/escalate` | `{reason, target_department}` | Reassigns the department when the target differs. Notifies the target and admins. |
| POST | `/authority/work-orders/:id/resolution-proof` | multipart `resolution_image`, `notes` | Stores the photo and runs AI before/after verification (advisory) → `PENDING_VERIFICATION`. Every linked reporter gets an action-required notification. |

Status changes are mirrored to the master incident and **every** linked citizen complaint.

## Admin (CITY_ADMIN)

| Method | Path | Response |
|---|---|---|
| GET | `/admin/overview` | `total_incidents, active_backlog, resolved_count, overdue_count, sla_compliance_rate, average_resolution_hours, citizen_satisfaction_rate, master_incidents, duplicate_reports, needs_review, by_severity, by_category` |
| GET | `/admin/hotspots` | `[{ id, ward, category, categories, incident_count, distinct_incidents, center{lat,lng}, severity_weight, is_chronic_failure }]` (300 m clusters, last 90 days) |
| GET | `/admin/metrics/departments` | `[{ department, active_tickets, resolved_this_month, sla_compliance_percent, mttr_hours, overdue_tickets }]` |
| GET | `/admin/audit-logs` | Query: `ticket, action, limit`. Returns immutable records `{ timestamp, ticket_number, actor, actor_role, action, previous_state, new_state, notes }`. |

Audit actions include:
- Accounts: `USER_REGISTERED`, `USER_LOGIN`, `PASSWORD_RESET*`
- Intake and AI: `COMPLAINT_SUBMITTED`, `AI_ANALYSIS_COMPLETED`, `MASTER_INCIDENT_CREATED`, `WORK_ORDER_CREATED`, `DUPLICATE_LINKED`, `SEVERITY_ESCALATED`, `COMPLAINT_SUPPORTED`, `TRANSLATION_RETRIED`, `PIPELINE_ERROR`
- Work orders: `WORK_ORDER_STATUS_CHANGED`, `WORK_ORDER_NOTE_ADDED`, `WORK_ORDER_ESCALATED`, `SLA_BREACHED`
- Resolution: `RESOLUTION_SUBMITTED`, `RESOLUTION_CONFIRMED`, `RESOLUTION_DISPUTED`

## Notifications (authenticated)

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | Query: `unread_only, action_required, type, page, limit`. Server-enforced isolation: a user sees only notifications sent to them, to their department (authorities) or to their role (admins). `meta: { total, unread_count, action_required_count }` |
| PATCH | `/notifications/:id/read` | |
| POST | `/notifications/read-all` (alias `/notifications/mark-all-read`) | `{ marked_count }` |

## Files

`GET /files/:evidenceId?exp=&sig=` streams a stored file. Links are HMAC-signed and expire (6 h by default), and range requests work for audio. Original photos and voice recordings are `RESTRICTED`: links are only issued to staff and the reporting citizen. The public sees redacted photos only.

## Health

`GET /health` (also `/api/v1/health`) returns `{ status, database: { status }, aiService: { status, gemini_configured, model } }`. It returns `503` if the database is disconnected.

---

## Internal AI service (`ai-service`, port 8000)

These endpoints are called only by the backend, which sends the `X-Service-Token` header (`AI_SERVICE_TOKEN`).

`POST /api/v1/transcribe | /translate | /analyze-images | /redact | /severity | /embed | /verify-resolution`, `GET /health`

Errors:
- `AI_NOT_CONFIGURED` (no key)
- `AI_AUTH_FAILED`
- `AI_RATE_LIMITED`
- `AI_PROVIDER_ERROR`
- `INVALID_INPUT`
