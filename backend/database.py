import os
import time
import json
import sqlite3
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Any
from config import settings

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
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initialize database tables for SQLite or execute schema on PostgreSQL"""
    if is_postgres():
        try:
            import psycopg2
            conn = psycopg2.connect(settings.DATABASE_URL, sslmode="require")
            with conn.cursor() as cur:
                schema_path = Path(__file__).parent / "db" / "schema.sql"
                if schema_path.exists():
                    with open(schema_path, "r", encoding="utf-8") as f:
                        cur.execute(f.read())
                conn.commit()
            conn.close()
            provider_name = "Supabase PostgreSQL" if "supabase" in settings.DATABASE_URL.lower() else "PostgreSQL"
            return {"success": True, "provider": provider_name, "status": "initialized"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        # SQLite local initialization
        conn = get_sqlite_conn()
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
            print(f"[SQLite Migration Warning] {mig_e}")

        conn.commit()
        conn.close()
        return {"success": True, "provider": "Local SQLite", "status": "initialized"}

def test_db_connection(url: Optional[str] = None) -> dict:
    """Test connection latency to Supabase PostgreSQL, custom Postgres, or SQLite"""
    # 1. Supabase Cloud Connection (Primary)
    if is_supabase() and not url:
        start = time.time()
        res = supabase_rest_request("projects?limit=1")
        latency_ms = round((time.time() - start) * 1000, 1)
        if res.get("success"):
            return {
                "success": True,
                "provider": "Supabase Managed PostgreSQL (Project: Omni)",
                "project_ref": "lsttnpynhwtpkzfbfntf",
                "region": "ap-south-1 (Mumbai)",
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
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
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
            conn = get_sqlite_conn()
            cur = conn.cursor()
            cur.execute("SELECT sqlite_version();")
            version = cur.fetchone()[0]
            conn.close()
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
            print(f"[Supabase Warning] Asset cloud sync: {res.get('error')}")

    # 2. Local SQLite Sync
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO assets 
            (id, project_id, asset_type, filename, url, local_path, storage_provider, size_bytes, mime_type, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (asset_id, project_id, asset_type, filename, url, local_path, storage_provider, size_bytes, mime_type, json.dumps(metadata or {})))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite Error] Save asset: {e}")

def db_delete_asset(filename: str, asset_type: Optional[str] = None):
    """Delete asset record from Supabase Cloud and local SQLite"""
    # 1. Supabase Cloud Sync
    if is_supabase():
        try:
            encoded_fn = urllib.parse.quote(filename)
            res = supabase_rest_request(f"assets?filename=eq.{encoded_fn}", method="DELETE")
            if not res.get("success"):
                print(f"[Supabase Warning] Asset delete sync: {res.get('error')}")
        except Exception as e:
            print(f"[Supabase Warning] Asset delete sync error: {e}")

    # 2. Local SQLite Sync
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM assets WHERE filename = ?", (filename,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite Error] Delete asset: {e}")

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
                    except:
                        meta = {}
                meta["trashed"] = trashed
                meta["trashed_at"] = time.time() if trashed else None
                supabase_rest_request(f"assets?filename=eq.{encoded_fn}", method="PATCH", data={"metadata": meta})
        except Exception as e:
            print(f"[Supabase Warning] Asset trash state sync error: {e}")

    # 2. Local SQLite Sync
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, metadata FROM assets WHERE filename = ?", (filename,))
        row = cur.fetchone()
        if row:
            meta = {}
            if row["metadata"]:
                try:
                    meta = json.loads(row["metadata"])
                except:
                    meta = {}
            meta["trashed"] = trashed
            meta["trashed_at"] = time.time() if trashed else None
            cur.execute("UPDATE assets SET metadata = ? WHERE filename = ?", (json.dumps(meta), filename))
            conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite Error] Asset trash update: {e}")

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
            print(f"[Supabase Warning] Generation cloud sync: {res.get('error')}")

    # 2. Local SQLite Sync
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO generations 
            (id, service_type, provider, model_used, prompt, negative_prompt, duration_sec, parameters, output_url, cost_usd, cost_inr, saved_usd, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (generation_id, service_type, provider, model_used, prompt, negative_prompt, duration_sec, json.dumps(parameters or {}), output_url, cost_usd, cost_inr, saved_usd, status, error_message))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite Error] Save generation: {e}")

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
            print(f"[Supabase Warning] Save project: {res.get('error')}")

    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO projects (id, title, topic, style, status, scenes_count, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (project_id, title, topic, style, status, scenes_count, json.dumps(metadata or {})))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite Error] Save project: {e}")

def db_save_setting(key: str, value: str):
    """Save studio setting to Supabase Cloud and local SQLite."""
    if is_supabase():
        payload = {"setting_key": key, "setting_value": value}
        supabase_rest_request("studio_settings", method="POST", data=payload)
    try:
        conn = get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO studio_settings (setting_key, setting_value) VALUES (?, ?)", (key, value))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[SQLite Error] Save setting: {e}")

# Auto-initialize DB on import
try:
    init_database()
except Exception:
    pass

