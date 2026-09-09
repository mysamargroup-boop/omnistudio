# OmniStudio AI — Personal Advanced Creative Studio

OmniStudio AI is an all-in-one, multi-model AI creative platform built specifically for Personal Power-Use (100% Free, Zero Subscriptions, No Credit Paywalls, No Watermarks).

Combining the best features of InVideo AI, Runway Gen-3, DeepBrain AI Studios, and Descript, it brings image generation, video motion generation, and voiceover together into a single, cohesive workstation.

## Core Features
- Agentic Auto-Pipeline: Topic -> Storyboard -> Image Generation -> Video Motion -> Voiceover -> Master Movie (FFmpeg 8.1)
- Image Studio: Multi-model (DALL-E 3, Flux), AI Prompt Enhancer, Style Presets, Aspect Ratios
- Video Studio: Camera motion controls (Zoom In/Out, Pan Left/Right, Tilt Up/Down, Subtle Float)
- Voice Studio: ElevenLabs, OpenAI TTS, and free Edge Neural TTS (with 100+ voices)
- Asset Vault: Direct access to all local creations on disk
- Settings / BYOK: Bring your own keys with simulation fallback mode

## Quick Start
Double-click: start_studio.bat
Or run manually:
- Backend: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
- Frontend: cd frontend && npm run dev
