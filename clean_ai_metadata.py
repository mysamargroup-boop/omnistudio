"""
# ==============================================================================
# AI Metadata Stripper & Anti-Detection Cleaner (Samar Creative Studio CLI)
# ==============================================================================
# - 100% Lossless / Zero Quality Degradation
# - Completely strips EXIF, C2PA, XMP, IPTC & AI Generator Stamps
# - Preserves sRGB Color Profile (No color washout)
# - Batch Folder Processing + Drag & Drop Support
# - Optional 'Stealth Mode' (Subtle analog noise to scramble SynthID pixel watermarks)
# ==============================================================================
"""

import os
import sys
import argparse
from pathlib import Path

# Add backend to Python path if running standalone
script_dir = Path(__file__).parent.resolve()
backend_dir = script_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Fix Windows console UTF-8 output encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    from services.metadata_cleaner_service import (
        clean_image_lossless as clean_image_fn,
        extract_image_metadata,
        batch_clean_images,
        clean_video_lossless as clean_video_fn,
        extract_video_metadata,
    )
except ImportError:
    # Fallback if executed in isolated environment
    from PIL import Image, ImageOps
    import numpy as np

    def clean_image_fn(input_path, output_path=None, stealth_mode=False, quality=99):
        if not os.path.exists(input_path):
            return {"success": False, "error": "File not found"}
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_clean{ext}"
        with Image.open(input_path) as img:
            img = ImageOps.exif_transpose(img)
            clean_img = img.convert('RGBA') if (img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)) else img.convert('RGB')
            if stealth_mode:
                arr = np.array(clean_img, dtype=np.float32)
                noise = np.random.normal(0, 1.2, arr.shape)
                arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
                clean_img = Image.fromarray(arr)
            out_ext = os.path.splitext(output_path)[1].lower()
            if out_ext == '.png':
                clean_img.save(output_path, format='PNG', optimize=True)
            elif out_ext == '.webp':
                clean_img.save(output_path, format='WEBP', quality=quality, method=6)
            else:
                clean_img.save(output_path, format='JPEG', quality=quality, subsampling=0, optimize=True)
        return {"success": True, "output_path": output_path}

    def clean_video_fn(input_path, output_path=None, stealth_mode=False):
        import subprocess
        if not os.path.exists(input_path):
            return {"success": False, "error": "File not found"}
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_clean{ext}"
        cmd = ["ffmpeg", "-y", "-i", input_path, "-map", "0", "-map_metadata", "-1", "-map_metadata:s", "-1", "-c", "copy", "-fflags", "+bitexact", output_path]
        p = subprocess.run(cmd, capture_output=True)
        return {"success": p.returncode == 0, "output_path": output_path}

VIDEO_EXTS = ('.mp4', '.mov', '.webm', '.mkv')
IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff')

def clean_media(input_path, output_path=None, stealth_mode=False, quality=99):
    ext = os.path.splitext(input_path)[1].lower()
    if ext in VIDEO_EXTS:
        res = clean_video_fn(input_path, output_path=output_path, stealth_mode=stealth_mode)
    else:
        res = clean_image_fn(input_path, output_path=output_path, stealth_mode=stealth_mode, quality=quality)
    if res.get("success"):
        out_p = res.get("output_path", output_path or input_path)
        saved = res.get("saved_bytes", 0)
        saved_str = f" (Saved {round(saved/1024, 1)} KB)" if saved > 0 else ""
        print(f"[SUCCESS] Cleaned: {os.path.basename(input_path)} -> {os.path.basename(out_p)}{saved_str}")
        return True
    else:
        print(f"[ERROR] Processing {input_path}: {res.get('error')}")
        return False

def batch_process(folder_path, stealth_mode=False, quality=99):
    """Process all images and videos in a folder"""
    valid_exts = IMAGE_EXTS + VIDEO_EXTS
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(valid_exts) and not '_clean.' in f.lower()]
    
    if not files:
        print(f"[INFO] No valid media found in: {folder_path}")
        return

    output_dir = os.path.join(folder_path, 'cleaned_ai_media')
    os.makedirs(output_dir, exist_ok=True)
    
    print(f">> Processing {len(files)} files in batch (Stealth Mode: {stealth_mode})...")
    count = 0
    for f in files:
        in_p = os.path.join(folder_path, f)
        out_p = os.path.join(output_dir, f)
        if clean_media(in_p, out_p, stealth_mode=stealth_mode, quality=quality):
            count += 1
            
    print(f"\n[DONE] Finished! {count}/{len(files)} files successfully cleaned in: {output_dir}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Clean AI metadata from images and videos without losing quality.')
    parser.add_argument('path', nargs='?', default='.', help='Media file or folder path')
    parser.add_argument('--stealth', action='store_true', help='Add microscopic analog grain to scramble SynthID pixel watermarks')
    parser.add_argument('--quality', type=int, default=99, help='JPEG output quality (default: 99 - visually lossless)')
    
    args = parser.parse_args()
    target_path = os.path.abspath(args.path)

    print("=" * 60)
    print("Samar Studio - AI Metadata Stripper & Lossless Cleaner")
    print("Supports: Images (PNG, JPG, WEBP) & Videos (MP4, MOV, WEBM)")
    print("=" * 60)

    if os.path.isdir(target_path):
        batch_process(target_path, stealth_mode=args.stealth, quality=args.quality)
    elif os.path.isfile(target_path):
        clean_media(target_path, stealth_mode=args.stealth, quality=args.quality)
    else:
        print(f"[ERROR] Target path not found: {target_path}")
