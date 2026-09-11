import json
import os
import uuid
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from config import settings

ANALYTICS_DIR = settings.OUTPUTS_PATH / "analytics"
ANALYTICS_DIR.mkdir(parents=True, exist_ok=True)
USAGE_FILE = ANALYTICS_DIR / "usage_logs.json"
LOCK_FILE = ANALYTICS_DIR / "usage_logs.lock"

USD_TO_INR = 83.50

class _FileLock:
    """Simple cross-platform file lock using exclusive directory creation.

    os.mkdir is atomic on POSIX and on Windows NTFS, so using a lock
    directory is portable and avoids a dependency on ``portalocker``.
    """

    def __init__(self, lock_path: Path, timeout: float = 10.0, poll: float = 0.05):
        self.lock_path = Path(lock_path)
        self.timeout = timeout
        self.poll = poll
        self._acquired = False

    def __enter__(self):
        import time
        deadline = time.time() + self.timeout
        while True:
            try:
                self.lock_path.mkdir(parents=False, exist_ok=False)
                self._acquired = True
                return self
            except FileExistsError:
                if time.time() >= deadline:
                    try:
                        self.lock_path.rmdir()
                    except OSError:
                        pass
                    raise RuntimeError(f"Could not acquire usage-data lock within {self.timeout}s")
                time.sleep(self.poll)

    def __exit__(self, exc_type, exc, tb):
        if self._acquired:
            try:
                self.lock_path.rmdir()
            except OSError:
                pass
            self._acquired = False


def usage_lock():
    return _FileLock(LOCK_FILE)

