# Civora Backend Integration Specification
**Version:** 2.0.0  
**Target Architecture:** Multi-Portal Civic Issue Accountability Platform (Citizen, Authority, Admin)  
**Base URL:** `/api/v1`  
**Authentication Scheme:** Bearer Token (JWT)

---

## 1. Global Conventions & Standards

### 1.1 HTTP Headers
* `Content-Type: application/json` (unless uploading `multipart/form-data`)
* `Authorization: Bearer <jwt_token>` (for authenticated endpoints)
* `X-Request-ID: <uuid>` (optional client tracking ID)

### 1.2 Standard Success Response Envelope
All JSON responses should follow this envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-31T01:30:00Z",
    "requestId": "req_829104"
  }
}
```

### 1.3 Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Complaint with Reference ID #CIV-928312 was not found.",
    "details": [
      { "field": "id", "issue": "Does not exist in municipal registry." }
    ]
  }
}
```

### 1.4 Standard HTTP Status Codes
* `200 OK` — Successful query or update
* `201 Created` — Successful resource creation (new complaint, new work order)
* `400 Bad Request` — Invalid payload or malformed query
* `401 Unauthorized` — Missing or expired JWT token
* `403 Forbidden` — User lacks required RBAC role (e.g. Citizen calling Admin endpoint)
* `404 Not Found` — Ticket, work order, or user does not exist
* `422 Unprocessable Entity` — Validation error on file upload / missing required form field
* `500 Internal Server Error` — Unhandled server exception
* `503 Service Unavailable` — AI vision inference engine or external GIS service offline

---

## 2. Authentication & Roles (RBAC)

### User Roles
1. `CITIZEN` — Public reporting, status tracking, resolution verification feedback
2. `AUTHORITY_FIELD_OFFICER` — Work order execution, progress updates, resolution proof upload
3. `AUTHORITY_SUPERVISOR` — Department queue triage, work order assignment, escalation handling
4. `CITY_ADMIN` — Citywide analytics, ward hotspots, department MTTR benchmarks, audit logs

### 2.1 `POST /api/v1/auth/register`
* **Access:** Public (Citizen self-registration only)
* **Request:**
  ```json
  {
    "name": "Aditi Rao",
    "email": "aditi.rao@example.com",
    "phone": "+91 98765 43210",
    "password": "StrongPassword123!",
    "address": "Ward 12, Indiranagar, 100ft Road"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_citizen_001",
        "name": "Aditi Rao",
        "email": "aditi.rao@example.com",
        "role": "CITIZEN",
        "department": "Civic Resident"
      },
      "message": "Citizen account registered successfully."
    }
  }
  ```

### 2.2 `POST /api/v1/auth/login`
* **Access:** Public (Unified login for Citizen, Authority, and Admin)
* **Request:**
  ```json
  {
    "email": "officer.sharma@civora.gov",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_9102",
        "name": "Inspector R. Sharma",
        "email": "officer.sharma@civora.gov",
        "role": "AUTHORITY_FIELD_OFFICER",
        "department": "Roadways & Infrastructure"
      },
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresIn": 86400
    }
  }
  ```

### 2.3 `POST /api/v1/auth/forgot-password`
* **Access:** Public
* **Request:**
  ```json
  {
    "email": "citizen@civora.org"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Password reset instructions sent to registered email.",
      "expiresIn": 900
    }
  }
  ```

### 2.4 `POST /api/v1/auth/reset-password`
* **Access:** Public
* **Request:**
  ```json
  {
    "email": "citizen@civora.org",
    "token": "rst_token_829104",
    "new_password": "NewSecurePassword123!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Password updated successfully."
    }
  }
  ```

### 2.5 `GET /api/v1/auth/me`
* **Access:** Authenticated (Bearer Token)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_9102",
        "name": "Inspector R. Sharma",
        "email": "officer.sharma@civora.gov",
        "role": "AUTHORITY_FIELD_OFFICER",
        "department": "Roadways & Infrastructure"
      }
    }
  }
  ```

### 2.6 `POST /api/v1/auth/logout`
* **Access:** Authenticated (Bearer Token)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Session terminated successfully."
    }
  }
  ```

---

## 3. AI & Vision Services Endpoints

