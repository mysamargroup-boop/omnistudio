# OmniStudio AI — API Setup Guide

## Overview

OmniStudio ko alag-alag API keys ke saath configure kiya ja sakta hai. Har key ek ya zyada features unlock karti hai. Bina kisi key ke bhi kuch features free mein kaam karte hain.

---

## Free Features (No API Key Required)

| Feature | Engine | Details |
|---|---|---|
| Voice Synthesis (Text-to-Speech) | Edge Neural TTS | Microsoft Edge Neural voices — 100% free, no limits |
| Video Motion (Ken Burns) | FFmpeg 8.1 | Local hardware-accelerated zoom/pan/tilt/orbit effects |
| Keyframe Morph (First+Last Frame) | FFmpeg 8.1 | Dissolve/crossfade between two images — free |
| Motion Transfer | FFmpeg 8.1 | Blend source video motion onto static image — free |
| Image Placeholder | Mock Service | Generates aesthetic gradient placeholder images |
| Asset Vault | Local Filesystem | Browse/manage all generated assets |
| Auto Pipeline | Local FFmpeg | Full storyboard-to-video pipeline (needs OpenAI for prompt enhancement) |
| Translate (Text Only) | Needs OpenAI | Falls back to returning original text without key |

---

## API Keys & What They Unlock

### 1. OpenAI API Key

**Env Variable:** `OPENAI_API_KEY`  
**Get it from:** [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

| Unlocked Feature | Details |
|---|---|
| DALL-E 3 Image Generation | High-quality image synthesis |
| OpenAI TTS (Text-to-Speech) | Voices: Onyx, Alloy, Echo, Nova, Shimmer |
| Hollywood Prompt Expander | GPT-4o-mini powered prompt enhancement |
| AI Director Copilot | Parallel GPT-4o agent for video direction |
| Text Translation | GPT-4o-mini powered translation for Translate/Lip-sync |
| Storyboard Generation | Auto-generates multi-scene storyboards |

**Cost:** Pay-per-use. ~$0.01-0.04 per image, ~$0.015/1K chars for TTS, ~$0.15/1M tokens for GPT-4o-mini

---

### 2. ElevenLabs API Key

**Env Variable:** `ELEVENLABS_API_KEY`  
**Get it from:** [https://elevenlabs.io/settings/api-keys](https://elevenlabs.io/settings/api-keys)

| Unlocked Feature | Details |
|---|---|
| Ultra-Realistic TTS | Industry-leading neural voice synthesis |
| Voice Change (STS) | Speech-to-Speech voice replacement |
| Voice Cloning | Clone voices from audio samples |
| Multilingual Voices | 29+ language support |

**Cost:** Free tier = 10,000 chars/month. Starter plan = $5/mo for 30,000 chars.

---

### 3. Replicate API Token

**Env Variable:** `REPLICATE_API_TOKEN`  
**Get it from:** [https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)

| Unlocked Feature | Details |
|---|---|
| Flux Schnell Image Gen | Fast latent diffusion model from BFL |
| Cloud Video Generation | When cloud video models are configured |

**Cost:** Pay-per-use. ~$0.003 per Flux Schnell image.

---

### 4. Gemini API Key

**Env Variable:** `GEMINI_API_KEY`  
**Get it from:** [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

| Unlocked Feature | Details |
|---|---|
| (Reserved) | For future Gemini-powered features |

**Cost:** Free tier available.

---

### 5. Database (Neon PostgreSQL)

**Env Variable:** `DATABASE_URL`  
**Get it from:** [https://neon.tech](https://neon.tech) — Create a project, copy connection string

| Unlocked Feature | Details |
|---|---|
| Project Management | Save and load projects from database |
| Generation History | Track all image/video/voice generations |
| Director Logs | Persist AI Director Agent decisions |
| Asset Metadata | Searchable asset catalog |

**Cost:** Free tier = 0.5 GB storage, 1 project.

**Without this key:** Uses local SQLite database at `backend/outputs/omnistudio.db`

---

### 6. Cloudflare R2 Storage

**Env Variables:**
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_DOMAIN`

**Get it from:** [https://dash.cloudflare.com](https://dash.cloudflare.com) → R2 Object Storage → Create Bucket → Create API Token

| Unlocked Feature | Details |
|---|---|
| Cloud Asset Storage | Store generated images/videos/audio in the cloud |
| CDN Delivery | Serve assets via Cloudflare's edge network |
| Persistent Storage | Assets survive server restarts / redeployments |

**Cost:** Free tier = 10 GB storage, 10M reads, 1M writes per month.

**Without this key:** All assets stored locally at `backend/outputs/`

---

## Setup Instructions

### Method 1: Settings Page (Recommended)
1. Open OmniStudio in browser → http://localhost:3000
2. Go to **Settings** page (sidebar → BYOK & Settings)
3. Enter API keys in the respective fields
4. Click **Save API Keys**
5. Keys are persisted to `backend/.env` file

### Method 2: Manual .env File
1. Create/edit `d:\pipline\backend\.env`
2. Add keys:
```env
OPENAI_API_KEY=sk-your-key-here
ELEVENLABS_API_KEY=your-key-here
REPLICATE_API_TOKEN=r8_your-token-here
GEMINI_API_KEY=your-key-here
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=omnistudio-assets
R2_PUBLIC_DOMAIN=assets.yourdomain.com
```
3. Restart the backend server

### Method 3: Environment Variables
Set environment variables in your terminal before starting:
```powershell
$env:OPENAI_API_KEY = "sk-your-key-here"
$env:ELEVENLABS_API_KEY = "your-key-here"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Recommended Setup for Best Experience

| Priority | Key | Why |
|---|---|---|
| 1 (Essential) | OpenAI | Unlocks image gen, prompt enhancement, director agent, translation |
| 2 (Recommended) | ElevenLabs | Ultra-realistic voices + voice change feature |
| 3 (Optional) | Replicate | Flux Schnell image alternative |
| 4 (Production) | Neon Database | Persistent project management |
| 5 (Production) | Cloudflare R2 | Cloud asset storage + CDN |
