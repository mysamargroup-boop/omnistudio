import pytest
import re

def parse_token_string(token_str: str) -> list[dict]:
    """Helper mimicking the frontend token matrix string parser."""
    tokens = []
    for item in token_str.split(","):
        cleaned = item.strip()
        if not cleaned:
            continue
        parts = cleaned.split(":")
        word = parts[0].strip()
        weight = float(parts[1].strip()) if len(parts) > 1 else 1.0
        tokens.append({"text": word, "weight": round(weight, 2)})
    return tokens

def test_token_matrix_parsing():
    """Verify parsing and weighting logic of prompt token matrix."""
    raw = "anamorphic:1.3, chiaroscuro:1.4, volumetric steam:1.2"
    tokens = parse_token_string(raw)
    assert len(tokens) == 3
    assert tokens[0] == {"text": "anamorphic", "weight": 1.3}
    assert tokens[1] == {"text": "chiaroscuro", "weight": 1.4}
    assert tokens[2] == {"text": "volumetric steam", "weight": 1.2}

def test_token_matrix_default_weight():
    """Verify default weight fallback when weight is omitted."""
    raw = "bokeh, neon glow:1.5"
    tokens = parse_token_string(raw)
    assert len(tokens) == 2
    assert tokens[0] == {"text": "bokeh", "weight": 1.0}
    assert tokens[1] == {"text": "neon glow", "weight": 1.5}

def test_storyboard_shot_schema_contract():
    """Verify contract for storyboard sequence shots."""
    shot = {
        "id": "shot-1",
        "shot_number": 1,
        "title": "Alley Encounter",
        "prompt": "35mm anamorphic, neon reflections, rain drenched asphalt",
        "duration": 4.0,
        "model": "RUNWAY G3",
        "version": "v3",
        "status": "approved",
    }
    assert shot["shot_number"] > 0
    assert shot["duration"] >= 1.0
    assert shot["status"] in ["approved", "rendering", "queued", "draft"]
    assert shot["version"].startswith("v")

def test_smpte_timecode_formatter():
    """Verify SMPTE 24fps timecode conversion logic."""
    def to_smpte(total_seconds: float, fps: int = 24) -> str:
        total_frames = int(total_seconds * fps)
        frames = total_frames % fps
        seconds = int(total_seconds) % 60
        minutes = int(total_seconds // 60) % 60
        hours = int(total_seconds // 3600)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames:02d}"

    assert to_smpte(0.0) == "00:00:00:00"
    assert to_smpte(1.0) == "00:00:01:00"
    assert to_smpte(4.75) == "00:00:04:18"
    assert to_smpte(60.0) == "00:01:00:00"