OFFICIAL_RATE_CARDS = [
    # ─── GOOGLE AI STUDIO / GEMINI ───
    {
        "provider": "Google AI Studio",
        "model": "Gemini 2.5 Flash Image",
        "category": "Image Generation",
        "unit": "Per Image",
        "cost_usd": 0.030,
        "cost_inr": round(0.030 * USD_TO_INR, 2),
        "free_tier": "Pay-As-You-Go required",
        "billing_mechanism": "Single API call with responseModalities: ['IMAGE']. Charges approx $0.03 per synthesized image directly against your Google Cloud / AI Studio project.",
        "official_url": "https://ai.google.dev/pricing",
        "status": "active"
    },
    {
        "provider": "Google AI Studio",
        "model": "Google Imagen 3 (DeepMind)",
        "category": "Image Generation",
        "unit": "Per Image",
        "cost_usd": 0.035,
        "cost_inr": round(0.035 * USD_TO_INR, 2),
        "free_tier": "Pay-As-You-Go required",
        "billing_mechanism": "High-fidelity photorealism engine. Charges $0.03 to $0.04 per generated image depending on aspect ratio and step count.",
        "official_url": "https://ai.google.dev/pricing",
        "status": "supported"
    },
    {
        "provider": "Google AI Studio",
        "model": "Google Veo 3.1 (Fast Preview)",
        "category": "Video Generation",
        "unit": "Per Second",
        "cost_usd": 0.150,
        "cost_inr": round(0.150 * USD_TO_INR, 2),
        "free_tier": "No free tier (Active billing only)",
        "billing_mechanism": "Billed based on generated video length ($0.15/sec). A standard 4-second preview video costs ~$0.60 (₹50.10).",
        "official_url": "https://ai.google.dev/pricing",
        "status": "active"
    },
    {
        "provider": "Google AI Studio",
        "model": "Google Veo 3.1 (Standard HD / 4K)",
        "category": "Video Generation",
        "unit": "Per Second",
        "cost_usd": 0.450,
        "cost_inr": round(0.450 * USD_TO_INR, 2),
        "free_tier": "No free tier (Active billing only)",
        "billing_mechanism": "High-motion 1080p/4K cinematic video. Billed at ~$0.40 to $0.50 per second. A 4-second shot costs ~$1.80 (₹150.30).",
        "official_url": "https://ai.google.dev/pricing",
        "status": "supported"
    },
    {
        "provider": "Google AI Studio",
        "model": "Gemini 2.5 / 1.5 Flash (Text/Prompt)",
        "category": "LLM & Prompt Enhancer",
        "unit": "Per 1M Tokens",
        "cost_usd": 0.075,
        "cost_inr": round(0.075 * USD_TO_INR, 2),
        "free_tier": "15 RPM Free Tier available",
        "billing_mechanism": "Input: $0.075 / 1M tokens, Output: $0.30 / 1M tokens. Extremely cheap; prompt expansion costs less than 1 paisa (₹0.005) per prompt.",
        "official_url": "https://ai.google.dev/pricing",
        "status": "active"
    },

    # ─── OPENAI ───
    {
        "provider": "OpenAI",
        "model": "DALL-E 3 Standard (1024x1024)",
        "category": "Image Generation",
        "unit": "Per Image",
        "cost_usd": 0.040,
        "cost_inr": round(0.040 * USD_TO_INR, 2),
        "free_tier": "No free tier (Prepaid credit required)",
        "billing_mechanism": "Flat $0.040 per generated square image. Deducted from prepaid credit balance in your OpenAI Project.",
        "official_url": "https://openai.com/api/pricing",
        "status": "active"
    },
    {
        "provider": "OpenAI",
        "model": "DALL-E 3 HD (1792x1024 / 1024x1792)",
        "category": "Image Generation",
        "unit": "Per Image",
        "cost_usd": 0.080,
        "cost_inr": round(0.080 * USD_TO_INR, 2),
        "free_tier": "No free tier (Prepaid credit required)",
        "billing_mechanism": "High-Definition 16:9 widescreen or 9:16 portrait. Billed at $0.080 per image (~₹6.68) directly to project credit balance.",
        "official_url": "https://openai.com/api/pricing",
        "status": "active"
    },
    {
        "provider": "OpenAI",
        "model": "GPT-4o / Director Agent",
        "category": "AI Cinema Director",
        "unit": "Per 1M Tokens",
        "cost_usd": 2.500,
        "cost_inr": round(2.500 * USD_TO_INR, 2),
        "free_tier": "No free tier",
        "billing_mechanism": "Input: $2.50 / 1M, Output: $10.00 / 1M. For script breakdown and scene direction, average cost is ~$0.004 (₹0.33) per script.",
        "official_url": "https://openai.com/api/pricing",
        "status": "active"
    },
    {
        "provider": "OpenAI",
        "model": "OpenAI TTS-1 (Standard)",
        "category": "Voice Synthesis",
        "unit": "Per 1,000 Characters",
        "cost_usd": 0.015,
        "cost_inr": round(0.015 * USD_TO_INR, 2),
        "free_tier": "No free tier",
        "billing_mechanism": "Billed at $0.015 per 1,000 characters (~150 words). A standard voiceover snippet costs ~$0.003 to $0.007 (₹0.25 to ₹0.58).",
        "official_url": "https://openai.com/api/pricing",
        "status": "active"
    },
    {
        "provider": "OpenAI",
        "model": "OpenAI TTS-1 HD",
        "category": "Voice Synthesis",
        "unit": "Per 1,000 Characters",
        "cost_usd": 0.030,
        "cost_inr": round(0.030 * USD_TO_INR, 2),
        "free_tier": "No free tier",
        "billing_mechanism": "High fidelity audio stream. Billed at $0.030 per 1,000 characters (~₹2.50).",
        "official_url": "https://openai.com/api/pricing",
        "status": "active"
    },

    # ─── REPLICATE / FLUX ───
    {
        "provider": "Black Forest Labs / Replicate",
        "model": "Flux.1 Schnell (Fast Latent)",
        "category": "Image Generation",
        "unit": "Per Image",
        "cost_usd": 0.003,
        "cost_inr": round(0.003 * USD_TO_INR, 2),
        "free_tier": "Free trial tier on signup",
        "billing_mechanism": "Ultra-fast 4-step diffusion. Costs just $0.003 per image (~25 paise / ₹0.25). 10x cheaper than DALL-E 3.",
        "official_url": "https://replicate.com/black-forest-labs/flux-schnell",
        "status": "supported"
    },
    {
        "provider": "Black Forest Labs / Replicate",
        "model": "Flux.1 Dev",
        "category": "Image Generation",
        "unit": "Per Image",
        "cost_usd": 0.025,
        "cost_inr": round(0.025 * USD_TO_INR, 2),
        "free_tier": "Replicate credit tier",
        "billing_mechanism": "High aesthetic adherence & typography. Billed per second of GPU runtime (~$0.025 to $0.03 per image).",
        "official_url": "https://replicate.com/black-forest-labs/flux-dev",
        "status": "supported"
    },
    {
        "provider": "Black Forest Labs / Replicate",
        "model": "Flux.1 Pro",
        "category": "Image Generation",
        "unit": "Per Image",
        "cost_usd": 0.050,
        "cost_inr": round(0.050 * USD_TO_INR, 2),
        "free_tier": "None",
        "billing_mechanism": "Commercial studio grade diffusion. Flat $0.050 per generation (~₹4.18).",
        "official_url": "https://replicate.com/black-forest-labs/flux-1.1-pro",
        "status": "supported"
    },

    # ─── ELEVENLABS ───
    {
        "provider": "ElevenLabs",
        "model": "Eleven Multilingual v2 / v3",
        "category": "Voice & STS",
        "unit": "Per 1,000 Characters",
        "cost_usd": 0.200,
        "cost_inr": round(0.200 * USD_TO_INR, 2),
        "free_tier": "10,000 characters/month FREE",
        "billing_mechanism": "Character consumption model. Starter plan gives 30,000 chars for $5/mo. Overage is ~$0.15 - $0.30 per 1,000 chars.",
        "official_url": "https://elevenlabs.io/pricing",
        "status": "active"
    },

    # ─── LOCAL ZERO-COST HARDWARE ENGINES ───
    {
        "provider": "Local Hardware (In-House)",
        "model": "OmniStudio Camera Motion (FFmpeg 8.1)",
        "category": "Video Motion",
        "unit": "Unlimited",
        "cost_usd": 0.000,
        "cost_inr": 0.00,
        "free_tier": "100% Free & Unlimited",
        "billing_mechanism": "Runs 100% on your local CPU/GPU using hardware acceleration. Zero cloud bills, zero API keys required.",
        "official_url": "https://ffmpeg.org",
        "status": "active"
    },
    {
        "provider": "Microsoft Edge Neural (Local)",
        "model": "Edge Neural TTS (Multi-Language)",
        "category": "Voice Synthesis",
        "unit": "Unlimited",
        "cost_usd": 0.000,
        "cost_inr": 0.00,
        "free_tier": "100% Free & Unlimited",
        "billing_mechanism": "Synthesized via Microsoft Edge Cloud Service with zero API key required. High fidelity neural voices at ₹0 cost.",
        "official_url": "https://azure.microsoft.com/services/cognitive-services/text-to-speech/",
        "status": "active"
    }
]

