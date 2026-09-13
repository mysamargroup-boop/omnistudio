import os
import time
import json
import sqlite3
import logging
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Any
from contextlib import contextmanager
from config import settings
from services.encryption_service import encrypt_secret, decrypt_secret, is_sensitive_key

db_logger = logging.getLogger("omnistudio.db")

DB_FILE = settings.OUTPUTS_PATH / "omnistudio.db"

def is_supabase() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY and "supabase.co" in settings.SUPABASE_URL)

def is_postgres() -> bool:
    return bool(settings.DATABASE_URL and settings.DATABASE_URL.startswith(("postgres://", "postgresql://")))

def supabase_rest_request(endpoint: str, method: str = "GET", data: Optional[Any] = None) -> dict:
    """Universal PostgREST connector for Supabase cloud tables"""
    if not is_supabase():
        return {"success": False, "error": "Supabase credentials not configured"}
    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/{endpoint}"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
    }
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return {"success": True, "status": resp.status, "data": json.loads(content) if content else []}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_sqlite_conn():
    """Returns a raw SQLite connection. For new code, prefer `with db_session() as conn:`."""
    conn = sqlite3.connect(str(DB_FILE), timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def db_session():
    """Context manager providing a safe, automatically closed SQLite connection."""
    conn = sqlite3.connect(str(DB_FILE), timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception as e:
            db_logger.debug("Error closing SQLite connection: %s", e)

@contextmanager
def get_db_cursor():
    """Context manager providing an active SQLite cursor with automatic commit/rollback."""
    with db_session() as conn:
        cur = conn.cursor()
        try:
            yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise

def init_database():
    """Initialize database tables for SQLite or execute schema on PostgreSQL"""
    if is_postgres():
        try:
            import psycopg2
            conn = psycopg2.connect(settings.DATABASE_URL, sslmode="require", connect_timeout=10)
            try:
                with conn.cursor() as cur:
                    schema_path = Path(__file__).parent / "db" / "schema.sql"
                    if schema_path.exists():
                        with open(schema_path, "r", encoding="utf-8") as f:
                            cur.execute(f.read())
                    conn.commit()
            finally:
                conn.close()
            provider_name = "Supabase PostgreSQL" if "supabase" in settings.DATABASE_URL.lower() else "PostgreSQL"
            return {"success": True, "provider": provider_name, "status": "initialized"}
        except Exception as e:
            db_logger.error("Postgres init error: %s", e)
            return {"success": False, "error": str(e)}
    else:
        # SQLite local initialization
        try:
            with db_session() as conn:
                cur = conn.cursor()
                cur.executescript("""
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    topic TEXT,
                    style TEXT DEFAULT 'cinematic',
                    status TEXT DEFAULT 'completed',
                    scenes_count INTEGER DEFAULT 1,
                    metadata TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS assets (
                    id TEXT PRIMARY KEY,
                    project_id TEXT,
                    asset_type TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    url TEXT NOT NULL,
                    local_path TEXT,
                    storage_provider TEXT DEFAULT 'local',
                    size_bytes INTEGER DEFAULT 0,
                    mime_type TEXT,
                    metadata TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS generations (
                    id TEXT PRIMARY KEY,
                    service_type TEXT NOT NULL,
                    provider TEXT,
                    model_used TEXT NOT NULL,
                    prompt TEXT,
                    negative_prompt TEXT,
                    duration_sec REAL,
                    parameters TEXT DEFAULT '{}',
                    output_url TEXT NOT NULL,
                    cost_usd REAL DEFAULT 0.0,
                    cost_inr REAL DEFAULT 0.0,
                    saved_usd REAL DEFAULT 0.0,
                    status TEXT DEFAULT 'success',
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS director_logs (
                    id TEXT PRIMARY KEY,
                    user_idea TEXT NOT NULL,
                    enhanced_prompt TEXT NOT NULL,
                    camera_direction TEXT,
                    lighting_directive TEXT,
                    negative_prompt TEXT,
                    director_notes TEXT,
                    agent_model TEXT DEFAULT 'gpt-4o-mini',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS studio_settings (
                    setting_key TEXT PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS api_keys (
                    service TEXT PRIMARY KEY,
                    key_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS asset_favorites (
                    filename TEXT PRIMARY KEY,
                    is_favorite INTEGER DEFAULT 1,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS asset_collections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS asset_collection_items (
                    collection_id TEXT,
                    filename TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (collection_id, filename)
                );
                CREATE TABLE IF NOT EXISTS social_accounts (
                    id TEXT PRIMARY KEY,
                    platform TEXT NOT NULL,
                    platform_account_id TEXT,
                    account_name TEXT NOT NULL,
                    username TEXT,
                    avatar_url TEXT,
                    access_token TEXT,
                    status TEXT DEFAULT 'connected',
                    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT DEFAULT '{}'
                );
                CREATE TABLE IF NOT EXISTS publish_posts (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT,
                    media_urls TEXT DEFAULT '[]',
                    media_type TEXT DEFAULT 'image',
                    thumbnail_url TEXT,
                    platforms TEXT NOT NULL DEFAULT '[]',
                    status TEXT DEFAULT 'draft',
                    scheduled_at DATETIME,
                    published_at DATETIME,
                    status_by_platform TEXT DEFAULT '{}',
                    platform_post_ids TEXT DEFAULT '{}',
                    ai_adaptation TEXT DEFAULT '{}',
                    approval_status TEXT DEFAULT 'approved',
                    workspace_id TEXT DEFAULT 'default',
                    campaign_id TEXT,
                    is_recycled INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS publish_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    platforms TEXT NOT NULL DEFAULT '[]',
                    caption_template TEXT,
                    hashtag_template TEXT,
                    default_schedule_offset INTEGER DEFAULT 0,
                    tags TEXT DEFAULT '[]',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS social_analytics (
                    id TEXT PRIMARY KEY,
                    post_id TEXT,
                    platform TEXT NOT NULL,
                    views INTEGER DEFAULT 0,
                    reach INTEGER DEFAULT 0,
                    engagement_rate REAL DEFAULT 0.0,
                    likes INTEGER DEFAULT 0,
                    comments INTEGER DEFAULT 0,
                    shares INTEGER DEFAULT 0,
                    saves INTEGER DEFAULT 0,
                    watch_time_sec REAL DEFAULT 0.0,
                    followers_growth INTEGER DEFAULT 0,
                    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS publish_workspaces (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    client_name TEXT DEFAULT '',
                    approval_required INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS characters (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    tagline TEXT DEFAULT '',
                    description TEXT DEFAULT '',
                    prompt TEXT NOT NULL,
                    image_url TEXT,
                    is_locked INTEGER DEFAULT 0,
                    category TEXT DEFAULT 'custom',
                    tags TEXT DEFAULT '[]',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS saved_prompts (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    negative_prompt TEXT DEFAULT '',
                    category TEXT DEFAULT 'cinematic',
                    tags TEXT DEFAULT '[]',
                    studio_type TEXT DEFAULT 'all',
                    is_favorite INTEGER DEFAULT 0,
                    metadata TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_saved_prompts_category ON saved_prompts(category);
                CREATE INDEX IF NOT EXISTS idx_saved_prompts_favorite ON saved_prompts(is_favorite);
                """)

                # Migration check: Ensure generations table has service_type column if existing SQLite was created with old schema
                try:
                    cur.execute("PRAGMA table_info(generations)")
                    existing_cols = [row[1] for row in cur.fetchall()]
                    if "service_type" not in existing_cols and "type" in existing_cols:
                        cur.execute("ALTER TABLE generations ADD COLUMN service_type TEXT DEFAULT 'general'")
                        cur.execute("UPDATE generations SET service_type = type")
                    if "provider" not in existing_cols:
                        cur.execute("ALTER TABLE generations ADD COLUMN provider TEXT DEFAULT 'local'")
                    if "cost_usd" not in existing_cols:
                        cur.execute("ALTER TABLE generations ADD COLUMN cost_usd REAL DEFAULT 0.0")
                    if "cost_inr" not in existing_cols:
                        cur.execute("ALTER TABLE generations ADD COLUMN cost_inr REAL DEFAULT 0.0")
                    if "saved_usd" not in existing_cols:
                        cur.execute("ALTER TABLE generations ADD COLUMN saved_usd REAL DEFAULT 0.0")
                    if "status" not in existing_cols:
                        cur.execute("ALTER TABLE generations ADD COLUMN status TEXT DEFAULT 'success'")
                    if "error_message" not in existing_cols:
                        cur.execute("ALTER TABLE generations ADD COLUMN error_message TEXT")
                except Exception as mig_e:
                    db_logger.warning("[SQLite Migration Warning] %s", mig_e)

                conn.commit()
            return {"success": True, "provider": "Local SQLite", "status": "initialized"}
        except Exception as e:
            db_logger.error("SQLite init error: %s", e)
            return {"success": False, "error": str(e)}

def test_db_connection(url: Optional[str] = None) -> dict:
    """Test connection latency to Supabase PostgreSQL, custom Postgres, or SQLite"""
    # 1. Supabase Cloud Connection (Primary)
    if is_supabase() and not url:
        start = time.time()
        res = supabase_rest_request("projects?limit=1")
        latency_ms = round((time.time() - start) * 1000, 1)
        project_ref = "unknown"
        try:
            from urllib.parse import urlparse
            parsed = urlparse(settings.SUPABASE_URL)
            if parsed.hostname and ".supabase.co" in parsed.hostname:
                project_ref = parsed.hostname.split(".")[0]
        except Exception:
            pass
        if res.get("success"):
            return {
                "success": True,
                "provider": "Supabase Managed PostgreSQL (Project: Omni)",
                "project_ref": project_ref,
                "region": "auto-detected (configuration-only)",
                "tables": ["projects", "assets", "generations", "director_logs", "studio_settings"],
                "latency_ms": latency_ms,
                "connected": True
            }
        else:
            return {
                "success": False,
                "provider": "Supabase Cloud",
                "error": res.get("error"),
                "connected": False
            }

    # 2. Direct PostgreSQL Connection String (Optional)
    target_url = url or settings.DATABASE_URL
    if target_url and target_url.startswith(("postgres://", "postgresql://")):
        start = time.time()
        try:
            import psycopg2
            conn = psycopg2.connect(target_url, sslmode="require", connect_timeout=5)
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT version();")
                    version = cur.fetchone()[0]
            finally:
                conn.close()
            latency_ms = round((time.time() - start) * 1000, 1)
            is_supa_direct = "supabase" in target_url.lower()
            is_neon = "neon" in target_url.lower() or "neon" in version.lower()
            if is_supa_direct:
                provider_name = "Supabase Managed PostgreSQL"
            elif is_neon:
                provider_name = "Neon Serverless PostgreSQL"
            else:
                provider_name = "PostgreSQL"

            return {
                "success": True,
                "provider": provider_name,
                "version": version.split(",")[0],
                "latency_ms": latency_ms,
                "connected": True
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "connected": False
            }
    else:
        # SQLite connection
        start = time.time()
        try:
            with db_session() as conn:
                cur = conn.cursor()
                cur.execute("SELECT sqlite_version();")
                version = cur.fetchone()[0]
            latency_ms = round((time.time() - start) * 1000, 2)
            return {
                "success": True,
                "provider": "Local Embedded SQLite (Zero Config / Offline)",
                "version": f"SQLite {version}",
                "latency_ms": latency_ms,
                "connected": True
            }
        except Exception as e:
            return {"success": False, "error": str(e), "connected": False}

# ─── Data Access Helpers (Universal: Supabase PostgreSQL + SQLite) ───

def db_save_asset(
    asset_id: str,
    asset_type: str,
    filename: str,
    url: str,
    project_id: Optional[str] = None,
    local_path: Optional[str] = None,
    storage_provider: str = "cloudflare_r2",
    size_bytes: int = 0,
    mime_type: Optional[str] = None,
    metadata: Optional[dict] = None
):
    # 1. Supabase Cloud Sync
    if is_supabase():
        payload = {
            "id": asset_id,
            "project_id": project_id,
            "asset_type": asset_type,
            "filename": filename,
            "url": url,
            "local_path": local_path,
            "storage_provider": storage_provider,
            "size_bytes": size_bytes,
            "mime_type": mime_type,
            "metadata": metadata or {}
        }
        res = supabase_rest_request("assets", method="POST", data=payload)
        if not res.get("success"):
            db_logger.warning("[Supabase Warning] Asset cloud sync: %s", res.get("error"))

    # 2. Local SQLite Sync
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO assets 
                (id, project_id, asset_type, filename, url, local_path, storage_provider, size_bytes, mime_type, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (asset_id, project_id, asset_type, filename, url, local_path, storage_provider, size_bytes, mime_type, json.dumps(metadata or {})))
            conn.commit()
    except Exception as e:
        db_logger.error("[SQLite Error] Save asset: %s", e)

def db_delete_asset(filename: str, asset_type: Optional[str] = None):
    """Delete asset record from Supabase Cloud and local SQLite"""
    # 1. Supabase Cloud Sync
    if is_supabase():
        try:
            encoded_fn = urllib.parse.quote(filename)
            res = supabase_rest_request(f"assets?filename=eq.{encoded_fn}", method="DELETE")
            if not res.get("success"):
                db_logger.warning("[Supabase Warning] Asset delete sync: %s", res.get("error"))
        except Exception as e:
            db_logger.warning("[Supabase Warning] Asset delete sync error: %s", e)

    # 2. Local SQLite Sync
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM assets WHERE filename = ?", (filename,))
            conn.commit()
    except Exception as e:
        db_logger.error("[SQLite Error] Delete asset: %s", e)

def db_set_asset_trashed(filename: str, trashed: bool = True):
    """Update trash status in asset metadata across Supabase and SQLite"""
    # 1. Supabase Cloud Sync
    if is_supabase():
        try:
            encoded_fn = urllib.parse.quote(filename)
            res = supabase_rest_request(f"assets?filename=eq.{encoded_fn}")
            if res.get("success") and res.get("data"):
                asset = res["data"][0]
                meta = asset.get("metadata") or {}
                if isinstance(meta, str):
                    try:
                        meta = json.loads(meta)
                    except Exception:
                        meta = {}
                meta["trashed"] = trashed
                meta["trashed_at"] = time.time() if trashed else None
                supabase_rest_request(f"assets?filename=eq.{encoded_fn}", method="PATCH", data={"metadata": meta})
        except Exception as e:
            db_logger.warning("[Supabase Warning] Asset trash state sync error: %s", e)

    # 2. Local SQLite Sync
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, metadata FROM assets WHERE filename = ?", (filename,))
            row = cur.fetchone()
            if row:
                meta = {}
                if row["metadata"]:
                    try:
                        meta = json.loads(row["metadata"])
                    except Exception:
                        meta = {}
                meta["trashed"] = trashed
                meta["trashed_at"] = time.time() if trashed else None
                cur.execute("UPDATE assets SET metadata = ? WHERE filename = ?", (json.dumps(meta), filename))
                conn.commit()
    except Exception as e:
        db_logger.error("[SQLite Error] Asset trash update: %s", e)

# ─── Asset Favorites Helpers ───

def db_toggle_favorite(filename: str, is_fav: Optional[bool] = None) -> bool:
    """Toggle or explicitly set favorite status for an asset (Cloud + Local)"""
    current_status = False
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT is_favorite FROM asset_favorites WHERE filename = ?", (filename,))
            row = cur.fetchone()
            if row:
                current_status = bool(row[0])
                new_status = not current_status if is_fav is None else bool(is_fav)
                cur.execute("UPDATE asset_favorites SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE filename = ?", (1 if new_status else 0, filename))
            else:
                new_status = True if is_fav is None else bool(is_fav)
                cur.execute("INSERT INTO asset_favorites (filename, is_favorite) VALUES (?, ?)", (filename, 1 if new_status else 0))
            conn.commit()
        
        # Supabase sync if configured
        if is_supabase():
            try:
                supabase_rest_request("asset_favorites", method="POST", data={"filename": filename, "is_favorite": 1 if new_status else 0})
            except Exception as e:
                db_logger.warning("[Supabase Warning] Favorite sync: %s", e)
                
        return new_status
    except Exception as e:
        db_logger.error("[SQLite Error] Toggle favorite: %s", e)
        return False

def db_get_favorites() -> list[str]:
    """Get list of filenames marked as favorite"""
    # 1. Supabase check
    if is_supabase():
        try:
            res = supabase_rest_request("asset_favorites?is_favorite=eq.1&select=filename")
            if res.get("success") and isinstance(res.get("data"), list):
                return [r["filename"] for r in res["data"] if "filename" in r]
        except Exception as e:
            db_logger.warning("[Supabase Warning] Get favorites: %s", e)

    # 2. SQLite local
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT filename FROM asset_favorites WHERE is_favorite = 1")
            rows = cur.fetchall()
            return [r[0] for r in rows]
    except Exception as e:
        db_logger.error("[SQLite Error] Get favorites: %s", e)
        return []

# ─── Asset Collections Helpers ───

def db_get_collections() -> list[dict]:
    """Retrieve all collections with their item counts and preview filenames in a single query."""
    collections = []
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT c.id, c.name, c.description, c.created_at,
                       COUNT(ci.filename) as item_count,
                       GROUP_CONCAT(ci.filename, ',') as all_items
                FROM asset_collections c
                LEFT JOIN asset_collection_items ci ON c.id = ci.collection_id
                GROUP BY c.id, c.name, c.description, c.created_at
                ORDER BY c.created_at DESC
            """)
            for row in cur.fetchall():
                all_items_str = row[5] or ""
                previews = [fn.strip() for fn in all_items_str.split(",") if fn.strip()][:4]
                collections.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2] or "",
                    "created_at": row[3],
                    "item_count": row[4],
                    "previews": previews
                })
    except Exception as e:
        db_logger.error("[SQLite Error] Get collections: %s", e)
    return collections

def db_create_collection(name: str, description: str = "") -> dict:
    """Create a new asset collection"""
    import uuid
    coll_id = f"col_{uuid.uuid4().hex[:10]}"
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("INSERT INTO asset_collections (id, name, description) VALUES (?, ?, ?)", (coll_id, name, description))
            conn.commit()
        
        if is_supabase():
            try:
                supabase_rest_request("asset_collections", method="POST", data={"id": coll_id, "name": name, "description": description})
            except Exception as e:
                db_logger.warning("[Supabase Warning] Create collection sync: %s", e)
                
        return {"id": coll_id, "name": name, "description": description, "item_count": 0, "previews": []}
    except Exception as e:
        db_logger.error("[SQLite Error] Create collection: %s", e)
        return {"id": coll_id, "name": name, "description": description, "error": str(e)}

def db_delete_collection(collection_id: str) -> bool:
    """Delete a collection and its associations"""
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM asset_collection_items WHERE collection_id = ?", (collection_id,))
            cur.execute("DELETE FROM asset_collections WHERE id = ?", (collection_id,))
            conn.commit()
        
        if is_supabase():
            try:
                supabase_rest_request(f"asset_collection_items?collection_id=eq.{collection_id}", method="DELETE")
                supabase_rest_request(f"asset_collections?id=eq.{collection_id}", method="DELETE")
            except Exception as e:
                db_logger.warning("[Supabase Warning] Delete collection sync: %s", e)
        return True
    except Exception as e:
        db_logger.error("[SQLite Error] Delete collection: %s", e)
        return False

def db_add_asset_to_collection(collection_id: str, filename: str) -> bool:
    """Associate an asset with a collection"""
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("INSERT OR IGNORE INTO asset_collection_items (collection_id, filename) VALUES (?, ?)", (collection_id, filename))
            conn.commit()
        return True
    except Exception as e:
        db_logger.error("[SQLite Error] Add asset to collection: %s", e)
        return False

def db_remove_asset_from_collection(collection_id: str, filename: str) -> bool:
    """Remove an asset from a collection"""
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM asset_collection_items WHERE collection_id = ? AND filename = ?", (collection_id, filename))
            conn.commit()
        return True
    except Exception as e:
        db_logger.error("[SQLite Error] Remove asset from collection: %s", e)
        return False

def db_get_collection_item_filenames(collection_id: str) -> list[str]:
    """Get all filenames in a collection"""
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT filename FROM asset_collection_items WHERE collection_id = ?", (collection_id,))
            rows = cur.fetchall()
            return [r[0] for r in rows]
    except Exception as e:
        db_logger.error("[SQLite Error] Get collection items: %s", e)
        return []

def db_save_generation(
    generation_id: str,
    service_type: str,
    provider: str,
    model_used: str,
    output_url: str,
    prompt: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    duration_sec: Optional[float] = None,
    cost_usd: float = 0.0,
    cost_inr: float = 0.0,
    saved_usd: float = 0.0,
    status: str = "success",
    parameters: Optional[dict] = None,
    error_message: Optional[str] = None
):
    # 1. Supabase Cloud Sync
    if is_supabase():
        payload = {
            "id": generation_id,
            "service_type": service_type,
            "provider": provider,
            "model_used": model_used,
            "output_url": output_url,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "duration_sec": duration_sec,
            "cost_usd": cost_usd,
            "cost_inr": cost_inr,
            "saved_usd": saved_usd,
            "status": status,
            "parameters": parameters or {},
            "error_message": error_message
        }
        res = supabase_rest_request("generations", method="POST", data=payload)
        if not res.get("success"):
            db_logger.warning("[Supabase Warning] Generation cloud sync: %s", res.get("error"))

    # 2. Local SQLite Sync
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(generations)")
            existing_cols = {row[1] for row in cur.fetchall()}

            cols = ["id", "model_used", "output_url"]
            vals = [generation_id, model_used or "unknown", output_url or ""]

            if "service_type" in existing_cols:
                cols.append("service_type")
                vals.append(service_type or "general")
            if "type" in existing_cols:
                cols.append("type")
                vals.append(service_type or "general")
            if "provider" in existing_cols:
                cols.append("provider")
                vals.append(provider or "local")
            if "prompt" in existing_cols:
                cols.append("prompt")
                vals.append(prompt or "")
            if "negative_prompt" in existing_cols:
                cols.append("negative_prompt")
                vals.append(negative_prompt or "")
            if "duration_sec" in existing_cols:
                cols.append("duration_sec")
                vals.append(duration_sec or 0.0)
            if "parameters" in existing_cols:
                cols.append("parameters")
                vals.append(json.dumps(parameters or {}))
            if "cost_usd" in existing_cols:
                cols.append("cost_usd")
                vals.append(cost_usd or 0.0)
            if "cost_inr" in existing_cols:
                cols.append("cost_inr")
                vals.append(cost_inr or 0.0)
            if "saved_usd" in existing_cols:
                cols.append("saved_usd")
                vals.append(saved_usd or 0.0)
            if "status" in existing_cols:
                cols.append("status")
                vals.append(status or "success")
            if "error_message" in existing_cols:
                cols.append("error_message")
                vals.append(error_message)

            placeholders = ", ".join(["?"] * len(cols))
            col_names = ", ".join(cols)
            cur.execute(f"""
                INSERT OR REPLACE INTO generations ({col_names})
                VALUES ({placeholders})
            """, tuple(vals))
            conn.commit()
    except Exception as e:
        db_logger.error("[SQLite Error] Save generation: %s", e)

def db_save_project(
    project_id: str,
    title: str,
    topic: Optional[str] = None,
    style: str = "cinematic",
    status: str = "completed",
    scenes_count: int = 1,
    metadata: Optional[dict] = None
):
    """Save or update project in Supabase Cloud and local SQLite."""
    if is_supabase():
        payload = {
            "id": project_id,
            "title": title,
            "topic": topic,
            "style": style,
            "status": status,
            "scenes_count": scenes_count,
            "metadata": metadata or {}
        }
        res = supabase_rest_request("projects", method="POST", data=payload)
        if not res.get("success"):
            db_logger.warning("[Supabase Warning] Save project: %s", res.get("error"))

    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO projects (id, title, topic, style, status, scenes_count, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (project_id, title, topic, style, status, scenes_count, json.dumps(metadata or {})))
            conn.commit()
    except Exception as e:
        db_logger.error("[SQLite Error] Save project: %s", e)

def db_save_setting(key: str, value: str):
    """Save studio setting to Supabase Cloud and local SQLite with at-rest encryption for secrets."""
    stored_val = encrypt_secret(value) if is_sensitive_key(key) else value
    if is_supabase():
        payload = {"setting_key": key, "setting_value": stored_val}
        supabase_rest_request("studio_settings", method="POST", data=payload)
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("INSERT OR REPLACE INTO studio_settings (setting_key, setting_value) VALUES (?, ?)", (key, stored_val))
            conn.commit()
    except Exception as e:
        db_logger.error("[SQLite Error] Save setting: %s", e)

def db_get_all_settings() -> dict:
    """Fetch all studio settings from Supabase Cloud or fallback SQLite with transparent decryption."""
    settings_dict = {}
    if is_supabase():
        try:
            res = supabase_rest_request("studio_settings?select=setting_key,setting_value")
            if res.get("success") and isinstance(res.get("data"), list):
                for row in res["data"]:
                    val = row.get("setting_value")
                    if isinstance(val, str) and ((val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'"))):
                        try:
                            val = json.loads(val)
                        except Exception:
                            val = val.strip("\"'")
                    k = row.get("setting_key")
                    if k:
                        settings_dict[k] = decrypt_secret(val) if (is_sensitive_key(k) or (isinstance(val, str) and val.startswith("gAAAAA"))) else val
                if settings_dict:
                    return settings_dict
        except Exception as e:
            db_logger.warning("[Supabase Settings Fetch Warning] %s", e)

    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT setting_key, setting_value FROM studio_settings")
            for row in cur.fetchall():
                k, val = row[0], row[1]
                settings_dict[k] = decrypt_secret(val) if (is_sensitive_key(k) or (isinstance(val, str) and val.startswith("gAAAAA"))) else val
    except Exception as e:
        db_logger.error("[SQLite Settings Fetch Error] %s", e)
    return settings_dict

def db_save_api_key(service: str, key_value: str):
    """Save encrypted API key for a specific service at rest."""
    encrypted_val = encrypt_secret(key_value)
    if is_supabase():
        payload = {"service": service, "key_value": encrypted_val}
        supabase_rest_request("api_keys", method="POST", data=payload)
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("INSERT OR REPLACE INTO api_keys (service, key_value) VALUES (?, ?)", (service, encrypted_val))
            conn.commit()
    except Exception as e:
        db_logger.error("[SQLite Error] Save api_key: %s", e)

def db_get_api_keys() -> dict[str, str]:
    """Fetch all API keys with transparent Fernet decryption (and legacy plaintext fallback)."""
    keys_dict = {}
    if is_supabase():
        try:
            res = supabase_rest_request("api_keys?select=service,key_value")
            if res.get("success") and isinstance(res.get("data"), list):
                for row in res["data"]:
                    keys_dict[row["service"]] = decrypt_secret(row.get("key_value", ""))
                if keys_dict:
                    return keys_dict
        except Exception as e:
            db_logger.warning("[Supabase api_keys Fetch Warning] %s", e)
    try:
        with db_session() as conn:
            cur = conn.cursor()
            cur.execute("SELECT service, key_value FROM api_keys")
            for row in cur.fetchall():
                keys_dict[row[0]] = decrypt_secret(row[1])
    except Exception as e:
        db_logger.error("[SQLite api_keys Fetch Error] %s", e)
    return keys_dict

def db_rename_asset(old_filename: str, new_filename: str, media_type: str = "images") -> bool:
    """Rename an asset record across local SQLite and Supabase Cloud"""
    # 1. Supabase Cloud Sync
    if is_supabase():
        try:
            encoded_old = urllib.parse.quote(old_filename)
            new_url = f"/outputs/{media_type}/{new_filename}"
            supabase_rest_request(f"assets?filename=eq.{encoded_old}", method="PATCH", data={
                "filename": new_filename,
                "url": new_url
            })
        except Exception as e:
            db_logger.warning("[Supabase Warning] Asset rename sync: %s", e)

    # 2. Local SQLite Sync
    try:
        with db_session() as conn:
            cur = conn.cursor()
            new_url = f"/outputs/{media_type}/{new_filename}"
            cur.execute("UPDATE assets SET filename = ?, url = ? WHERE filename = ?", (new_filename, new_url, old_filename))
            try:
                cur.execute("UPDATE asset_favorites SET filename = ? WHERE filename = ?", (new_filename, old_filename))
            except Exception:
                pass
            try:
                cur.execute("UPDATE asset_collection_items SET filename = ? WHERE filename = ?", (new_filename, old_filename))
            except Exception:
                pass
            conn.commit()
            return True
    except Exception as e:
        db_logger.error("[SQLite Error] Rename asset: %s", e)
        return False

def load_settings_into_runtime():
    """
    Sync API keys with resilient hierarchy:
    1. Supabase Cloud Database (Primary)
    2. Fallback to local SQLite / VPS .env if Supabase is unavailable or key is unset
    """
    ALL_CRITICAL_KEYS = [
        "OPENAI_API_KEY", "ELEVENLABS_API_KEY", "REPLICATE_API_TOKEN", "GEMINI_API_KEY",
        "DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME", "R2_PUBLIC_DOMAIN"
    ]
    merged_settings = {}
    try:
        db_settings = db_get_all_settings()
        for k in ALL_CRITICAL_KEYS:
            db_val = db_settings.get(k)
            env_val = os.environ.get(k) or getattr(settings, k, "")
            
            # Primary: Supabase DB if non-empty
            if db_val and isinstance(db_val, str) and db_val.strip():
                final_val = db_val.strip()
            # Resilient Fallback: Local VPS .env / os.environ
            elif env_val and isinstance(env_val, str) and env_val.strip():
                final_val = env_val.strip()
            else:
                final_val = ""

            if final_val:
                if hasattr(settings, k):
                    setattr(settings, k, final_val)
                os.environ[k] = final_val
                merged_settings[k] = final_val

        return merged_settings
    except Exception as e:
        db_logger.error("[Settings Runtime Sync Error] %s", e)
        # Even on critical exception, ensure .env is not wiped
        return merged_settings

# Auto-initialize DB and load settings on import
try:
    init_database()
    load_settings_into_runtime()
except Exception as e:
    db_logger.warning("Database initialization or runtime settings load encountered error: %s", e)
