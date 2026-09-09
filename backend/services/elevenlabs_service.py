import uuid
import httpx
from pathlib import Path
from config import settings
from services.edgetts_service import generate_edge_speech

ELEVEN_DEFAULT_VOICES = [
    {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam (Deep Narrative, Conversational)", "gender": "Male"},
    {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel (Calm, Professional Female)", "gender": "Female"},
    {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni (Warm & Friendly Male)", "gender": "Male"},
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella (Expressive, Creative Female)", "gender": "Female"},
    {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh (Authoritative, Dynamic Male)", "gender": "Male"},
]

async def generate_elevenlabs_speech(
    text: str,
    voice_id: str = "pNInz6obpgDQGcFmaJgB",
    model_id: str = "eleven_multilingual_v2",
    stability: float = 0.5,
    similarity_boost: float = 0.75
) -> dict:
    """Generate ultra-realistic voiceover using ElevenLabs API or fallback to Edge TTS"""
    filename = f"voice_el_{uuid.uuid4().hex[:8]}.mp3"
    local_path = settings.AUDIO_PATH / filename
    
    if not settings.ELEVENLABS_API_KEY:
        # Seamlessly fallback to Edge TTS so generation never fails
        await generate_edge_speech(text, voice_id="en-US-GuyNeural", output_path=local_path)
        return {
            "success": True,
            "simulated": True,
            "filename": filename,
            "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path),
            "model": "Edge Neural Voice (Simulation Mode - Add ElevenLabs Key in Settings)"
        }
        
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": settings.ELEVENLABS_API_KEY
        }
        data = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, headers=headers, timeout=60.0)
            if response.status_code == 200:
                with open(local_path, "wb") as f:
                    f.write(response.content)
                return {
                    "success": True,
                    "simulated": False,
                    "filename": filename,
                    "url": f"/outputs/audio/{filename}",
                    "local_path": str(local_path),
                    "model": f"ElevenLabs ({voice_id[:8]}...)"
                }
            else:
                raise Exception(f"ElevenLabs Error {response.status_code}: {response.text}")
    except Exception as e:
        # Fallback to Edge TTS on error
        await generate_edge_speech(text, voice_id="en-US-GuyNeural", output_path=local_path)
        return {
            "success": True,
            "simulated": True,
            "filename": filename,
            "url": f"/outputs/audio/{filename}",
            "local_path": str(local_path),
            "error": str(e),
            "model": "Edge Neural Voice (Fallback)"
        }

def get_elevenlabs_voices():
    return ELEVEN_DEFAULT_VOICES
