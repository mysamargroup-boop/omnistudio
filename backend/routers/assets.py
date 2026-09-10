import os
import shutil
import asyncio
from fastapi import APIRouter, Query, HTTPException, Request
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
from limiter import limiter
from config import settings
from services.storage_service import delete_file_from_r2
from database import (
    db_delete_asset, db_set_asset_trashed,
    db_toggle_favorite, db_get_favorites,
    db_get_collections, db_create_collection, db_delete_collection,
    db_add_asset_to_collection, db_remove_asset_from_collection,
    db_get_collection_item_filenames
)

router = APIRouter(prefix="/api/assets", tags=["Asset Vault"])

DIR_MAP = {
    "images": settings.IMAGES_PATH,
    "videos": settings.VIDEOS_PATH,
    "audio": settings.AUDIO_PATH,
    "final": settings.FINAL_PATH
}

TRASH_DIR_MAP = {
    "images": settings.TRASH_PATH / "images",
    "videos": settings.TRASH_PATH / "videos",
    "audio": settings.TRASH_PATH / "audio",
    "final": settings.TRASH_PATH / "final"
}

from pydantic import BaseModel, field_validator

class AssetItem(BaseModel):
    media_type: str
    filename: str

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, v: str) -> str:
        if v not in {"images", "videos", "audio", "final"}:
            raise ValueError("Invalid media_type")
        return v

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("filename cannot be empty")
        return s

class BulkActionRequest(BaseModel):
    items: List[AssetItem]
    permanent: Optional[bool] = False
    from_trash: Optional[bool] = False

    @field_validator("items")
    @classmethod
    def validate_items(cls, v: List[AssetItem]) -> List[AssetItem]:
        if not v:
            raise ValueError("items list cannot be empty")
        if len(v) > 100:
            raise ValueError("Cannot perform bulk action on more than 100 items at once")
        return v