### 3.1 `POST /api/v1/ai/transcribe`
* **Access:** Public
* **Content-Type:** `multipart/form-data`
* **Request Body:**
  * `audio`: Binary audio file (`.webm`, `.mp3`, `.wav`)
  * `language`: ISO Language Code (`en-US`, `hi-IN`, `ta-IN`)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "transcript": "Deep crater-like pothole near Sector 4 intersection causing severe vehicle swerving.",
      "confidence": 0.94,
      "detectedLanguage": "en-US"
    }
  }
  ```

### 3.2 `POST /api/v1/ai/redact-pii`
* **Access:** Public
* **Content-Type:** `multipart/form-data`
* **Request Body:**
  * `image`: Binary image file (JPEG, PNG, WebP; max 10MB)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "redacted": true,
      "redactedImageUrl": "https://storage.civicai.gov/redacted/img_92104.jpg",
      "facesDetected": 2,
      "licensePlatesDetected": 1,
      "processingTimeMs": 184
    }
  }
  ```

### 3.3 `POST /api/v1/ai/assess-severity`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "category": "roads",
    "description": "Large deep pothole on arterial road, multiple two-wheelers slipping",
    "location": { "lat": 28.6139, "lng": 77.2090 }
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "severityLevel": "CRITICAL",
      "score": 9,
      "factors": ["Direct Obstruction to Arterial Flow", "High Vulnerability for Two-Wheelers"],
      "explanation": "High-risk structural hazard on arterial corridor exceeding tolerance thresholds.",
      "suggestedDepartment": "Roadways & Infrastructure",
      "targetSlaHours": 4
    }
  }
  ```

### 3.4 `POST /api/v1/ai/verify-resolution`
* **Access:** `AUTHORITY_FIELD_OFFICER`, `AUTHORITY_SUPERVISOR`
* **Content-Type:** `multipart/form-data`
* **Request Body:**
  * `incident_id`: String (e.g. `CIV-101`)
  * `original_image_url`: String URL of original damage photo
  * `resolution_image`: Binary image file of completed repair
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "verified": true,
      "confidenceScore": 92,
      "structuralMatchNotes": "Camera angle and curb geometry match original damage coordinate.",
      "damageResolvedNotes": "Asphalt patched and leveled with surrounding road grade.",
      "passedInspectionCriteria": [
        "Location Landmark Match",
        "Damage Depression Leveled",
        "Clean Pathway"
      ],
      "requiresSupervisoryReview": false
    }
  }
  ```

### 3.5 `POST /api/v1/ai/translate`
* **Access:** Public / Authenticated
* **Content-Type:** `application/json`
* **Description:** Official neural machine translation service for regional Indian languages (Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Urdu) to English. Guarantees permanent preservation of the canonical native text while supplying standardized English representation for cross-departmental operations and automated semantic duplicate detection.
* **Request Body:**
  ```json
  {
    "text": "मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं",
    "sourceLanguage": "hi",
    "targetLanguage": "en"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "translatedText": "Deep crater-like pothole near main intersection causing vehicles to slip.",
      "sourceLanguage": "hi",
      "targetLanguage": "en",
      "translationStatus": "TRANSLATED",
      "metadata": {
        "provider": "civic-neural-mt",
        "model": "civic-translation-v2.1",
        "confidence": 0.96,
        "translatedAt": "2026-10-31T05:20:00Z"
      }
    }
  }
  ```
* **Error Response (422 / 503):** If translation fails, returns `translationStatus: "FAILED"`. The client retains the original complaint intact and can retry asynchronously.

### 3.6 `POST /api/v1/ai/check-duplicates`
* **Access:** Public / Authenticated
* **Content-Type:** `application/json`
* **Description:** Cross-language duplicate detection engine. Evaluates geographic proximity (Haversine formula within 1.2km radius), municipal category match, and semantic similarity using standardized English embeddings across multilingual reports.
* **Request Body:**
  ```json
  {
    "lat": 28.6139,
    "lng": 77.2090,
    "category": "roads",
    "englishText": "Deep crater-like pothole near main intersection causing vehicles to slip",
    "originalLanguage": "hi"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "hasDuplicates": true,
      "duplicates": [
        {
          "id": "CIV-101",
          "ticketNumber": "CIV-101",
          "category": "roads",
          "originalText": "Deep pothole causing vehicle swerving",
          "englishTranslation": "Deep pothole causing vehicle swerving",
          "originalLanguage": "en",
          "inputMethod": "text",
          "hasAudio": false,
          "similarityScore": 94,
          "distanceMeters": 65,
          "status": "IN_PROGRESS"
        }
      ]
    }
  }
  ```

---

## 4. Citizen Incidents Endpoints

