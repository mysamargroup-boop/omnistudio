import os
from pathlib import Path
from typing import Optional
from config import settings

def is_r2_configured() -> bool:
    return bool(
        settings.R2_ACCESS_KEY_ID and
        settings.R2_SECRET_ACCESS_KEY and
        settings.R2_ACCOUNT_ID and
        settings.R2_BUCKET_NAME
    )

async def upload_file_to_r2(local_path: Path | str, object_name: str, content_type: str = "application/octet-stream") -> dict:
    """
    Upload media to Cloudflare R2 (S3-compatible, zero egress fees!).
    Falls back to local file URL if R2 is not configured.
    """
    local_file = Path(local_path)
    if not local_file.exists():
        return {"success": False, "error": f"File not found: {local_path}"}

    if is_r2_configured():
        try:
            import boto3
            endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
            s3 = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name="auto"
            )
            
            s3.upload_file(
                str(local_file),
                settings.R2_BUCKET_NAME,
                object_name,
                ExtraArgs={"ContentType": content_type}
            )

            # Public or CDN URL
            public_domain = settings.R2_PUBLIC_DOMAIN or f"https://{settings.R2_BUCKET_NAME}.r2.dev"
            public_url = f"{public_domain.rstrip('/')}/{object_name}"

            return {
                "success": True,
                "provider": "Cloudflare R2",
                "object_name": object_name,
                "url": public_url,
                "size_bytes": local_file.stat().st_size
            }
        except Exception as e:
            pass

    # Local storage fallback
    return {
        "success": True,
        "provider": "Local Storage Vault",
        "object_name": local_file.name,
        "url": f"/outputs/{local_file.parent.name}/{local_file.name}",
        "local_path": str(local_file),
        "size_bytes": local_file.stat().st_size
    }

async def sync_and_save_asset(local_path: Path | str, asset_type: str, metadata: Optional[dict] = None) -> dict:
    """
    1. Uploads to Cloudflare R2 if configured (zero egress CDN).
    2. Dual-writes asset record to Supabase Cloud & SQLite assets table.
    """
    import uuid
    import mimetypes
    local_file = Path(local_path)
    if not local_file.exists():
        return {"success": False, "error": f"File not found: {local_path}"}

    mime_type, _ = mimetypes.guess_type(str(local_file))
    mime_type = mime_type or ("image/png" if asset_type == "image" else ("video/mp4" if asset_type == "video" else "audio/mpeg"))

    object_name = f"{asset_type}s/{local_file.name}"
    upload_res = await upload_file_to_r2(local_file, object_name, content_type=mime_type)

    asset_id = f"asset_{uuid.uuid4().hex[:10]}"
    url = upload_res.get("url", f"/outputs/{local_file.parent.name}/{local_file.name}")
    storage_provider = "cloudflare_r2" if upload_res.get("provider") == "Cloudflare R2" else "local"

    try:
        from database import db_save_asset
        db_save_asset(
            asset_id=asset_id,
            asset_type=asset_type,
            filename=local_file.name,
            url=url,
            local_path=str(local_file),
            storage_provider=storage_provider,
            size_bytes=local_file.stat().st_size,
            mime_type=mime_type,
            metadata=metadata or {}
        )
    except Exception as e:
        print(f"[Asset Sync Warning] {e}")

    return {
        "asset_id": asset_id,
        "url": url,
        "local_path": str(local_file),
        "filename": local_file.name,
        "storage_provider": storage_provider
    }

def test_r2_connection() -> dict:
    """Test Cloudflare R2 bucket connectivity"""
    if not is_r2_configured():
        return {
            "success": False,
            "connected": False,
            "error": "Cloudflare R2 credentials unset (Running on Local Storage Vault)"
        }
    try:
        import boto3
        endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto"
        )
        s3.head_bucket(Bucket=settings.R2_BUCKET_NAME)
        return {
            "success": True,
            "connected": True,
            "provider": "Cloudflare R2 (Zero Egress Bandwidth)",
            "bucket": settings.R2_BUCKET_NAME
        }
    except Exception as e:
        return {"success": False, "connected": False, "error": str(e)}

async def delete_file_from_r2(object_name: str) -> bool:
    """Delete an object from Cloudflare R2 bucket"""
    if not is_r2_configured():
        return False
    try:
        import boto3
        endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto"
        )
        s3.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=object_name)
        return True
    except Exception as e:
        print(f"[R2 Delete Warning] Could not delete {object_name}: {e}")
        return False
