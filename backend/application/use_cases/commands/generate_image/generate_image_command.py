from dataclasses import dataclass
from typing import Optional

@dataclass
class GenerateImageCommand:
    prompt: str
    model: str = "dall-e-3"
    size: str = "1792x1024"
    style: str = "cinematic"
    lens: Optional[str] = None
    lighting: Optional[str] = None