### 4.1 `POST /api/v1/incidents`
* **Access:** Public / Authenticated
* **Data Integrity & Multilingual Preservation Rules:**
  1. **Dual-Record Single Incident:** Every complaint record permanently preserves BOTH the citizen's canonical native submission (`original_text`) and the standardized English translation (`english_translation`) on the **same single database record**. Zero duplicate records are spawned.
  2. **Mutually Exclusive Input:** The citizen selects either `text` OR `audio` intake (never both concurrently).
  3. **Voice Audio Retention:** For voice submissions, the original audio file reference (`original_audio_reference`) is stored directly on the same complaint record alongside its native speech-to-text transcript.
  4. **Non-destructive Storage:** The backend must NEVER overwrite or discard `original_text` when updating translations or status.
* **Request Body (Text Example - Hindi Native):**
  ```json
  {
    "category": "roads",
    "input_method": "text",
    "original_language": "hi",
    "original_text": "मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं",
    "original_description": "मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं",
    "description": "मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं",
    "english_translation": "Deep crater-like pothole near main intersection causing vehicles to slip.",
    "translated_description": "Deep crater-like pothole near main intersection causing vehicles to slip.",
    "transcription_status": "none",
    "translation_status": "TRANSLATED",
    "translation_metadata": {
      "provider": "civic-neural-mt",
      "model": "civic-translation-v2.1",
      "confidence": 0.96,
      "translatedAt": "2026-10-31T05:20:00Z"
    },
    "has_audio": false,
    "audio_url": null,
    "original_audio_reference": null,
    "location": {
      "lat": 28.6139,
      "lng": 77.2090,
      "address": "Main Ring Road, Pillar 142",
      "ward": "Ward 14"
    },
    "has_image": true,
    "is_redacted": true,
    "redacted_image_url": "https://storage.civicai.gov/redacted/img_92104.jpg"
  }
  ```
* **Request Body (Audio Example - Tamil Spoken):**
  ```json
  {
    "category": "drainage",
    "input_method": "audio",
    "original_language": "ta",
    "original_text": "மழைக்கால வடிகால் அடைபட்டு சாலையில் சாக்கடை நீர் தேங்கியுள்ளது",
    "original_description": "மழைக்கால வடிகால் அடைபட்டு சாலையில் சாக்கடை நீர் தேங்கியுள்ளது",
    "description": "மழைக்கால வடிகால் அடைபட்டு சாலையில் சாக்கடை நீர் தேங்கியுள்ளது",
    "english_translation": "Stormwater drain is blocked and sewage water is overflowing onto the road.",
    "translated_description": "Stormwater drain is blocked and sewage water is overflowing onto the road.",
    "transcription_status": "transcribed",
    "translation_status": "TRANSLATED",
    "translation_metadata": {
      "provider": "civic-neural-mt",
      "model": "civic-translation-v2.1",
      "confidence": 0.95,
      "translatedAt": "2026-10-31T05:21:00Z"
    },
    "has_audio": true,
    "audio_url": "https://storage.civicai.gov/audio/rec_ta_48102.webm",
    "original_audio_reference": "https://storage.civicai.gov/audio/rec_ta_48102.webm",
    "location": {
      "lat": 13.0827,
      "lng": 80.2707,
      "address": "Anna Salai, Near Metro Station",
      "ward": "Ward 22"
    },
    "has_image": false,
    "is_redacted": false
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "CIV-928312",
      "complaint_id": "CIV-928312",
      "ticket_number": "CIV-928312",
      "ticketNumber": "CIV-928312",
      "status": "ASSIGNED",
      "severity_level": "CRITICAL",
      "severityLevel": "CRITICAL",
      "assigned_department": "Roadways & Infrastructure",
      "assignedDepartment": "Roadways & Infrastructure",
      "sla_deadline": "2026-10-31T05:30:00Z",
      "slaDeadline": "2026-10-31T05:30:00Z",
      "created_at": "2026-10-31T01:30:00Z",
      "createdAt": "2026-10-31T01:30:00Z"
    }
  }
  ```

### 4.2 `GET /api/v1/incidents/:id`
* **Access:** Public
* **Response (200 OK):** Full incident details returning the dual-language payload with original audio reference and translation verification:
  ```json
  {
    "success": true,
    "data": {
      "id": "CIV-928312",
      "complaint_id": "CIV-928312",
      "ticket_number": "CIV-928312",
      "category": "roads",
      "status": "ASSIGNED",
      "severity_level": "CRITICAL",
      "assigned_department": "Roadways & Infrastructure",
      "input_method": "audio",
      "original_language": "hi",
      "original_text": "मुख्य चौराहे के पास गहरा गड्ढा है जिससे गाड़ियां फिसल रही हैं",
      "original_audio_reference": "https://storage.civicai.gov/audio/rec_hi_91823.webm",
      "has_audio": true,
      "english_translation": "Deep crater-like pothole near main intersection causing vehicles to slip.",
      "transcription_status": "transcribed",
      "translation_status": "TRANSLATED",
      "translation_metadata": {
        "provider": "civic-neural-mt",
        "model": "civic-translation-v2.1",
        "confidence": 0.96,
        "translatedAt": "2026-10-31T05:20:00Z"
      },
      "location": {
        "lat": 28.6139,
        "lng": 77.2090,
        "address": "Main Ring Road, Pillar 142",
        "ward": "Ward 14"
      },
      "sla_deadline": "2026-10-31T05:30:00Z",
      "created_at": "2026-10-31T01:30:00Z",
      "updated_at": "2026-10-31T01:35:00Z",
      "support_count": 5
    }
  }
  ```

