# OmniStudio AI — Storage & Data Architecture

## Overview

OmniStudio me data aur assets ka flow clearly defined hai. Har generated file ka ek specific location hai, aur metadata database me track hota hai.

---

## Asset Storage (Generated Files)

### Local Filesystem (Default)

Sabhi generated assets `backend/outputs/` directory ke andar organized folders me store hote hain:

```
d:\pipline\backend\outputs\
├── images/          # Generated images (DALL-E 3, Flux, Mock)
│   ├── img_a1b2c3d4.png
│   ├── flux_e5f6g7h8.webp
│   └── upload_i9j0k1l2_photo.jpg
├── videos/          # Generated videos (Ken Burns, Morph, Motion Transfer)
│   ├── motion_m3n4o5p6.mp4
│   ├── morph_q7r8s9t0.mp4
│   ├── mt_u1v2w3x4.mp4
│   └── vc_video_y5z6a7b8.mp4
├── audio/           # Generated voice/audio files
│   ├── edge_c9d0e1f2.mp3
│   ├── openai_g3h4i5j6.mp3
│   ├── vc_k7l8m9n0.mp3
│   └── dub_hi_o1p2q3r4.mp3
├── final/           # Final pipeline output (concatenated videos)
│   └── pipeline_s5t6u7v8.mp4
└── omnistudio.db    # SQLite database (fallback when no Neon PostgreSQL)
```

### Cloud Storage (Cloudflare R2 — Optional)

Jab R2 keys configured hain:
- Generated files **both** local aur R2 me save hote hain
- R2 se CDN-backed public URLs milte hain
- Local files backup ke taur par rehte hain
- Upload/download `services/storage_service.py` handle karta hai

R2 Bucket structure:
```
omnistudio-assets/
├── images/
├── videos/
├── audio/
└── final/
```

---

## Database (Project & Generation Metadata)

### Option A: Local SQLite (Default — No Setup Required)

- **Location:** `d:\pipline\backend\outputs\omnistudio.db`
- **Auto-created** on first run via `db/init_db.py`
- **Zero configuration** — works immediately
- Best for: Development, single-user, small projects

### Option B: Neon Serverless PostgreSQL (Production)

- **Configured via:** `DATABASE_URL` environment variable
- **Connection:** Serverless WebSocket — cold starts in ~100ms
- Best for: Production, multi-device access, data persistence across deployments

### Database Tables

```sql
-- Projects: Top-level creative projects
projects (
    id              UUID PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    status          TEXT DEFAULT 'active',
    metadata        JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
)

-- Assets: All generated files (images, videos, audio)
assets (
    id              UUID PRIMARY KEY,
    project_id      UUID REFERENCES projects(id),
    type            TEXT NOT NULL,       -- 'image', 'video', 'audio', 'final'
    filename        TEXT NOT NULL,
    local_path      TEXT,
    cloud_url       TEXT,               -- R2 CDN URL (if uploaded)
    file_size       BIGINT,
    mime_type       TEXT,
    metadata        JSONB,              -- prompt, model, settings used
    created_at      TIMESTAMP DEFAULT NOW()
)

-- Generations: Detailed log of every generation request
generations (
    id              UUID PRIMARY KEY,
    project_id      UUID REFERENCES projects(id),
    asset_id        UUID REFERENCES assets(id),
    type            TEXT NOT NULL,       -- 'image', 'video', 'voice', 'pipeline'
    model           TEXT,                -- 'dall-e-3', 'flux-schnell', 'edge_tts', etc.
    prompt          TEXT,
    settings        JSONB,              -- All parameters sent to the API
    result          JSONB,              -- API response data
    duration_ms     INTEGER,            -- Processing time
    status          TEXT DEFAULT 'completed',
    created_at      TIMESTAMP DEFAULT NOW()
)

-- Director Logs: AI Director Agent decisions
director_logs (
    id              UUID PRIMARY KEY,
    generation_id   UUID REFERENCES generations(id),
    input_idea      TEXT,
    enhanced_prompt TEXT,
    camera_direction TEXT,
    lighting        TEXT,
    negative_prompt TEXT,
    notes           TEXT,
    model_used      TEXT,
    tokens_used     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
)
```

---

## Data Flow Diagram

```
User Input (Prompt/File)
        │
        ▼
   ┌─────────┐
   │ Frontend │  (Next.js — Port 3000)
   │ React UI │
   └────┬─────┘
        │ HTTP POST (JSON / FormData)
        ▼
   ┌──────────┐
   │ FastAPI   │  (Uvicorn — Port 8000)
   │ Backend   │
   └────┬──────┘
        │
   ┌────┴────────────────────┐
   │    Router Layer         │
   │  /api/image/generate    │
   │  /api/video/generate    │
   │  /api/voice/generate    │
   │  /api/voice/change      │
   │  /api/voice/translate   │
   │  /api/pipeline/run      │
   └────┬────────────────────┘
        │
   ┌────┴────────────────────┐
   │    Service Layer        │
   │  openai_service.py      │──→ OpenAI API (DALL-E 3, TTS, GPT-4o)
   │  replicate_service.py   │──→ Replicate API (Flux Schnell)
   │  ffmpeg_service.py      │──→ Local FFmpeg binary
   │  elevenlabs_service.py  │──→ ElevenLabs API
   │  edgetts_service.py     │──→ Microsoft Edge TTS (free)
   │  director_agent.py      │──→ OpenAI GPT-4o (parallel)
   │  voice_change_service   │──→ ElevenLabs STS API
   │  translate_service.py   │──→ OpenAI GPT-4o-mini
   │  mock_service.py        │──→ Local gradient generator
   └────┬────────────────────┘
        │
   ┌────┴────────────────────┐
   │    Storage Layer        │
   │                         │
   │  Local: outputs/        │──→ backend/outputs/{images,videos,audio,final}/
   │  Cloud: R2 Adapter      │──→ Cloudflare R2 Bucket (optional)
   │  DB: SQLite / Neon      │──→ omnistudio.db or PostgreSQL
   └─────────────────────────┘
```

---

## Upload Flow

Jab user koi file upload karta hai (voice change, motion transfer):

1. **Frontend** — File select via `<input type="file">` or drag-drop
2. **API Call** — `FormData` POST to backend (`/api/voice/change`, `/api/video/upload-source-video`)
3. **Backend** — File saved to `outputs/{audio,videos}/` with unique UUID filename
4. **Processing** — Service processes the file (voice change, motion blend, etc.)
5. **Result** — New output file saved to `outputs/` with `/outputs/...` URL returned
6. **Frontend** — Displays result using `getMediaUrl(result.url)`

---

## Accessing Generated Files

### From Frontend
All files served at: `http://localhost:8000/outputs/{type}/{filename}`
- FastAPI mounts `outputs/` directory as static files
- Frontend uses `getMediaUrl()` to construct full URLs

### From Filesystem
Direct access at: `d:\pipline\backend\outputs\{images,videos,audio,final}\`

### From API
- List all assets: `GET /api/assets/all`
- Delete asset: `DELETE /api/assets/{type}/{filename}`

---

## Backup & Migration

### Local to Cloud Migration
1. Configure R2 keys in Settings
2. Click "Test R2 Bucket" to verify connection
3. New generations automatically upload to R2
4. Existing local files remain accessible

### Database Migration
1. Configure `DATABASE_URL` in Settings
2. Click "Test DB Connection"
3. Tables auto-created on first connection
4. Local SQLite data does NOT auto-migrate — start fresh or write migration script
