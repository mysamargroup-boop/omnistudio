import json
import time
from typing import Optional, List, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from database import get_db_cursor, db_session

router = APIRouter(prefix="/api/characters", tags=["Character Studio & Consistency"])

DEFAULT_ARCHETYPES = [
    {
        "id": "the_eccentric",
        "name": "The Eccentric",
        "tagline": "Base Archetype",
        "description": "Unforgettable quirky humans. Magnetic scene-stealers with offbeat charm.",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        "prompt": "An unforgettable eccentric personality with stylized sculpted hair, avant-garde collar, expressive magnetic gaze, high fashion editorial lighting",
        "category": "archetype"
    },
    {
        "id": "the_professional",
        "name": "The Professional",
        "tagline": "Base Archetype",
        "description": "Clean cut, well spoken, competent",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
        "prompt": "A polished, clean-cut professional with immaculate posture, tailored minimal uniform, calm commanding focus, studio chiaroscuro lighting",
        "category": "archetype"
    },
    {
        "id": "the_wildcard",
        "name": "The Wildcard",
        "tagline": "Base Archetype",
        "description": "Beyond human, anything can be a character, right?",
        "avatar": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
        "prompt": "A futuristic synthetic entity with crystalline faceted geometric features, luminescent lavender core, intricate cybernetic filigree",
        "category": "archetype"
    },
    {
        "id": "the_familiar",
        "name": "The Familiar",
        "tagline": "Base Archetype",
        "description": "Grounded and authentic, a relatable anchor for your story",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        "prompt": "A weathered authentic wanderer with warm expressive eyes, textured canvas field jacket, grounded presence, natural golden hour sunlight",
        "category": "archetype"
    },
    {
        "id": "the_wicked",
        "name": "The Wicked",
        "tagline": "Base Archetype",
        "description": "Powerful antagonistic figures that command the screen",
        "avatar": "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=300&auto=format&fit=crop&q=80",
        "prompt": "A formidable antagonistic figure with sharp angular bangs, tailored high-collar obsidian coat, commanding piercing glare, dramatic rim light",
        "category": "archetype"
    },
    {
        "id": "the_fantastical",
        "name": "The Fantastical",
        "tagline": "Base Archetype",
        "description": "Ethereal, dreamlike beings fusing the human and the mythical",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        "prompt": "An ethereal porcelain entity adorned with delicate silver filigree crown, iridescent celestial skin, floating starlight particles, dreamlike mist",
        "category": "archetype"
    }
]


class CharacterPayload(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., max_length=255)
    tagline: Optional[str] = ""
    description: Optional[str] = ""
    prompt: str = Field(..., max_length=5000)
    imageUrl: Optional[str] = None
    image_url: Optional[str] = None
    isLocked: Optional[bool] = False
    is_locked: Optional[bool] = None
    category: Optional[str] = "custom"
    tags: Optional[List[str]] = []


class ActiveCharacterPayload(BaseModel):
    character: Optional[CharacterPayload] = None
    character_id: Optional[str] = None


def seed_archetypes_if_empty(cur):
    cur.execute("SELECT COUNT(*) FROM characters")
    count = cur.fetchone()[0]
    if count == 0:
        for a in DEFAULT_ARCHETYPES:
            cur.execute("""
                INSERT OR IGNORE INTO characters (id, name, tagline, description, prompt, image_url, is_locked, category, tags)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, '[]')
            """, (a["id"], a["name"], a["tagline"], a["description"], a["prompt"], a["avatar"], a["category"]))


@router.get("")
async def get_characters():
    """Returns all saved characters from the database, seeding base archetypes if empty."""
    with get_db_cursor() as cur:
        seed_archetypes_if_empty(cur)
        cur.execute("""
            SELECT id, name, tagline, description, prompt, image_url, is_locked, category, tags, created_at, updated_at
            FROM characters
            ORDER BY 
                CASE WHEN category = 'custom' THEN 0 ELSE 1 END,
                created_at DESC
        """)
        rows = cur.fetchall()

    characters = []
    for r in rows:
        tags_raw = r[8] if len(r) > 8 else "[]"
        try:
            tags = json.loads(tags_raw) if tags_raw else []
        except:
            tags = []
        characters.append({
            "id": r[0],
            "name": r[1],
            "tagline": r[2] or "",
            "description": r[3] or "",
            "prompt": r[4],
            "imageUrl": r[5],
            "image_url": r[5],
            "isLocked": bool(r[6]),
            "category": r[7] or "custom",
            "tags": tags,
            "createdAt": str(r[9]),
            "updatedAt": str(r[10])
        })
    return {"success": True, "characters": characters}