### 4.3 `POST /api/v1/incidents/:id/support`
* **Access:** Public
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "success": true, "updatedSupportCount": 8 }
  }
  ```

### 4.4 `POST /api/v1/incidents/:id/feedback`
* **Access:** Public / Citizen Reporter
* **Request Body:**
  ```json
  {
    "confirmed": true,
    "feedback_notes": "Repair verified on-site. Road surface is completely smooth."
  }
  ```

---

## 5. Authority Work Orders Endpoints

### 5.1 `GET /api/v1/authority/work-orders`
* **Access:** `AUTHORITY_FIELD_OFFICER`, `AUTHORITY_SUPERVISOR`
* **Query Params:** `status`, `priority`, `department`, `page`, `limit`
* **Response (200 OK):** List of work orders with assigned crew, SLA countdown, and evidence URLs.

### 5.2 `PATCH /api/v1/authority/work-orders/:id/status`
* **Request Body:**
  ```json
  {
    "status": "IN_PROGRESS",
    "officer_name": "Inspector R. Sharma"
  }
  ```

### 5.3 `POST /api/v1/authority/work-orders/:id/progress`
* **Request Body:**
  ```json
  {
    "note": "Excavation completed, asphalt compacting underway.",
    "author": "Field Officer"
  }
  ```

### 5.4 `POST /api/v1/authority/work-orders/:id/escalate`
* **Request Body:**
  ```json
  {
    "reason": "Underground gas line detected during digging; requires specialized engineering crew.",
    "target_department": "Public Works Specialist Unit"
  }
  ```

### 5.5 `POST /api/v1/authority/work-orders/:id/resolution-proof`
* **Request Body:**
  ```json
  {
    "proof_image_url": "https://storage.civicai.gov/proofs/wo_101_done.jpg",
    "notes": "Pothole filled with grade-A bitumen."
  }
  ```

---

## 6. Admin Governance & Hotspots Endpoints

### 6.1 `GET /api/v1/admin/overview`
* **Response (200 OK):** Citywide metrics (total incidents, active backlog, MTTR hours, SLA compliance rate).

### 6.2 `GET /api/v1/admin/hotspots`
* **Response (200 OK):** Geographic density cluster array with ward name, category, center coordinates, and incident count.

### 6.3 `GET /api/v1/admin/metrics/departments`
* **Response (200 OK):** Department benchmarking array with MTTR hours, SLA compliance %, active tickets, and overdue counts.

### 6.4 `GET /api/v1/admin/audit-logs`
* **Response (200 OK):** Immutable audit log records with actor, timestamp, ticket number, previous state, and new state.

---

## 7. Role-Based Notification Service & Citizen Resolution Verification

### 7.1 Core Governance Rule: Mandatory Citizen Sign-Off
> **Architectural Invariant:** Under municipal policy, **AI computer-vision verification alone must NEVER automatically close a civic complaint or work order.**  
> When field crews upload resolution proof (`POST /api/v1/authority/work-orders/:id/resolution-proof`), the incident and companion work order transition to `PENDING_VERIFICATION` status with an AI confidence match score (e.g., 93%). The system immediately dispatches an `ACTION_REQUIRED` notification to the original reporting citizen. Only an explicit confirmation by the citizen marks the ticket as `CLOSED_VERIFIED`. If the citizen reports the problem as unresolved, the incident is flagged as `DISPUTED_REWORK_REQUIRED`, the work order is automatically reopened to `IN_PROGRESS`, and high-priority rework alerts are dispatched to the assigned field department and City Admin.

---

### 7.2 `GET /api/v1/notifications`
* **Access:** Authenticated Users (`CITIZEN`, `AUTHORITY_FIELD_OFFICER`, `AUTHORITY_SUPERVISOR`, `CITY_ADMIN`)
* **Headers:** `Authorization: Bearer <jwt_token>`
* **Query Parameters:**
  * `unread_only` (boolean, optional): Filter by unread status (`true` / `false`)
  * `action_required` (boolean, optional): Filter for items requiring citizen or authority action
  * `type` (string, optional): Specific event type code (e.g. `RESOLUTION_SUBMITTED`, `SLA_WARNING`)
  * `page` (number, default: 1): Pagination page number
  * `limit` (number, default: 20): Results per page
* **Role-Based Isolation Rules (Server-Enforced):**
  * `CITIZEN`: Returns only notifications where `recipient_user_id === user.id` or `recipient_email === user.email`. Citizens NEVER receive or see notifications belonging to other citizens.
  * `AUTHORITY`: Returns notifications addressed to `user.id` or matching `recipient_department === user.department`.
  * `ADMIN`: Returns citywide governance alerts (`CITY_ADMIN` role recipient).
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "NOTIF-DEMO-001",
        "recipient_user_id": "usr-citizen-demo",
        "recipient_email": "citizen@civora.org",
        "recipient_role": "CITIZEN",
        "type": "RESOLUTION_SUBMITTED",
        "priority": "ACTION_REQUIRED",
        "title": "Citizen Confirmation Required: High-Pressure Pipeline Clamp",
        "title_key": "notifications.resolutionSubmittedTitle",
        "message": "Authority reported CIV-DEMO-102 as resolved. AI verification approved (91% match). Please review before/after photos and confirm or dispute.",
        "message_key": "notifications.resolutionSubmittedMessage",
        "params": {
          "complaintId": "CIV-DEMO-102",
          "category": "water",
          "confidence": 91
        },
        "complaint_id": "CIV-DEMO-102",
        "work_order_id": "WO-DEMO-102",
        "original_image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=600",
        "resolution_proof_url": "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600",
        "ai_confidence": 91,
        "link_url": "/citizen?ticketId=CIV-DEMO-102",
        "action_required": true,
        "action_type": "VERIFY_RESOLUTION",
        "status": "PENDING_CONFIRMATION",
        "read": false,
        "read_at": null,
        "created_at": "2026-10-31T05:30:00Z",
        "is_sandbox": false
      }
    ],
    "meta": {
      "total": 1,
      "unread_count": 1,
      "action_required_count": 1
    }
  }
  ```

