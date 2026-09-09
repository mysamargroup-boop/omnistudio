import uuid
from pathlib import Path
import edge_tts
from config import settings

AVAILABLE_VOICES = [
    {"id": "en-US-ChristopherNeural", "name": "Christopher (Male - Deep & Authoritative)", "gender": "Male", "lang": "en-US"},
    {"id": "en-US-GuyNeural", "name": "Guy (Male - Natural Storyteller)", "gender": "Male", "lang": "en-US"},
    {"id": "en-US-JennyNeural", "name": "Jenny (Female - Warm & Clear)", "gender": "Female", "lang": "en-US"},
    {"id": "en-US-AriaNeural", "name": "Aria (Female - Expressive & Engaging)", "gender": "Female", "lang": "en-US"},
    {"id": "en-GB-RyanNeural", "name": "Ryan (Male - British Accent)", "gender": "Male", "lang": "en-GB"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia (Female - British Accent)", "gender": "Female", "lang": "en-GB"},
    {"id": "hi-IN-MadhurNeural", "name": "Madhur (Male - Hindi / Indian Accent)", "gender": "Male", "lang": "hi-IN"},
    {"id": "hi-IN-SwaraNeural", "name": "Swara (Female - Hindi / Indian Accent)", "gender": "Female", "lang": "hi-IN"},
]

async def generate_edge_speech(
    text: str,
    voice_id: str = "en-US-ChristopherNeural",
    output_path: Path | str = None
) -> Path:
    """Generate neural speech using edge-tts (Free, zero API key required)"""
    if not output_path:
        filename = f"voice_{uuid.uuid4().hex[:8]}.mp3"
        output_path = settings.AUDIO_PATH / filename
    else:
        output_path = Path(output_path)
        
    communicate = edge_tts.Communicate(text=text, voice=voice_id)
    await communicate.save(str(output_path))
    return output_path

def get_edge_voices():
    return AVAILABLE_VOICES
