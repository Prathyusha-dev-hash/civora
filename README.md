# CIVORA: Transparent Civic Grievance & Infrastructure Triage

Citizens report civic problems (potholes, leaks, garbage, broken streetlights) by text or voice in 11 Indian languages, with photos. The system:

- verifies the evidence with AI, blurs faces and number plates, and translates the report for officials while keeping the original
- rates severity, groups duplicate reports into one incident, and routes it to the right department as a work order with an SLA
- closes a ticket **only after the reporting citizen confirms** the repair
- gives admins live analytics, hotspots and an immutable audit trail

```
frontend/    React 19 + Vite (Civora UI)            :5173  -> proxies /api to :5000
backend/     Node.js + Express + Mongoose            :5000  /api/v1
ai-service/  Python FastAPI + Google Gemini          :8000  (called only by backend)
MongoDB Atlas (persistent data)  +  backend/storage/uploads (stored files)
```

## 1. Prerequisites

- Node.js 20 or newer, and Python 3.10 or newer
- A **MongoDB Atlas** free cluster:
  1. Create a cluster.
  2. Under **Database Access**, add a user with a password.
  3. Under **Network Access**, add your IP (or `0.0.0.0/0` for a demo).
  4. Go to **Connect → Drivers** and copy the `mongodb+srv://...` string. Put a database name in the path, e.g. `...mongodb.net/civora?retryWrites=true&w=majority`.
- A **Gemini API key** from <https://aistudio.google.com/apikey> (the free tier is enough).

## 2. Setup (Windows commands; on macOS/Linux use `cp` and `source .venv/bin/activate`)

Pick one random secret and use it for `AI_SERVICE_TOKEN` in both `.env` files:

