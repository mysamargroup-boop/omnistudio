import uuid
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from config import settings

THEME_COLORS = [
    ((16, 16, 18), (32, 32, 36)),    # Deep charcoal to steel zinc
    ((12, 12, 14), (26, 26, 30)),    # Obsidian to dark graphite
    ((20, 20, 24), (36, 36, 42)),    # Dark neutral slate
    ((14, 14, 16), (28, 28, 32)),    # Pure neutral dark
]

def generate_mock_image(
    prompt: str,
    width: int = 1280,
    height: int = 720,
    output_path: Path | str = None,
    style: str = "cinematic"
) -> Path:
    """Generate a high-aesthetic local visual card using Pillow when no cloud image key is supplied"""
    if not output_path:
        filename = f"img_{uuid.uuid4().hex[:8]}.png"
        output_path = settings.IMAGES_PATH / filename
    else:
        output_path = Path(output_path)
        
    color_pair = THEME_COLORS[hash(prompt) % len(THEME_COLORS)]
    c1, c2 = color_pair
    
    # Create gradient background
    img = Image.new("RGB", (width, height), c1)
    draw = ImageDraw.Draw(img)
    
    for y in range(height):
        ratio = y / height
        r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
        g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
        b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
        
    # Draw geometric decorative elements
    draw.rounded_rectangle([40, 40, width - 40, height - 40], radius=24, outline=(255, 255, 255, 100), width=3)
    draw.line([(60, 120), (width - 60, 120)], fill=(255, 255, 255, 60), width=2)
    
    # Write title & prompt
    title = "OMNISTUDIO AI // CINEMATIC VISUAL"
    draw.text((70, 70), title, fill=(255, 255, 255))
    
    # Clean text wrapping for prompt
    words = prompt.split()
    lines = []
    curr = ""
    for w in words:
        if len(curr) + len(w) + 1 <= 50:
            curr = f"{curr} {w}".strip()
        else:
            lines.append(curr)
            curr = w
    if curr:
        lines.append(curr)
        
    y_text = height // 2 - (len(lines) * 25)
    for line in lines[:4]:
        draw.text((70, y_text), line, fill=(255, 255, 255))
        y_text += 45
        
    draw.text((70, height - 90), f"Style: {style.upper()} | High Dynamic Range", fill=(180, 180, 190))
    
    img.save(str(output_path), "PNG")
    return output_path
