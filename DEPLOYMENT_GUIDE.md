# OmniStudio AI — Production Deployment & Database Architecture Guide

This comprehensive guide explains how to deploy **OmniStudio AI** to production with automated CI/CD, serverless database, zero-egress object storage, and hardware-accelerated video rendering.

---

## 1. Recommended Production Architecture (सर्वश्रेष्ठ आर्किटेक्चर)

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (BROWSER)                     │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     FRONTEND (Vercel)   │ │  BACKEND (Railway/Render)│
│  Next.js 16 + Turbopack │ │  FastAPI + FFmpeg 8.1    │
│  Global Edge CDN        │ │  Docker Container        │
└─────────────────────────┘ └────────────┬────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│     DATABASE (Neon Serverless)  │             │   OBJECT STORAGE (Cloudflare R2)│
│     PostgreSQL 16               │             │   Zero-Egress Bandwidth         │
│     Autoscaling / Branching     │             │   Global CDN Video Hosting      │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Best Cloud Providers for Each Component

### A. Database: **Neon Serverless PostgreSQL** (Recommended)
- **Why Neon?**:
  - **Serverless Autoscaling**: Scales compute to zero when idle (no ongoing cost).
  - **Generous Free Tier**: 0.5 GiB storage and free compute hours with no credit card required.
  - **Instant Branching**: Create isolated database branches for development, staging, and production in 1 second.
  - **Zero Maintenance**: Automatic backups, connection pooling (PgBouncer), and security patches.
- **Connection String Format**:
  ```env
  DATABASE_URL=postgres://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

### B. Media Storage: **Cloudflare R2** (Recommended)
- **Why Cloudflare R2?**:
  - **Zero Egress Fees**: Unlike AWS S3 (which charges \$0.09/GB every time a user streams or downloads a video), Cloudflare R2 has **\$0 egress bandwidth fees**.
  - **10GB Free Storage**: 10 million free read requests per month.
  - **S3 API Compatible**: Uses standard S3 protocols.

### C. Backend API: **Railway** (or Render)
- **Why Railway?**:
  - **Native Docker + FFmpeg**: Runs the backend `Dockerfile` with official FFmpeg 8.1 pre-installed.
  - **High CPU/Memory**: Supports intensive video compilation and neural voice generation.
  - **Automatic Deployments**: Automatically builds and deploys on every `git push`.
  - **Healthcheck Probes**: Ensures zero-downtime rolling deploys.

### D. Frontend: **Vercel** (or Cloudflare Pages)
- **Why Vercel?**:
  - Creators of Next.js; optimal optimization for Next.js 16 App Router.
  - Instant global CDN edge network.
  - Free automatic SSL certificates and custom domain support.

---

## 3. Step-by-Step Deployment Walkthrough (चरण-दर-चरण सेटअप)

### Step 1: Provision Neon PostgreSQL Database
1. Go to [https://neon.tech](https://neon.tech) and sign up for a free account.
2. Click **Create Project**, name it `omnistudio-db`, and select your nearest region.
3. In the Dashboard, copy your **Connection String** (select `Pooled connection`).
4. (Optional) Run the migration locally to initialize tables:
   ```bash
   python backend/db/init_db.py
   ```
   *Note: If no database URL is provided, the app automatically falls back to local embedded SQLite.*

### Step 2: Create Cloudflare R2 Bucket
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com) $\rightarrow$ **R2 Object Storage**.
2. Click **Create Bucket**, name it `omnistudio-assets`.
3. In **Settings**, note down:
   - `Account ID`
   - Create an API Token with `Object Read & Write` permissions to get `Access Key ID` and `Secret Access Key`.
4. (Optional) Enable **Public Development URL** or connect your custom domain (e.g., `media.yourdomain.com`).

### Step 3: Deploy Backend on Railway
1. Push your repository to GitHub.
2. Go to [https://railway.app](https://railway.app) $\rightarrow$ **New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Select your repository and choose the `backend` directory.
4. Under **Variables**, add the following environment variables:
   ```env
   PORT=8000
   HOST=0.0.0.0
   DATABASE_URL=postgres://user:pass@ep-cool-sample.us-east-2.aws.neon.tech/neondb?sslmode=require
   OPENAI_API_KEY=sk-...
   ELEVENLABS_API_KEY=...
   REPLICATE_API_TOKEN=r8_...
   GEMINI_API_KEY=AIza...
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=omnistudio-assets
   ```
5. Railway will automatically detect the `Dockerfile`, install FFmpeg 8.1, and provide you with a live public URL:
   `https://omnistudio-backend-production.up.railway.app`

### Step 4: Deploy Frontend on Vercel
1. Go to [https://vercel.com](https://vercel.com) $\rightarrow$ **Add New Project**.
2. Import your GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Under **Environment Variables**, set:
   ```env
   NEXT_PUBLIC_API_URL=https://omnistudio-backend-production.up.railway.app
   ```
5. Click **Deploy**. In under 60 seconds, your frontend is live worldwide with SSL.

---

## 4. Automated CI/CD Setup (GitHub Actions)

A pre-configured CI/CD workflow is available in `.github/workflows/deploy.yml`:
- Validates Next.js production builds.
- Tests Python backend startup and database schemas.
- Automatically triggers redeploys whenever you push changes to the `main` branch.

---

## 5. Summary of Configuration Variables

| Variable | Description | Where to Set |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon Serverless PostgreSQL connection string | Backend (`.env` or Railway) |
| `NEXT_PUBLIC_API_URL` | Public URL of your deployed backend | Frontend (Vercel) |
| `OPENAI_API_KEY` | GPT-4o Director Agent & DALL-E 3 | Backend / Settings UI |
| `ELEVENLABS_API_KEY` | Ultra-realistic neural speech | Backend / Settings UI |
| `REPLICATE_API_TOKEN` | Flux Schnell & Cloud Video (Kling/Luma) | Backend / Settings UI |
| `GEMINI_API_KEY` | Google Veo & Gemini Multimodal | Backend / Settings UI |
| `R2_ACCOUNT_ID` | Cloudflare Account Identifier | Backend (`.env` or Railway) |
| `R2_ACCESS_KEY_ID` | Cloudflare S3 Access Key | Backend (`.env` or Railway) |
| `R2_SECRET_ACCESS_KEY` | Cloudflare S3 Secret Key | Backend (`.env` or Railway) |
| `R2_BUCKET_NAME` | Cloudflare R2 Bucket Name | Backend (`.env` or Railway) |
