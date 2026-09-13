import json
import uuid
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from database import get_db_cursor, db_session, is_postgres
from config import settings

logger = logging.getLogger("omnistudio.prompts")

router = APIRouter(prefix="/api/prompts", tags=["Prompt Vault"])

# -----------------------------------------------------------------------------
# Curated Master Prompts for Auto-Seeding
# -----------------------------------------------------------------------------
CURATED_MASTER_PROMPTS = [
    {
        "id": "prompt_cyberpunk_rain",
        "title": "Cinematic Cyberpunk Rain",
        "prompt": "Cyberpunk cityscape in heavy neon rain, reflections on wet asphalt, volumetric steam, anamorphic lens flare, Arri Alexa LF 35mm, blade runner aesthetic",
        "negative_prompt": "blurry, low quality, oversaturated",
        "category": "cinematic",
        "tags": ["cyberpunk", "rain", "neon"],
        "studio_type": "all",
        "is_favorite": 1,
        "metadata": {"seed": 42, "style": "cinematic"}
    },
    {
        "id": "prompt_haute_couture",
        "title": "Hyperrealistic Haute Couture Fashion",
        "prompt": "High-fashion editorial model in haute couture silk garment, dramatic studio lighting, soft shadows, Hasselblad 85mm f/1.2, Vogue magazine cover aesthetic",
        "negative_prompt": "bad anatomy, cartoon, drawing",
        "category": "fashion",
        "tags": ["fashion", "editorial", "portrait"],
        "studio_type": "all",
        "is_favorite": 1,
        "metadata": {"seed": 108, "style": "editorial"}
    },
    {
        "id": "prompt_luxury_product",
        "title": "Ultra-Luxury Commercial Product",
        "prompt": "Luxury Swiss chronometer watch on black polished obsidian stone, subtle gold water caustics, macro 100mm lens, pristine reflections, commercial advertising grade",
        "negative_prompt": "scratches, dust, noise",
        "category": "commercial",
        "tags": ["commercial", "product", "luxury"],
        "studio_type": "all",
        "is_favorite": 0,
        "metadata": {"seed": 204, "style": "commercial"}
    },
    {
        "id": "prompt_scifi_horizon",
        "title": "Cinematic Sci-Fi Planetary Horizon",
        "prompt": "Astronaut standing on alien dune gazing at two celestial moons rising over horizon, dramatic rim lighting, epic scale, Interstellar cinematic color grade",
        "negative_prompt": "cartoon, flat lighting",
        "category": "cinematic",
        "tags": ["scifi", "space", "landscape"],
        "studio_type": "video",
        "is_favorite": 0,
        "metadata": {"seed": 315, "style": "scifi"}
    },
    {
        "id": "prompt_documentary_portrait",
        "title": "Photorealistic Documentary Portrait",
        "prompt": "Weathered elderly fisherman by stormy sea, natural overcast lighting, detailed facial textures, Leica M11 50mm Summilux, National Geographic photo quality",
        "negative_prompt": "smooth skin, plastic, airbrushed",
        "category": "portrait",
        "tags": ["documentary", "portrait", "realism"],
        "studio_type": "image",
        "is_favorite": 0,
        "metadata": {"seed": 420, "style": "documentary"}
    },
    {
        "id": "prompt_minimalist_villa",
        "title": "Architectural Minimalist Villa",
        "prompt": "Modernist concrete and glass villa overlooking infinity pool at sunset, Bauhaus design, warm interior lighting, architectural digest photography",
        "negative_prompt": "distorted perspective, clutter",
        "category": "architecture",
        "tags": ["architecture", "minimalism", "modern"],
        "studio_type": "all",
        "is_favorite": 0,
        "metadata": {"seed": 512, "style": "architecture"}
    },
    {
        "id": "prompt_action_chase",
        "title": "High-Energy Action Chase",
        "prompt": "Futuristic hovercraft accelerating through dense cyberpunk canyon, motion blur, kinetic camera shake, dynamic particle trails, Unreal Engine 5 render",
        "negative_prompt": "static, slow, dull",
        "category": "action",
        "tags": ["action", "motion", "speed"],
        "studio_type": "video",
        "is_favorite": 0,
        "metadata": {"seed": 618, "style": "action"}
    },
    {
        "id": "prompt_fantasy_forest",
        "title": "Ethereal Fantasy Forest Sanctuary",
        "prompt": "Glowing bioluminescent ancient forest, mythical stag with crystal antlers, soft morning mist filtering sunbeams, Studio Ghibli cinematic realism",
        "negative_prompt": "dark, muddy, lowres",
        "category": "fantasy",
        "tags": ["fantasy", "nature", "magical"],
        "studio_type": "all",
        "is_favorite": 0,
        "metadata": {"seed": 777, "style": "fantasy"}
    }
]


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class PromptCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    prompt: str = Field(..., min_length=1)
    negative_prompt: Optional[str] = ""
    negativePrompt: Optional[str] = None
    category: Optional[str] = "cinematic"
    tags: Optional[List[str]] = []
    studio_type: Optional[str] = "all"
    studioType: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

    def get_negative_prompt(self) -> str:
        return self.negativePrompt if self.negativePrompt is not None else (self.negative_prompt or "")

    def get_studio_type(self) -> str:
        return self.studioType if self.studioType is not None else (self.studio_type or "all")


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    negativePrompt: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    studio_type: Optional[str] = None
    studioType: Optional[str] = None
    is_favorite: Optional[int] = None
    isFavorite: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

    def get_negative_prompt(self) -> Optional[str]:
        if self.negativePrompt is not None:
            return self.negativePrompt
        return self.negative_prompt

    def get_studio_type(self) -> Optional[str]:
        if self.studioType is not None:
            return self.studioType
        return self.studio_type

    def get_is_favorite(self) -> Optional[int]:
        if self.isFavorite is not None:
            return 1 if self.isFavorite else 0
        if self.is_favorite is not None:
            return 1 if self.is_favorite else 0
        return None


