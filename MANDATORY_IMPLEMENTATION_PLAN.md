# 📋 MANDATORY IMPLEMENTATION PLAN — OmniStudio AI (Updated Backlog)

> **STATUS: UPDATED POST-VALIDATION & RATE LIMITING IMPLEMENTATION**  
> **Last Audited & Updated:** September 10, 2026  
> **Progress:** 21 Critical Tasks Completed & Verified (13/13 automated security & validation tests passing, 0 errors in Next.js 16 build).  
> **Target:** Encryption at Rest, Async Scalability & Cloud Credential Rotation.

---

## 📊 AUDIT SUMMARY: COMPLETED & PRUNED TASKS

The following tasks were deeply analyzed across the codebase, verified as fully implemented, tested, and **pruned from the active implementation backlog**:

| Task | Area | Resolution Details | Verified In Codebase |
|---|---|---|---|
| **Task 1.1** | Auth Middleware / Dependency | Implemented `get_current_user_or_token` supporting static service token, studio JWT, and Supabase JWT with 401 rejection. | [backend/auth.py](file:///d:/pipline/backend/auth.py) |
| **Task 1.2** | Router Auth Lockdown | Applied `dependencies=api_security` across all 7 routers (`image`, `video`, `voice`, `pipeline`, `assets`, `settings`, `analytics`). | [backend/main.py](file:///d:/pipline/backend/main.py) |
| **Task 1.3** | Fix Settings Keys Endpoint | Protected `/api/settings/keys` with `require_admin_token`, append-only audit logging, and masked key responses. | [backend/routers/settings.py](file:///d:/pipline/backend/routers/settings.py) |
| **Task 1.4** | Backend PIN Validation | Created server-side `POST /api/auth/verify-pin` with `hmac.compare_digest` issuing signed 12h JWTs; updated client auth. | [backend/main.py](file:///d:/pipline/backend/main.py), [AuthContext.tsx](file:///d:/pipline/frontend/src/context/AuthContext.tsx) |
| **Task 1.5** | Frontend Auth Headers | Injected `Authorization: Bearer <token>` in `fetchApi`, `fetchApiFormData`, `runPipelineStream`, and media queries. | [frontend/src/lib/api.ts](file:///d:/pipline/frontend/src/lib/api.ts) |
| **Task 1.6** | Sanitize Health Endpoint | Stripped all secret status and API key exposure from public `/health` and `/api/health`. | [backend/main.py](file:///d:/pipline/backend/main.py) |
| **Task 2.1** | Hardened Path Resolver | Built central `safe_resolve_output_path` and `sanitize_filename` blocking path traversal, symlinks, and absolute escapes. | [backend/path_utils.py](file:///d:/pipline/backend/path_utils.py), [security_service.py](file:///d:/pipline/backend/services/security_service.py) |
| **Task 2.2** | Upload Size & Magic Byte Limits | Enforced magic byte signatures (PNG/JPG/WEBP/GIF/BMP, MP3/WAV/OGG/FLAC, MP4/WebM/AVI) & size caps (25MB/50MB/500MB). | [security_service.py](file:///d:/pipline/backend/services/security_service.py) |
| **Task 2.3** | Static Files Access Control | Removed open StaticFiles directory mount; replaced with authenticated `/outputs/{media_type}/{filename}` route. | [backend/main.py](file:///d:/pipline/backend/main.py) |
| **Task 2.5** | Production CORS Whitelist | Replaced wildcard CORS with strict explicit origin whitelisting (`localhost:3000`, `localhost:3050`, `31.97.231.218:3050`). | [backend/config.py](file:///d:/pipline/backend/config.py), [main.py](file:///d:/pipline/backend/main.py) |
| **Task 3.1** | Strict Pydantic Field Validators | Added `@field_validator` across all request models (`ImageRequest`, `VideoRequest`, `VoiceRequest`, `PipelineRequest`, `EditVideoRequest`, `AssetItem`). | [image.py](file:///d:/pipline/backend/routers/image.py), [video.py](file:///d:/pipline/backend/routers/video.py), [voice.py](file:///d:/pipline/backend/routers/voice.py), [pipeline.py](file:///d:/pipline/backend/routers/pipeline.py), [assets.py](file:///d:/pipline/backend/routers/assets.py) |
| **Task 3.2** | API Rate Limiting via Slowapi | Integrated `slowapi` with IP-based limits: `verify-pin` (5/min), `settings/keys` (10/hr), `image/generate` (10/min), `video/generate` (5/min). | [backend/limiter.py](file:///d:/pipline/backend/limiter.py), [main.py](file:///d:/pipline/backend/main.py), [image.py](file:///d:/pipline/backend/routers/image.py), [video.py](file:///d:/pipline/backend/routers/video.py), [settings.py](file:///d:/pipline/backend/routers/settings.py) |
| **Task 3.3** | Subprocess & FFmpeg Timeouts | Implemented explicit timeouts (5s, 10s, 120s, 180s, 300s) and timeout handlers on all FFmpeg/video subprocesses. | [services/ffmpeg_service.py](file:///d:/pipline/backend/services/ffmpeg_service.py), [video_editor_service.py](file:///d:/pipline/backend/services/video_editor_service.py) |
| **Task 3.4** | Exponential Backoff Retries | Added `tenacity` retry decorators (`wait_exponential`, `stop_after_attempt(3)`) to OpenAI, Replicate, Gemini, and ElevenLabs API calls. | [services/openai_service.py](file:///d:/pipline/backend/services/openai_service.py), [services/replicate_service.py](file:///d:/pipline/backend/services/replicate_service.py), [services/gemini_service.py](file:///d:/pipline/backend/services/gemini_service.py), [services/elevenlabs_service.py](file:///d:/pipline/backend/services/elevenlabs_service.py) |
| **Realism Audit** | Elimination of Fake Placeholders | Removed synthetic Pillow card fallback in `mock_service.py`; configured honest error messages; verified Edge-TTS as 100% real Microsoft audio ($0 cost). | [routers/image.py](file:///d:/pipline/backend/routers/image.py), [routers/pipeline.py](file:///d:/pipline/backend/routers/pipeline.py), [services/openai_service.py](file:///d:/pipline/backend/services/openai_service.py), [services/elevenlabs_service.py](file:///d:/pipline/backend/services/elevenlabs_service.py) |
| **Task 4.4** | Boto3 Client Reuse | Built thread-safe singleton `get_r2_client()` with connection pooling, retries, and lazy initialization. | [services/storage_service.py](file:///d:/pipline/backend/services/storage_service.py) |
| **Task 4.5** | Docker Non-Root User | Added dedicated unprivileged users (`appuser` in backend, `nextjs` in frontend) to Dockerfiles. | [backend/Dockerfile](file:///d:/pipline/backend/Dockerfile), [frontend/Dockerfile](file:///d:/pipline/frontend/Dockerfile) |
| **Task 4.6** | Docker Compose Secrets Hardening | Removed inline passwords; enforced `${VAR:?ERROR}` validation pattern with `.env` file separation. | [docker-compose.yml](file:///d:/pipline/docker-compose.yml) |
| **Task 5.1** | Replace Bare `except: pass` | Eliminated untracked `except: pass` blocks across database, routers, and services; replaced with structured logger calls. | All backend routers & services |
| **Task 5.2** | Security Audit Logging | Created append-only NDJSON audit logger (`security_audit.ndjson`) for auth failures, pin attempts, and key updates. | [backend/security_logger.py](file:///d:/pipline/backend/security_logger.py) |
| **Task 5.3** | FFmpeg Filter Input Validation | Validated motion parameters against whitelists (`SAFE_MOTION_TYPES`, `SAFE_TRANSITIONS`) preventing injection. | [services/ffmpeg_service.py](file:///d:/pipline/backend/services/ffmpeg_service.py) |
| **Task 5.5** | Python Test Suite | Created automated test suite covering traversal, CORS, auth, magic bytes, PIN JWT, strict Pydantic models, rate limiting, and realism (13/13 passed). | [backend/tests/run_tests.py](file:///d:/pipline/backend/tests/run_tests.py) |

---

## 🗂️ REMAINING PENDING BACKLOG OVERVIEW

| Phase | Focus Area | Priority | Estimated Effort | Status |
|---|---|---|---|---|
| **Phase 1: Operational** | External Supabase Credential Rotation | 🔴 P0 (External) | 1 hour | Pending user dashboard action |
| **Phase 2: Data Security** | Encrypt API Keys at Rest (Fernet) | 🟠 P1 | 3-4 hours | Ready for implementation |
| **Phase 4: Scalability** | Async Task Queue (Redis/RQ), Concurrency Controls, SQL Analytics | 🟡 P2 | 10-14 hours | Architectural next step |
| **Phase 5: Release QA** | Dependency Pinning (`==`), CI Pipeline Hardening | 🟢 P3 | 2-3 hours | Final release readiness |

---

## ════════════════════════════════════════════════════════
## 🔴 PHASE 1: OPERATIONAL CREDENTIAL HYGIENE
## ════════════════════════════════════════════════════════

### Task 1.1: Rotate Supabase Keys (External Dashboard Action)
- **Target:** Supabase Project `lsttnpynhwtpkzfbfntf`
- **Actions Required:**
  1. Open Supabase Dashboard → Settings → API.
  2. Click **Rotate API keys** for `ANON` key.
  3. If `SERVICE_ROLE` key was ever shared, rotate it as well.
  4. Update `SUPABASE_JWT_SECRET` in `backend/.env`.
  5. Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local` and Hostinger VPS deployment environment.
  6. Optional: Purge sensitive git history using `git-filter-repo` or BFG Repo-Cleaner if keys were in early commits.

---

## ════════════════════════════════════════════════════════
## 🟠 PHASE 2: DATA AT REST HARDENING
## ════════════════════════════════════════════════════════

### Task 2.1: Encrypt API Keys at Rest (Task 2.4 in Original Plan)
- **Files Impacted:**
  - `backend/config.py` (`save_api_keys`)
  - `backend/database.py` (`db_save_setting`, `db_get_all_settings`)
- **Objective:** Prevent plain-text leakage of third-party API keys (OpenAI, ElevenLabs, Replicate, Gemini, R2) if `.env` or the SQLite/Postgres database file is inspected.
- **Implementation Strategy:**
  1. Add `cryptography` (already available via `python-jose[cryptography]`).
  2. Generate a 32-byte master encryption key: `SETTINGS_ENCRYPTION_KEY` via `Fernet.generate_key()`.
  3. Store `SETTINGS_ENCRYPTION_KEY` in environment only.
  4. Encrypt sensitive values with prefix `enc:` before writing to `.env` or `studio_settings` table.
  5. Decrypt `enc:` values transparently when reading settings into the runtime.

---

## ════════════════════════════════════════════════════════
## 🟡 PHASE 4: ARCHITECTURE & SCALABILITY
## ════════════════════════════════════════════════════════

### Task 4.1: Asynchronous Background Job Queue (Task 4.1 in Original Plan)
- **Problem:** Full AI pipelines take up to 2-5 minutes. Running them inside a single synchronous HTTP request causes client timeouts if the connection drops.
- **Target Stack:** Redis + RQ (or Celery)
- **Components to Build:**
  - `backend/worker.py` — Background worker process.
  - `backend/tasks/pipeline_tasks.py` — Background job execution.
  - Modify `routers/pipeline.py`: `POST /api/pipeline/run` enqueues job and returns `job_id` immediately.
  - `GET /api/tasks/{job_id}`: Polling endpoint for progress and artifact URLs.
  - Maintain SSE stream via Redis PubSub for real-time progress.

### Task 4.2: Per-User Concurrency Guard (Task 4.2 in Original Plan)
- **New File:** `backend/concurrency.py`
- **Objective:** Prevent a single user or bot from exhausting server memory and FFmpeg threads.
- **Caps:**
  - Max 1 active full pipeline per user/token.
  - Max 2 concurrent video renders per user/token.
  - Max 4 concurrent image generations per user/token.
- Return `HTTP 429 Too Many Requests` ("Another generation is currently in progress") when limits are exceeded.

### Task 4.3: Migrate Analytics Completely to SQL Table (Task 4.3 in Original Plan)
- **File Impacted:** `backend/services/usage_tracker.py`
- **Objective:** Deprecate `usage_logs.json` file writes; rely exclusively on SQLite / Supabase PostgreSQL `generations` table.
- **Actions:**
  - Remove JSON file I/O locks and file-based read/writes.
  - Aggregate usage stats (`summary`, `history`) using SQL queries with indexes on `created_at` and `service`.

---

## ════════════════════════════════════════════════════════
## 🟢 PHASE 5: DEPENDENCY PINNING & CI WORKFLOW
## ════════════════════════════════════════════════════════

### Task 5.1: Pin Exact Dependency Versions (Task 5.4 in Original Plan)
- **Files Impacted:** `backend/requirements.txt`
- **Objective:** Prevent breaking changes during Docker rebuilds by switching `>=` to exact `==` versions.
- **Action:**
  - Run `pip freeze` or inspect active environment to lock exact versions (FastAPI, Pydantic, Boto3, etc.).
  - Frontend already has `package-lock.json` lockfile.

### Task 5.2: CI Pipeline Hardening (Task 5.6 in Original Plan)
- **File Impacted:** `.github/workflows/deploy.yml`
- **Objective:** Prevent deploying broken or vulnerable code to Hostinger VPS.
- **Add CI Pre-Deploy Steps:**
  1. `pip-audit` to detect known CVEs in Python packages.
  2. `python backend/tests/run_tests.py` to run security and regression tests.
  3. `cd frontend && npm run build` to verify frontend TypeScript compilation before touching the VPS.

---

## 🚀 ACTIVE IMPLEMENTATION CHECKLIST

- [x] Phase 1 Auth Lockdown (JWT, Service Token, Protected Routers)
- [x] Phase 2 Path Traversal & Upload Magic Byte Validation
- [x] Subprocess & FFmpeg Timeouts (180s/300s caps)
- [x] Boto3 Singleton Client Reuse
- [x] Non-Root Docker Users (`appuser`, `nextjs`)
- [x] Structured Security Audit Logging & Exception Cleanup
- [x] **Task 3.1 (P1):** Strict Pydantic Field Validators across all 5 routers
- [x] **Task 3.2 (P1):** API Rate Limiting (`slowapi`) on verify-pin, keys, image & video generate
- [x] **Task 3.3 (P1):** Exponential backoff retries (`tenacity`) on OpenAI, Replicate, Gemini, ElevenLabs
- [x] **Realism Cleanup:** Eliminated synthetic Pillow mock cards; marked Edge-TTS as real Microsoft Neural audio ($0)
- [x] **13/13 Passing Automated Python Test Suite**
- [x] **Next.js 16 Production Build Verified (0 errors across 14 routes)**
- [ ] **Task 2.1 (P1):** Encrypt API keys at rest (`Fernet`)
- [ ] **Task 4.1 (P2):** Background Task Queue (Redis/RQ)
- [ ] **Task 4.2 (P2):** Concurrency limiting
- [ ] **Task 4.3 (P2):** Pure SQL analytics migration
- [ ] **Task 5.1 (P3):** Exact dependency pinning in `requirements.txt`
- [ ] **Task 5.2 (P3):** CI Pre-Deploy verification steps
