import math
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw

def create_vignette_mask(width: int, height: int, intensity: float) -> Image.Image:
    """Generates a soft vignette mask."""
    mask = Image.new('L', (width, height), 255)
    draw = ImageDraw.Draw(mask)
    # Draw concentric ellipses with decreasing opacity
    steps = int(min(width, height) * 0.5)
    center_x, center_y = width / 2, height / 2
    max_radius_x, max_radius_y = width / 1.5, height / 1.5
    
    # We will just use an overlay method
    for i in range(steps):
        alpha = int(255 * (1 - (i / steps)) * intensity)
        rx = max_radius_x * (i / steps)
        ry = max_radius_y * (i / steps)
        draw.ellipse([center_x - rx, center_y - ry, center_x + rx, center_y + ry], fill=alpha)
    return mask.filter(ImageFilter.GaussianBlur(min(width, height) * 0.1))

def apply_advanced_edits(image_path: str, params: dict, output_path: str) -> str:
    """
    Applies Adobe/Snapseed-level advanced edits.
    Params expect values generally from -100 to 100, where 0 is neutral.
    """
    img = Image.open(image_path).convert("RGB")

    # 1. Transform: Rotate & Flip
    if params.get("rotate", 0) != 0:
        img = img.rotate(-params["rotate"], expand=True, resample=Image.Resampling.BICUBIC)
    if params.get("flip_h"):
        img = ImageOps.mirror(img)
    if params.get("flip_v"):
        img = ImageOps.flip(img)

    # 2. Crop
    crop = params.get("crop") # e.g. [x, y, right, bottom]
    if crop and len(crop) == 4:
        img = img.crop((crop[0], crop[1], crop[2], crop[3]))

    # 3. Exposure / Brightness (-100 to +100)
    exposure = params.get("exposure", 0)
    if exposure != 0:
        factor = 1.0 + (exposure / 100.0)
        img = ImageEnhance.Brightness(img).enhance(max(0.0, factor))

    # 4. Contrast (-100 to +100)
    contrast = params.get("contrast", 0)
    if contrast != 0:
        factor = 1.0 + (contrast / 100.0)
        img = ImageEnhance.Contrast(img).enhance(max(0.0, factor))

    # 5. Saturation (-100 to +100)
    saturation = params.get("saturation", 0)
    if saturation != 0:
        factor = 1.0 + (saturation / 100.0)
        img = ImageEnhance.Color(img).enhance(max(0.0, factor))

    # 6. Temperature & Tint
    temp = params.get("temperature", 0)  # -100 (blue/cold) to 100 (yellow/warm)
    tint = params.get("tint", 0)         # -100 (green) to 100 (magenta)
    if temp != 0 or tint != 0:
        r, g, b = img.split()
        r_factor = 1.0 + (temp / 200.0)
        b_factor = 1.0 - (temp / 200.0)
        g_factor = 1.0 - (tint / 200.0)
        r = r.point(lambda p: min(255, max(0, int(p * r_factor))))
        g = g.point(lambda p: min(255, max(0, int(p * g_factor))))
        b = b.point(lambda p: min(255, max(0, int(p * b_factor))))
        img = Image.merge("RGB", (r, g, b))

    # 7. Shadows & Highlights (Simulated via gamma/curves)
    shadows = params.get("shadows", 0)
    highlights = params.get("highlights", 0)
    if shadows != 0 or highlights != 0:
        def curve(p):
            # Shadows adjust lower end, highlights adjust upper end
            fp = p / 255.0
            # boost shadows: curve lifts lower midtones
            if shadows > 0:
                fp = fp + (shadows/100.0) * (fp * (1-fp))
            elif shadows < 0:
                fp = fp + (shadows/100.0) * (fp * (1-fp))
                
            if highlights > 0:
                fp = fp + (highlights/100.0) * (fp * fp)
            elif highlights < 0:
                fp = fp + (highlights/100.0) * (fp * fp * fp)
            return min(255, max(0, int(fp * 255)))
        img = img.point(curve)

    # 8. Sharpness (-100 to +100)
    sharpness = params.get("sharpness", 0)
    if sharpness != 0:
        factor = 1.0 + (sharpness / 100.0)
        img = ImageEnhance.Sharpness(img).enhance(max(0.0, factor))

    # 9. Blur / Bokeh
    blur = params.get("blur", 0)
    if blur > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur / 10.0))

    # 10. Vignette
    vignette = params.get("vignette", 0) # 0 to 100
    if vignette > 0:
        # A simple mathematical vignette mask
        w, h = img.size
        mask = Image.new('L', (w, h), 0)
        draw = ImageDraw.Draw(mask)
        # We fill mask with a radial gradient representing the darkness
        x0, y0 = w / 2, h / 2
        max_dist = math.sqrt(x0*x0 + y0*y0)
        
        # Overlay black using a pre-calculated mask image
        # Because pixel iteration is slow in pure python, we'll use a hack:
        # Draw a huge soft ellipse of white, on a black background
        black_bg = Image.new('RGB', (w, h), (0, 0, 0))
        white_ellipse = Image.new('L', (w, h), 0)
        e_draw = ImageDraw.Draw(white_ellipse)
        padding_x = w * (0.1 + (100 - vignette) / 200.0)
        padding_y = h * (0.1 + (100 - vignette) / 200.0)
        e_draw.ellipse([padding_x, padding_y, w - padding_x, h - padding_y], fill=255)
        white_ellipse = white_ellipse.filter(ImageFilter.GaussianBlur(min(w, h) * 0.2))
        
        # Composite image
        img = Image.composite(img, black_bg, white_ellipse)

    img.save(output_path, "PNG")
    return output_path