# -----------------------------------------------------------------------------
# Database Helpers (SQLite with PostgreSQL Fallback / Support)
# -----------------------------------------------------------------------------
def execute_sql(sql: str, params: tuple = (), fetch_one: bool = False, fetch_all: bool = True, commit: bool = False):
    """Universal query runner supporting PostgreSQL when active, with SQLite fallback."""
    if is_postgres():
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(settings.DATABASE_URL, sslmode="require", connect_timeout=5)
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    pg_sql = sql.replace("?", "%s")
                    cur.execute(pg_sql, params)
                    if commit:
                        conn.commit()
                    if fetch_one:
                        r = cur.fetchone()
                        return dict(r) if r else None
                    if fetch_all:
                        rows = cur.fetchall()
                        return [dict(r) for r in rows]
                    return None
            finally:
                conn.close()
        except Exception as e:
            logger.warning("PostgreSQL query execution failed, falling back to SQLite: %s", e)

    with db_session() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        if commit:
            conn.commit()
        if fetch_one:
            r = cur.fetchone()
            return dict(r) if r else None
        if fetch_all:
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        return None


def serialize_prompt(row: dict) -> dict:
    """Serializes a prompt database row into JSON-ready dictionary with camelCase & snake_case support."""
    if not row:
        return {}

    tags_val = row.get("tags")
    if isinstance(tags_val, str):
        try:
            tags = json.loads(tags_val) if tags_val else []
        except Exception:
            tags = []
    elif isinstance(tags_val, list):
        tags = tags_val
    else:
        tags = []

    meta_val = row.get("metadata")
    if isinstance(meta_val, str):
        try:
            meta = json.loads(meta_val) if meta_val else {}
        except Exception:
            meta = {}
    elif isinstance(meta_val, dict):
        meta = meta_val
    else:
        meta = {}

    is_fav = int(row.get("is_favorite") or 0)
    neg_prompt = row.get("negative_prompt") or ""
    studio_type = row.get("studio_type") or "all"
    created_at = str(row.get("created_at") or "")
    updated_at = str(row.get("updated_at") or "")

    return {
        "id": row.get("id"),
        "title": row.get("title") or "",
        "prompt": row.get("prompt") or "",
        "negative_prompt": neg_prompt,
        "negativePrompt": neg_prompt,
        "category": row.get("category") or "cinematic",
        "tags": tags,
        "studio_type": studio_type,
        "studioType": studio_type,
        "is_favorite": is_fav,
        "isFavorite": bool(is_fav),
        "metadata": meta,
        "created_at": created_at,
        "createdAt": created_at,
        "updated_at": updated_at,
        "updatedAt": updated_at,
        "success": True
    }