def load_usage_data() -> Dict[str, Any]:
    with usage_lock():
        if not USAGE_FILE.exists():
            initial = {
                "version": "1.0",
                "last_updated": datetime.utcnow().isoformat(),
                "records": []
            }
            _atomic_write_usage(initial)
            return initial
        try:
            with open(USAGE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"version": "1.0", "last_updated": datetime.utcnow().isoformat(), "records": []}


def _atomic_write_usage(data: Dict[str, Any]) -> None:
    """Write usage data atomically using temp file + replace pattern."""
    tmp_dir = USAGE_FILE.parent
    tmp_fd, tmp_path = tempfile.mkstemp(prefix=".usage_", suffix=".tmp", dir=str(tmp_dir))
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as tmp_f:
            json.dump(data, tmp_f, indent=2, ensure_ascii=False)
            tmp_f.flush()
            try:
                os.fsync(tmp_f.fileno())
            except OSError:
                pass
        os.replace(tmp_path, USAGE_FILE)
    except Exception:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except OSError:
            pass
        raise


def save_usage_data(data: Dict[str, Any]):
    data["last_updated"] = datetime.utcnow().isoformat()
    with usage_lock():
        _atomic_write_usage(data)

def calculate_spend(
    service_type: str,
    provider: str,
    model: str,
    specs: Optional[Dict[str, Any]] = None
) -> tuple[float, float, float]:
    """
    Returns: (cost_usd, cost_inr, saved_usd)
    saved_usd is money saved compared to traditional commercial cloud costs.
    """
    specs = specs or {}
    cost_usd = 0.0
    saved_usd = 0.0

    if service_type == "image":
        if "gemini" in model.lower() or "imagen" in model.lower():
            cost_usd = 0.030
        elif "dall-e-3" in model.lower():
            quality = specs.get("quality", "standard")
            cost_usd = 0.080 if quality in ["hd", "ultra"] else 0.040
        elif "flux-schnell" in model.lower():
            cost_usd = 0.003
        elif "flux-dev" in model.lower():
            cost_usd = 0.025
        elif "flux" in model.lower():
            cost_usd = 0.050
        else:
            cost_usd = 0.030

    elif service_type == "video":
        duration = float(specs.get("duration", 4.0))
        if "ffmpeg" in model.lower() or "local" in model.lower():
            cost_usd = 0.000
            saved_usd = duration * 0.150
        elif "veo" in model.lower():
            cost_usd = duration * 0.150
        elif "kling" in model.lower() or "runway" in model.lower():
            cost_usd = duration * 0.200
        else:
            cost_usd = 0.000
            saved_usd = duration * 0.150

    elif service_type == "voice":
        char_count = int(specs.get("characters", 100))
        if "edge" in model.lower():
            cost_usd = 0.000
            saved_usd = (char_count / 1000.0) * 0.200
        elif "eleven" in model.lower():
            cost_usd = (char_count / 1000.0) * 0.200
        elif "openai" in model.lower():
            cost_usd = (char_count / 1000.0) * 0.015
        else:
            cost_usd = 0.000

    elif service_type == "pipeline":
        num_scenes = int(specs.get("scenes", 3))
        image_spend = num_scenes * 0.030
        cost_usd = round(image_spend + 0.004, 3)
        saved_usd = round(num_scenes * 4.0 * 0.150 + 0.050, 3)

    cost_inr = round(cost_usd * USD_TO_INR, 2)
    return round(cost_usd, 4), cost_inr, round(saved_usd, 4)