@router.post("")
async def save_character(payload: CharacterPayload):
    """Creates or updates a character in the database."""
    char_id = payload.id.strip() if payload.id and payload.id.strip() else f"char_{int(time.time()*1000)}"
    img = payload.imageUrl or payload.image_url or ""
    is_locked = 1 if (payload.isLocked or payload.is_locked) else 0
    tags_str = json.dumps(payload.tags or [])

    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO characters (id, name, tagline, description, prompt, image_url, is_locked, category, tags, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                tagline=excluded.tagline,
                description=excluded.description,
                prompt=excluded.prompt,
                image_url=excluded.image_url,
                is_locked=excluded.is_locked,
                category=excluded.category,
                tags=excluded.tags,
                updated_at=CURRENT_TIMESTAMP
        """, (
            char_id,
            payload.name.strip(),
            payload.tagline or "",
            payload.description or "",
            payload.prompt.strip(),
            img,
            is_locked,
            payload.category or "custom",
            tags_str
        ))

    return {
        "success": True,
        "character": {
            "id": char_id,
            "name": payload.name.strip(),
            "tagline": payload.tagline or "",
            "description": payload.description or "",
            "prompt": payload.prompt.strip(),
            "imageUrl": img,
            "image_url": img,
            "isLocked": bool(is_locked),
            "category": payload.category or "custom",
            "tags": payload.tags or []
        }
    }


@router.put("/{char_id}")
async def update_character(char_id: str, payload: CharacterPayload):
    """Updates an existing character in the database."""
    img = payload.imageUrl or payload.image_url or ""
    is_locked = 1 if (payload.isLocked or payload.is_locked) else 0
    tags_str = json.dumps(payload.tags or [])

    with get_db_cursor() as cur:
        cur.execute("""
            UPDATE characters
            SET name = ?, tagline = ?, description = ?, prompt = ?, image_url = ?, is_locked = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            payload.name.strip(),
            payload.tagline or "",
            payload.description or "",
            payload.prompt.strip(),
            img,
            is_locked,
            payload.category or "custom",
            tags_str,
            char_id
        ))

    return {"success": True, "id": char_id}


@router.delete("/{char_id}")
async def delete_character(char_id: str):
    """Deletes a character by ID from the database."""
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM characters WHERE id = ?", (char_id,))
        # Also unset from studio_settings if active
        cur.execute("SELECT setting_value FROM studio_settings WHERE setting_key = 'active_character'")
        row = cur.fetchone()
        if row and row[0]:
            try:
                active = json.loads(row[0])
                if active and active.get("id") == char_id:
                    cur.execute("DELETE FROM studio_settings WHERE setting_key = 'active_character'")
            except:
                pass

    return {"success": True, "deleted_id": char_id}


@router.get("/active")
async def get_active_character():
    """Retrieves the currently locked active character from studio settings."""
    with get_db_cursor() as cur:
        cur.execute("SELECT setting_value FROM studio_settings WHERE setting_key = 'active_character'")
        row = cur.fetchone()

    if not row or not row[0]:
        return {"success": True, "character": None}

    try:
        data = json.loads(row[0])
        return {"success": True, "character": data}
    except:
        return {"success": True, "character": None}


@router.post("/active")
async def set_active_character(payload: ActiveCharacterPayload):
    """Sets or clears the locked active character in database studio settings."""
    char_dict = None
    if payload.character:
        char_dict = {
            "id": payload.character.id,
            "name": payload.character.name,
            "tagline": payload.character.tagline,
            "description": payload.character.description,
            "prompt": payload.character.prompt,
            "imageUrl": payload.character.imageUrl or payload.character.image_url,
            "image_url": payload.character.imageUrl or payload.character.image_url,
            "isLocked": True,
            "category": payload.character.category or "custom"
        }
    elif payload.character_id:
        with get_db_cursor() as cur:
            cur.execute("SELECT id, name, tagline, description, prompt, image_url, category FROM characters WHERE id = ?", (payload.character_id,))
            row = cur.fetchone()
            if row:
                char_dict = {
                    "id": row[0],
                    "name": row[1],
                    "tagline": row[2] or "",
                    "description": row[3] or "",
                    "prompt": row[4],
                    "imageUrl": row[5],
                    "image_url": row[5],
                    "isLocked": True,
                    "category": row[6] or "custom"
                }

    val_str = json.dumps(char_dict) if char_dict else ""
    with get_db_cursor() as cur:
        if val_str:
            cur.execute("""
                INSERT INTO studio_settings (setting_key, setting_value, updated_at)
                VALUES ('active_character', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(setting_key) DO UPDATE SET
                    setting_value = excluded.setting_value,
                    updated_at = CURRENT_TIMESTAMP
            """, (val_str,))
        else:
            cur.execute("DELETE FROM studio_settings WHERE setting_key = 'active_character'")

    return {"success": True, "character": char_dict}