class FavoriteRequest(BaseModel):
    filename: str
    is_favorite: Optional[bool] = None

    @field_validator("filename")
    @classmethod
    def validate_fav_filename(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("filename cannot be empty")
        return s

class CreateCollectionRequest(BaseModel):
    name: str
    description: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def validate_collection_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Collection name cannot be empty")
        if len(s) > 100:
            raise ValueError("Collection name cannot exceed 100 characters")
        return s

class CollectionItemsRequest(BaseModel):
    filenames: List[str]

    @field_validator("filenames")
    @classmethod
    def validate_filenames(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("filenames list cannot be empty")
        return [f.strip() for f in v if f.strip()]

def scan_directory(dir_path: Path, media_type: str, is_trash: bool = False) -> list[dict]:
    files = []
    if not dir_path.exists():
        return files
    for f in sorted(dir_path.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.is_file() and not f.name.startswith("."):
            stat = f.stat()
            url_prefix = f"/outputs/trash/{media_type}" if is_trash else f"/outputs/{media_type}"
            files.append({
                "filename": f.name,
                "url": f"{url_prefix}/{f.name}",
                "local_path": str(f),
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": stat.st_mtime,
                "type": media_type,
                "is_trash": is_trash
            })
    return files

from services.security_service import sanitize_filename

def safe_move_to_trash(media_type: str, filename: str) -> bool:
    try:
        clean_name = sanitize_filename(filename)
    except Exception:
        return False

    src_dir = DIR_MAP.get(media_type)
    dest_dir = TRASH_DIR_MAP.get(media_type)
    if not src_dir or not dest_dir:
        return False
    
    src_file = (src_dir / clean_name).resolve()
    if not src_file.is_relative_to(src_dir.resolve()) or not src_file.exists():
        return False
    
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / clean_name
    shutil.move(str(src_file), str(dest_file))
    db_set_asset_trashed(clean_name, trashed=True)
    return True

def safe_restore_from_trash(media_type: str, filename: str) -> bool:
    try:
        clean_name = sanitize_filename(filename)
    except Exception:
        return False

    src_dir = TRASH_DIR_MAP.get(media_type)
    dest_dir = DIR_MAP.get(media_type)
    if not src_dir or not dest_dir:
        return False
    
    src_file = (src_dir / clean_name).resolve()
    if not src_file.is_relative_to(src_dir.resolve()) or not src_file.exists():
        return False
    
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / clean_name
    shutil.move(str(src_file), str(dest_file))
    db_set_asset_trashed(clean_name, trashed=False)
    return True

async def safe_permanent_delete(media_type: str, filename: str, from_trash: bool = False) -> bool:
    try:
        clean_name = sanitize_filename(filename)
    except Exception:
        return False

    target_dir = TRASH_DIR_MAP.get(media_type) if from_trash else DIR_MAP.get(media_type)
    if not target_dir:
        return False
    
    target_file = (target_dir / clean_name).resolve()
    deleted_local = False
    if target_file.is_relative_to(target_dir.resolve()) and target_file.exists():
        target_file.unlink()
        deleted_local = True
    else:
        # Check alternate directory
        alt_dir = DIR_MAP.get(media_type) if from_trash else TRASH_DIR_MAP.get(media_type)
        if alt_dir:
            alt_file = (alt_dir / clean_name).resolve()
            if alt_file.is_relative_to(alt_dir.resolve()) and alt_file.exists():
                alt_file.unlink()
                deleted_local = True

    # Cloudflare R2 delete
    object_name = f"{media_type}s/{clean_name}"
    await delete_file_from_r2(object_name)

    # Supabase Cloud & SQLite DB delete
    db_delete_asset(filename=clean_name, asset_type=media_type)
    return deleted_local

@router.get("/all")
@limiter.limit("60/minute")
async def get_all_assets(request: Request):
    (
        images, videos, audio, final,
        trash_images, trash_videos, trash_audio, trash_final
    ) = await asyncio.gather(
        asyncio.to_thread(scan_directory, settings.IMAGES_PATH, "images"),
        asyncio.to_thread(scan_directory, settings.VIDEOS_PATH, "videos"),
        asyncio.to_thread(scan_directory, settings.AUDIO_PATH, "audio"),
        asyncio.to_thread(scan_directory, settings.FINAL_PATH, "final"),
        asyncio.to_thread(scan_directory, settings.TRASH_PATH / "images", "images", is_trash=True),
        asyncio.to_thread(scan_directory, settings.TRASH_PATH / "videos", "videos", is_trash=True),
        asyncio.to_thread(scan_directory, settings.TRASH_PATH / "audio", "audio", is_trash=True),
        asyncio.to_thread(scan_directory, settings.TRASH_PATH / "final", "final", is_trash=True),
    )

    total_trash = len(trash_images) + len(trash_videos) + len(trash_audio) + len(trash_final)
    total_trash_bytes = sum(f["size_bytes"] for f in (trash_images + trash_videos + trash_audio + trash_final))

    return {
        "images": images,
        "videos": videos,
        "audio": audio,
        "final": final,
        "total": len(images) + len(videos) + len(audio) + len(final),
        "trash_count": total_trash,
        "trash_bytes": total_trash_bytes
    }

@router.get("/images")
async def get_images():
    return {"files": scan_directory(settings.IMAGES_PATH, "images")}

@router.get("/videos")
async def get_videos():
    return {"files": scan_directory(settings.VIDEOS_PATH, "videos")}

@router.get("/audio")
async def get_audio():
    return {"files": scan_directory(settings.AUDIO_PATH, "audio")}

@router.get("/final")
async def get_final():
    return {"files": scan_directory(settings.FINAL_PATH, "final")}

@router.get("/trash")
async def get_trash_assets():
    trash_images = scan_directory(settings.TRASH_PATH / "images", "images", is_trash=True)
    trash_videos = scan_directory(settings.TRASH_PATH / "videos", "videos", is_trash=True)
    trash_audio = scan_directory(settings.TRASH_PATH / "audio", "audio", is_trash=True)
    trash_final = scan_directory(settings.TRASH_PATH / "final", "final", is_trash=True)

    all_trash = trash_final + trash_videos + trash_images + trash_audio
    return {
        "images": trash_images,
        "videos": trash_videos,
        "audio": trash_audio,
        "final": trash_final,
        "items": all_trash,
        "total": len(all_trash),
        "total_bytes": sum(f["size_bytes"] for f in all_trash)
    }

@router.post("/trash")
@limiter.limit("30/minute")
async def move_to_trash(req: BulkActionRequest, request: Request):
    """Move one or more assets to Trash (soft delete)"""
    trashed = []
    failed = []
    for item in req.items:
        ok = safe_move_to_trash(item.media_type, item.filename)
        if ok:
            trashed.append(item.filename)
        else:
            failed.append(item.filename)
    return {
        "success": True,
        "trashed_count": len(trashed),
        "trashed": trashed,
        "failed": failed
    }

@router.post("/restore")
@limiter.limit("30/minute")
async def restore_from_trash(req: BulkActionRequest, request: Request):
    """Restore one or more assets from Trash back to active vault"""
    restored = []
    failed = []
    for item in req.items:
        ok = safe_restore_from_trash(item.media_type, item.filename)
        if ok:
            restored.append(item.filename)
        else:
            failed.append(item.filename)
    return {
        "success": True,
        "restored_count": len(restored),
        "restored": restored,
        "failed": failed
    }

@router.post("/bulk-delete")
@limiter.limit("20/minute")
async def bulk_delete_assets(req: BulkActionRequest, request: Request):
    """Bulk delete assets: soft-delete to trash or permanent destruction"""
    processed = []
    failed = []
    for item in req.items:
        if req.permanent:
            ok = await safe_permanent_delete(item.media_type, item.filename, from_trash=bool(req.from_trash))
        else:
            ok = safe_move_to_trash(item.media_type, item.filename)
        if ok:
            processed.append(item.filename)
        else:
            failed.append(item.filename)
    return {
        "success": True,
        "permanent": req.permanent,
        "count": len(processed),
        "processed": processed,
        "failed": failed
    }

@router.delete("/trash/empty")
@limiter.limit("10/minute")
async def empty_trash(request: Request):
    """Permanently delete all assets inside the Trash directory"""
    purged = []
    for media_type, trash_dir in TRASH_DIR_MAP.items():
        if trash_dir.exists():
            for f in list(trash_dir.iterdir()):
                if f.is_file() and not f.name.startswith("."):
                    filename = f.name
                    f.unlink()
                    object_name = f"{media_type}s/{filename}"
                    await delete_file_from_r2(object_name)
                    db_delete_asset(filename=filename, asset_type=media_type)
                    purged.append(filename)
    return {
        "success": True,
        "purged_count": len(purged),
        "purged": purged
    }

@router.delete("/{media_type}/{filename}")
@limiter.limit("30/minute")
async def delete_asset(
    media_type: str,
    filename: str,
    request: Request,
    permanent: bool = Query(False),
    from_trash: bool = Query(False)
):
    """Delete an individual asset: either soft-move to Trash or permanent destruction"""
    if permanent or from_trash:
        ok = await safe_permanent_delete(media_type, filename, from_trash=from_trash)
        if ok:
            return {"success": True, "deleted": filename, "permanent": True}
        return {"success": False, "error": "File not found"}
    else:
        ok = safe_move_to_trash(media_type, filename)
        if ok:
            return {"success": True, "trashed": filename, "permanent": False}
        return {"success": False, "error": "File not found or could not move to trash"}

# ─── Favorites Endpoints ───

@router.get("/favorites")
async def get_favorites():
    """Retrieve all favorited asset filenames"""
    favs = db_get_favorites()
    return {"success": True, "favorites": favs}

@router.post("/favorite")
async def toggle_favorite(req: FavoriteRequest):
    """Toggle or set favorite status for an asset"""
    new_status = db_toggle_favorite(req.filename, req.is_favorite)
    return {"success": True, "filename": req.filename, "is_favorite": new_status}

# ─── Collections Endpoints ───

@router.get("/collections")
async def get_collections():
    """List all asset collections with item counts"""
    cols = db_get_collections()
    return {"success": True, "collections": cols}

@router.post("/collections")
async def create_collection(req: CreateCollectionRequest):
    """Create a new collection"""
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Collection name cannot be empty")
    col = db_create_collection(req.name.strip(), req.description or "")
    return {"success": True, "collection": col}

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a collection"""
    ok = db_delete_collection(collection_id)
    return {"success": ok}

@router.get("/collections/{collection_id}/items")
async def get_collection_items(collection_id: str):
    """Get all asset filenames belonging to a collection"""
    items = db_get_collection_item_filenames(collection_id)
    return {"success": True, "collection_id": collection_id, "filenames": items}

@router.post("/collections/{collection_id}/items")
async def add_items_to_collection(collection_id: str, req: CollectionItemsRequest):
    """Add one or more assets to a collection"""
    added = []
    for fn in req.filenames:
        if db_add_asset_to_collection(collection_id, fn):
            added.append(fn)
    return {"success": True, "added_count": len(added), "filenames": added}

@router.delete("/collections/{collection_id}/items/{filename}")
async def remove_item_from_collection(collection_id: str, filename: str):
    """Remove an asset from a collection"""
    ok = db_remove_asset_from_collection(collection_id, filename)
    return {"success": ok, "filename": filename}