def log_generation(
    service_type: str,
    provider: str,
    model: str,
    prompt: str = "",
    status: str = "success",
    specs: Optional[Dict[str, Any]] = None,
    output_url: str = "",
    error: Optional[str] = None
) -> Dict[str, Any]:
    """Logs a single generation event to persistent storage."""
    specs = specs or {}
    cost_usd, cost_inr, saved_usd = calculate_spend(service_type, provider, model, specs)

    record = {
        "id": f"gen_{uuid.uuid4().hex[:10]}",
        "timestamp": datetime.utcnow().isoformat(),
        "display_time": datetime.now().strftime("%d %b, %I:%M %p"),
        "service_type": service_type,
        "provider": provider,
        "model": model,
        "prompt": (prompt[:220] + "...") if len(prompt) > 220 else prompt,
        "full_prompt": prompt,
        "specs": specs,
        "cost_usd": cost_usd,
        "cost_inr": cost_inr,
        "saved_usd": saved_usd,
        "saved_inr": round(saved_usd * USD_TO_INR, 2),
        "status": status,
        "output_url": output_url,
        "error": error
    }

    data = load_usage_data()
    data["records"].insert(0, record)
    if len(data["records"]) > 1000:
        data["records"] = data["records"][:1000]
    save_usage_data(data)

    # Dual-write to Supabase Cloud & local SQLite
    try:
        from database import db_save_generation
        db_save_generation(
            generation_id=record["id"],
            service_type=service_type,
            provider=provider,
            model_used=model,
            output_url=output_url,
            prompt=prompt,
            cost_usd=cost_usd,
            cost_inr=cost_inr,
            saved_usd=saved_usd,
            status=status,
            parameters=specs,
            error_message=error
        )
    except Exception as db_err:
        print(f"[Database Sync Warning] {db_err}")

    return record