---

### 7.3 `PATCH /api/v1/notifications/:id/read`
* **Access:** Authenticated User (Owner of the notification)
* **Headers:** `Authorization: Bearer <jwt_token>`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "NOTIF-DEMO-001",
      "read": true,
      "read_at": "2026-10-31T07:15:00Z"
    }
  }
  ```

---

### 7.4 `POST /api/v1/notifications/mark-all-read`
* **Access:** Authenticated User
* **Headers:** `Authorization: Bearer <jwt_token>`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "marked_count": 4
    }
  }
  ```

---

### 7.5 Resolution Confirmation & Dispute Endpoints

#### Scenario A: Citizen Confirms Resolution
* **Endpoint:** `POST /api/v1/incidents/:id/feedback`
* **Request Body:**
  ```json
  {
    "confirmed": true,
    "feedback_notes": "Issue resolved satisfactorily. Roadway clean and safe."
  }
  ```
* **Side Effects:**
  1. Incident status set to `CLOSED_VERIFIED`.
  2. Companion work order status set to `RESOLVED`.
  3. Action notification for citizen marked as `status: 'CONFIRMED'`, `action_required: false`.
  4. Dispatches confirmation notification to Citizen (`RESOLUTION_CONFIRMED`).
  5. Dispatches citizen sign-off notification to Authority (`CITIZEN_CONFIRMED`).
  6. Dispatches MTTR completion event to Admin audit ledger.

#### Scenario B: Citizen Disputes Resolution (Report Problem Not Fixed)
* **Endpoint:** `POST /api/v1/incidents/:id/feedback`
* **Request Body:**
  ```json
  {
    "confirmed": false,
    "feedback_notes": "Pothole filled with loose stones only; asphalt not compacted. Rain has washed stones away."
  }
  ```
* **Side Effects:**
  1. Incident status set to `DISPUTED_REWORK_REQUIRED`.
  2. Companion work order status reverted to `IN_PROGRESS` with high priority.
  3. Action notification for citizen marked as `status: 'DISPUTED'`, `action_required: false`.
  4. Dispatches dispute notification to Citizen (`RESOLUTION_DISPUTED`).
  5. Dispatches urgent rework notification to Authority field department (`REWORK_REQUESTED`).
  6. Dispatches escalation dispute alert to City Admin governance queue (`REPEATED_DISPUTES`).