def seed_prompts_if_empty():
    """Seeds the 8 curated cinematic and commercial master prompts if table is empty."""
    ensure_table_exists()
    count_res = execute_sql("SELECT COUNT(*) AS cnt FROM saved_prompts", fetch_one=True)
    count = 0
    if count_res:
        count = count_res.get("cnt") or list(count_res.values())[0] if count_res else 0

    if count == 0:
        logger.info("saved_prompts table is empty. Seeding 8 curated master prompts...")
        for p in CURATED_MASTER_PROMPTS:
            if is_postgres():
                try:
                    execute_sql("""
                        INSERT INTO saved_prompts 
                        (id, title, prompt, negative_prompt, category, tags, studio_type, is_favorite, metadata, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        p["id"],
                        p["title"],
                        p["prompt"],
                        p["negative_prompt"],
                        p["category"],
                        json.dumps(p["tags"]),
                        p["studio_type"],
                        p["is_favorite"],
                        json.dumps(p["metadata"])
                    ), commit=True)
                    continue
                except Exception as e:
                    logger.debug("Postgres seed item skipped/failed: %s", e)

            # SQLite fallback/primary
            execute_sql("""
                INSERT OR IGNORE INTO saved_prompts 
                (id, title, prompt, negative_prompt, category, tags, studio_type, is_favorite, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                p["id"],
                p["title"],
                p["prompt"],
                p["negative_prompt"],
                p["category"],
                json.dumps(p["tags"]),
                p["studio_type"],
                p["is_favorite"],
                json.dumps(p["metadata"])
            ), commit=True)


def ensure_table_exists():
    """Ensures saved_prompts table and indexes exist in local SQLite."""
    with db_session() as conn:
        cur = conn.cursor()
        cur.executescript("""
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
            CREATE INDEX IF NOT EXISTS idx_saved_prompts_studio_type ON saved_prompts(studio_type);
        """)
        conn.commit()


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@router.get("")
async def list_prompts(
    search: Optional[str] = Query(None, description="Search term in title, prompt, or tags"),
    category: Optional[str] = Query(None, description="Filter by category (cinematic, fashion, commercial, etc.)"),
    studio_type: Optional[str] = Query(None, description="Filter by studio type (all, image, video)"),
    favorite_only: Optional[bool] = Query(False, description="Filter favorite prompts only")
):
    """
    List prompts with search and category filtering.
    Automatically seeds 8 curated cinematic and commercial master prompts if empty.
    """
    seed_prompts_if_empty()

    conditions = []
    params = []

    if search and search.strip():
        term = f"%{search.strip()}%"
        conditions.append("(title LIKE ? OR prompt LIKE ? OR tags LIKE ?)")
        params.extend([term, term, term])

    if category and category.strip() and category.strip().lower() != "all":
        conditions.append("LOWER(category) = LOWER(?)")
        params.append(category.strip())

    if studio_type and studio_type.strip() and studio_type.strip().lower() != "all":
        conditions.append("(LOWER(studio_type) = LOWER(?) OR LOWER(studio_type) = 'all')")
        params.append(studio_type.strip())

    if favorite_only:
        conditions.append("is_favorite = 1")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"""
        SELECT id, title, prompt, negative_prompt, category, tags, studio_type, is_favorite, metadata, created_at, updated_at
        FROM saved_prompts
        {where_clause}
        ORDER BY is_favorite DESC, created_at DESC
    """

    rows = execute_sql(sql, tuple(params), fetch_all=True) or []
    serialized = [serialize_prompt(r) for r in rows]

    return {
        "success": True,
        "prompts": serialized,
        "total": len(serialized)
    }