```bat
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### AI service (terminal 1)

```bat
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
:: edit .env: GEMINI_API_KEY=..., AI_SERVICE_TOKEN=<shared secret>
python scripts\smoke_test_gemini.py     :: live check: should print 6/6 checks passed
python main.py                           :: http://localhost:8000/health
```

### Backend (terminal 2)

```bat
cd backend
npm install
copy .env.example .env
:: edit .env: MONGODB_URI, JWT_SECRET, AI_SERVICE_TOKEN (same secret), SEED_STAFF_PASSWORD
npm start                                :: http://localhost:5000/health
```

Then check the whole chain (DB, AI service, shared token, a live Gemini call):

```bat
npm run doctor
```

On first start the backend creates the departments and staff accounts. The server **refuses to start** if `MONGODB_URI` or `JWT_SECRET` is missing; there is no in-memory database fallback.

### Frontend (terminal 3)

```bat
cd frontend
npm install
copy .env.example .env.local             :: defaults are fine
npm run dev                              :: open http://localhost:5173
```

## 3. Accounts

Citizens register themselves on `/register`. Staff accounts are seeded with the `SEED_STAFF_PASSWORD` you set, and match the quick-login cards on the login page:

| Role | Email | Department |
|---|---|---|
| City Admin | `admin@civora.gov` | — |
| Field Officer | `officer.sharma@civora.gov` | Roadways & Infrastructure |
| Supervisor | `inspector.patel@civora.gov` | Water & Sanitation Board |
| Supervisors | `roads.supervisor@`, `sanitation.supervisor@`, `power.supervisor@`, `parks.supervisor@`, `operations.supervisor@`, `pwsu.lead@` (all `@civora.gov`) | one per department |
| Demo citizen (optional) | `citizen@civora.org` | password: `SEED_DEMO_CITIZEN_PASSWORD` |

The login cards display `Password@123`. Set `SEED_STAFF_PASSWORD=Password@123` if you want those cards to work as-is for the demo.

Category routing: roads/safety/traffic → Roadways & Infrastructure; water → Water & Sanitation Board; sanitation → Public Health & Sanitation; lighting → Power & Grid Authority; parks → Parks & Recreation; other → Municipal Operations. The routing table lives in the `departments` collection.

## 4. End-to-end workflow

1. **Citizen** (`/citizen`) picks a category and types or records the complaint. Voice is transcribed by Gemini in the native script and the citizen can edit it.
2. They add photos, can preview the AI privacy redaction, pin the location, and see the AI severity preview, the department and any nearby duplicates.
3. **Submit:**
   1. Files are uploaded and stored, and evidence records are created.
   2. The complaint is saved.
   3. The server translates the text, verifies the images, redacts them, embeds the text and assesses severity.
   4. Duplicate detection runs: semantic + image + distance + category, among open incidents within 250 m.
   5. The report is linked to an existing **master incident**, or a new incident and **work order** are created.
   6. The department and SLA are assigned, notifications are sent and the audit log is written.
4. **Authority** (`/authority`) sees their department's queue with every grouped report, moves the work order through EN_ROUTE / IN_PROGRESS, adds notes or escalates, and uploads a repair photo, which gets an AI before/after check.
5. Every reporting citizen gets an action-required notification. **Confirm** → `CLOSED_VERIFIED`; **dispute** → rework at HIGH priority.
6. **Admin** (`/admin`) sees live KPIs, SLA compliance, MTTR, hotspots, department benchmarks, grouped reports (Reports column + Inspect) and the audit ledger.

## 5. Data model (MongoDB)

| Collection | Purpose |
|---|---|
| `users` | Roles: `CITIZEN`, `AUTHORITY_FIELD_OFFICER`, `AUTHORITY_SUPERVISOR`, `CITY_ADMIN`. Department ref, bcrypt hash, token version. |
| `departments` | Routing table (category → department). |
| `complaints` | One per citizen report. Immutable `originalText`, `englishTranslation`, GeoJSON location (2dsphere), evidence refs, status history, severity, SLA, `masterIncident`, `isPrimary`, `duplicateOf`, `duplicateScore`, AI status and review flags, text embedding. |
| `masterincidents` | Groups duplicates: `complaintCount`, `duplicateCount`, aggregated severity, department, work order. |
| `workorders` | One per master incident: status, priority, SLA, notes, escalations, resolution proof + AI verification, citizen sign-off, activity timeline. |
| `evidences` | File metadata: kind (IMAGE / REDACTED_IMAGE / AUDIO / RESOLUTION_PROOF), storage provider + key, MIME, size, SHA-256, perceptual hash, visibility. |
| `aianalyses` | One immutable record per AI run: transcription, translation, image findings, severity, routing, duplicate scores, stage errors. |
| `auditlogs` | Append-only (updates and deletes are blocked in the model). |
| `notifications` | Addressed to a user, a department or a role, with per-user read state. |
| `counters` | Atomic sequences for `CIV-`, `MI-` and `WO-` ids. |

## 6. File storage

- Files are written by `backend/src/storage/localProvider.js` under `STORAGE_LOCAL_ROOT`, at `<kind>/<yyyy>/<mm>/<uuid>.<ext>`. Writes are atomic and protected against path traversal.
- File types are checked from the file's own bytes, not the client's claim. Size limits are enforced.
- If saving the database record fails, the stored file is deleted, so files and records never drift apart.
- Retrieval uses `GET /api/v1/files/:id`, with expiring HMAC-signed links and range support for audio.
- Original photos and voice recordings are **restricted** (staff and the reporter only). The public sees redacted photos.
- **GridFS:** `STORAGE_PROVIDER=gridfs` stores files inside MongoDB (bucket `evidence`), so they live and get backed up with the data. Required on Vercel.
- **Cloud storage:** add a provider with the same interface (`put`, `read`, `createReadStream`, `remove`) in `backend/src/storage/` and select it with `STORAGE_PROVIDER`. Controllers and models don't change.
- **Back up** `backend/storage/uploads` together with the database.

## 7. Reliability behaviour

- The complaint and its files are committed **before** any AI call.
- If the AI service or Gemini is down, the complaint is still routed using a clearly labelled keyword fallback (`ai_status: FALLBACK`, flagged `AI_UNAVAILABLE` for review). Failed translations are retried automatically every 10 minutes.
- Complaints interrupted by a crash are finished on the next start.
- The SLA monitor notifies the department and admins when a deadline passes. Abandoned redaction previews are cleaned up after 24 h.

## 8. Tests

```bat
:: AI service (offline: the real google-genai SDK talks to a local fake Gemini fixture)
cd ai-service && .venv\Scripts\activate && pip install pytest httpx && pytest -q