def get_usage_summary() -> Dict[str, Any]:
    data = load_usage_data()
    records = data.get("records", [])

    total_generations = len(records)
    total_spend_usd = sum(r.get("cost_usd", 0.0) for r in records if r.get("status") == "success")
    total_saved_usd = sum(r.get("saved_usd", 0.0) for r in records if r.get("status") == "success")

    by_service = {
        "image": {"count": 0, "spend_usd": 0.0},
        "video": {"count": 0, "spend_usd": 0.0},
        "voice": {"count": 0, "spend_usd": 0.0},
        "pipeline": {"count": 0, "spend_usd": 0.0}
    }

    by_provider = {}

    for r in records:
        st = r.get("service_type", "other")
        if st in by_service:
            by_service[st]["count"] += 1
            if r.get("status") == "success":
                by_service[st]["spend_usd"] += r.get("cost_usd", 0.0)

        prov = r.get("provider", "other")
        if prov not in by_provider:
            by_provider[prov] = {"count": 0, "spend_usd": 0.0}
        by_provider[prov]["count"] += 1
        if r.get("status") == "success":
            by_provider[prov]["spend_usd"] += r.get("cost_usd", 0.0)

    for st in by_service:
        by_service[st]["spend_usd"] = round(by_service[st]["spend_usd"], 3)
        by_service[st]["spend_inr"] = round(by_service[st]["spend_usd"] * USD_TO_INR, 2)

    for prov in by_provider:
        by_provider[prov]["spend_usd"] = round(by_provider[prov]["spend_usd"], 3)
        by_provider[prov]["spend_inr"] = round(by_provider[prov]["spend_usd"] * USD_TO_INR, 2)

    # Model usage tracking
    model_counts: Dict[str, Dict[str, Any]] = {}
    successful_count = 0

    for r in records:
        is_success = r.get("status") == "success"
        if is_success:
            successful_count += 1

        mdl = r.get("model") or "unknown"
        if mdl not in model_counts:
            model_counts[mdl] = {
                "model": mdl,
                "provider": r.get("provider", "local"),
                "service_type": r.get("service_type", "image"),
                "count": 0,
                "success_count": 0
            }
        model_counts[mdl]["count"] += 1
        if is_success:
            model_counts[mdl]["success_count"] += 1

    # Sort top models
    most_used_models = sorted(
        model_counts.values(),
        key=lambda x: x["count"],
        reverse=True
    )[:6]

    success_rate = round((successful_count / total_generations) * 100, 1) if total_generations > 0 else 100.0

    return {
        "total_generations": total_generations,
        "successful_generations": successful_count,
        "failed_generations": total_generations - successful_count,
        "success_rate": success_rate,
        "most_used_models": most_used_models,
        "total_spend_usd": round(total_spend_usd, 3),
        "total_spend_inr": round(total_spend_usd * USD_TO_INR, 2),
        "total_saved_usd": round(total_saved_usd, 3),
        "total_saved_inr": round(total_saved_usd * USD_TO_INR, 2),
        "usd_to_inr": USD_TO_INR,
        "by_service": by_service,
        "by_provider": by_provider,
        "latest_generation": records[0] if records else None
    }

def get_generation_history(limit: int = 50, service_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    data = load_usage_data()
    records = data.get("records", [])
    if service_filter and service_filter != "all":
        records = [r for r in records if r.get("service_type") == service_filter]
    return records[:limit]

def get_rate_cards() -> List[Dict[str, Any]]:
    return OFFICIAL_RATE_CARDS

def clear_history():
    save_usage_data({"version": "1.0", "last_updated": datetime.utcnow().isoformat(), "records": []})