@router.post("")
async def create_prompt(payload: PromptCreate):
    """
    Save a new prompt into the saved_prompts table.
    Returns the saved prompt item.
    """
    ensure_table_exists()
    prompt_id = f"prompt_{uuid.uuid4().hex[:12]}"
    neg_prompt = payload.get_negative_prompt()
    studio_type = payload.get_studio_type()
    tags_str = json.dumps(payload.tags or [])
    meta_str = json.dumps(payload.metadata or {})
    cat = (payload.category or "cinematic").strip()

    sql = """
        INSERT INTO saved_prompts 
        (id, title, prompt, negative_prompt, category, tags, studio_type, is_favorite, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """
    execute_sql(sql, (
        prompt_id,
        payload.title.strip(),
        payload.prompt.strip(),
        neg_prompt,
        cat,
        tags_str,
        studio_type,
        meta_str
    ), commit=True)

    row = execute_sql("SELECT * FROM saved_prompts WHERE id = ?", (prompt_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=500, detail="Failed to retrieve created prompt")

    saved_item = serialize_prompt(row)
    return saved_item


@router.get("/{prompt_id}")
async def get_prompt_by_id(prompt_id: str):
    """Retrieve a single prompt by its ID."""
    ensure_table_exists()
    row = execute_sql("SELECT * FROM saved_prompts WHERE id = ?", (prompt_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=404, detail=f"Prompt '{prompt_id}' not found")
    return serialize_prompt(row)


@router.put("/{prompt_id}")
async def update_prompt(prompt_id: str, payload: PromptUpdate):
    """
    Update prompt details by ID.
    Returns the updated prompt item.
    """
    ensure_table_exists()
    existing = execute_sql("SELECT * FROM saved_prompts WHERE id = ?", (prompt_id,), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Prompt '{prompt_id}' not found")

    new_title = payload.title.strip() if payload.title is not None else existing.get("title")
    new_prompt = payload.prompt.strip() if payload.prompt is not None else existing.get("prompt")
    new_neg = payload.get_negative_prompt() if payload.get_negative_prompt() is not None else existing.get("negative_prompt", "")
    new_cat = payload.category.strip() if payload.category is not None else existing.get("category", "cinematic")
    
    if payload.tags is not None:
        new_tags_str = json.dumps(payload.tags)
    else:
        new_tags_str = existing.get("tags")
        if not isinstance(new_tags_str, str):
            new_tags_str = json.dumps(new_tags_str or [])

    new_studio = payload.get_studio_type() if payload.get_studio_type() is not None else existing.get("studio_type", "all")
    new_fav = payload.get_is_favorite() if payload.get_is_favorite() is not None else existing.get("is_favorite", 0)

    if payload.metadata is not None:
        new_meta_str = json.dumps(payload.metadata)
    else:
        new_meta_str = existing.get("metadata")
        if not isinstance(new_meta_str, str):
            new_meta_str = json.dumps(new_meta_str or {})

    sql = """
        UPDATE saved_prompts
        SET title = ?, prompt = ?, negative_prompt = ?, category = ?, tags = ?, studio_type = ?, is_favorite = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """
    execute_sql(sql, (
        new_title,
        new_prompt,
        new_neg,
        new_cat,
        new_tags_str,
        new_studio,
        new_fav,
        new_meta_str,
        prompt_id
    ), commit=True)

    updated_row = execute_sql("SELECT * FROM saved_prompts WHERE id = ?", (prompt_id,), fetch_one=True)
    if not updated_row:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated prompt")

    return serialize_prompt(updated_row)


@router.delete("/{prompt_id}")
async def delete_prompt(prompt_id: str):
    """
    Delete a prompt by ID.
    Returns { "success": True, "id": prompt_id }.
    """
    ensure_table_exists()
    execute_sql("DELETE FROM saved_prompts WHERE id = ?", (prompt_id,), commit=True)
    return {"success": True, "id": prompt_id}


@router.post("/{prompt_id}/favorite")
@router.put("/{prompt_id}/favorite")
async def toggle_favorite(prompt_id: str):
    """
    Toggle is_favorite (0 <-> 1) for a prompt.
    Returns { "success": True, "id": prompt_id, "is_favorite": new_val }.
    """
    ensure_table_exists()
    row = execute_sql("SELECT is_favorite FROM saved_prompts WHERE id = ?", (prompt_id,), fetch_one=True)
    if not row:
        raise HTTPException(status_code=404, detail=f"Prompt '{prompt_id}' not found")

    current_val = int(row.get("is_favorite") or 0)
    new_val = 0 if current_val else 1

    execute_sql("UPDATE saved_prompts SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_val, prompt_id), commit=True)

    return {
        "success": True,
        "id": prompt_id,
        "is_favorite": new_val,
        "isFavorite": bool(new_val)
    }