:: Full workflow against your RUNNING stack (creates test data; use a dev database)
cd backend
set E2E_BASE_URL=http://localhost:5000/api/v1
set E2E_STAFF_PASSWORD=<SEED_STAFF_PASSWORD>
npm run test:e2e
```

The E2E suite (11 scenarios) covers:
- registration and RBAC
- a Hindi text complaint with a photo, and a voice complaint with audio
- duplicate grouping, and keeping different problems at the same spot separate
- byte-identical file retrieval and signature tampering
- department scoping, the full lifecycle with dispute and confirmation, escalation, and admin analytics

## 9. Troubleshooting

Run `npm run doctor` in `backend/` first. It prints `[FAIL]` with the exact fix for each broken link.

| Symptom | Cause | Fix |
|---|---|---|
| Transcription / photo analysis fail; doctor shows `AI_MODEL_UNAVAILABLE` | Google limits older models (e.g. 2.5) to accounts that already used them | Use the default `GEMINI_MODEL=gemini-3.8-flash`. The service also falls back automatically through `GEMINI_FALLBACK_MODELS`. |
| `AI_AUTH_FAILED` | Invalid or revoked key | Create a new key at aistudio.google.com/apikey and put it in `ai-service/.env` |
| `AI_SERVICE_TOKEN matches - HTTP 401` | The token differs between the two `.env` files | Make them identical, then restart both services |
| `AI service unreachable` | The AI service isn't running, or the URL/port doesn't match | Start `python main.py`; keep `AI_SERVICE_URL=http://127.0.0.1:8000` |
| Live AI check: `curl http://127.0.0.1:8000/health?deep=true` | | Reports whether generation and embeddings work and which model answered |
| `Port 5000 is already in use` / `[Errno 10048]` on 8000 / Vite picks 5174 | Another copy of the stack is still running | Stop it (PowerShell: `Get-NetTCPConnection -LocalPort 5000,8000,5173 -State Listen` shows the PID), or change `PORT` in the `.env` files and `VITE_BACKEND_ORIGIN` / `AI_SERVICE_URL` to match |

## 10. Known limitations

- **No email/SMS delivery.** Password-reset tokens are returned in the API response in development (`NODE_ENV` ≠ `production`) and logged to the console.
- Two reports of the same issue submitted within the same second can each create a master incident (no distributed lock).
- Local disk storage is single-server. Use `STORAGE_PROVIDER=gridfs` (files in MongoDB) for multi-instance or serverless deployments.
- Gemini output quality (transcription accuracy for noisy audio, translation nuance) should be spot-checked with real recordings before the demo.

## 11. Deploying to Vercel

The repo deploys as **three Vercel projects** from the same GitHub repository, each with its own **Root Directory**. Each folder already contains its `vercel.json`, and local development (`npm start`, `python main.py`, `npm run dev`) is unchanged.

| Project | Root Directory | Entry | Notes |
|---|---|---|---|
| AI service | `ai-service` | `api/index.py` (FastAPI) | 120 s max duration |
| Backend | `backend` | `api/index.js` (Express) | 300 s max duration, daily cron for maintenance |
| Frontend | `frontend` | Vite build | SPA fallback for client-side routes |

Serverless differences, handled in code:
- **Files** are stored in MongoDB GridFS (`STORAGE_PROVIDER=gridfs`), because Vercel's disk is not persistent.
- **Maintenance** (SLA alerts, cleanup, translation retries, crash recovery) runs from Vercel Cron and, at most every 10 minutes, after normal requests.
- **Uploads**: Vercel caps request bodies at 4.5 MB, so the browser shrinks photos to at most 1600 px JPEG and voice recordings are capped at 5 minutes (32 kbps).

**Atlas:** under Network Access, allow `0.0.0.0/0`. Vercel has no fixed outbound IPs.

**Deploy in this order** (Vercel → Add New → Project → import the repo; set Root Directory and environment variables before deploying):

1. **AI service** (`ai-service`). Variables: `GEMINI_API_KEY`, `AI_SERVICE_TOKEN`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` (same values as `ai-service/.env`). Check `https://<ai-project>.vercel.app/health`.
2. **Backend** (`backend`). Variables: everything from `backend/.env`, plus:
   - `NODE_ENV=production`, `STORAGE_PROVIDER=gridfs`
   - `AI_SERVICE_URL=https://<ai-project>.vercel.app`
   - `PUBLIC_API_BASE_URL=https://<backend-project>.vercel.app`
   - `CORS_ORIGIN=https://<frontend-project>.vercel.app` (fill in after step 3, then redeploy)
   - `CRON_SECRET=<random string>`

   Check `https://<backend-project>.vercel.app/health`.
3. **Frontend** (`frontend`). Variable: `VITE_API_BASE_URL=https://<backend-project>.vercel.app/api/v1`.
4. Set the backend's `CORS_ORIGIN` to the frontend URL and **Redeploy** the backend.

Generate a secret: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

See [`docs/API.md`](docs/API.md) for the full API reference.
