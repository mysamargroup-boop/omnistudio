import json
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from typing import Optional, List
from limiter import limiter
from services.skills_service import skill_manager, SkillDefinition

logger = logging.getLogger("omnistudio.skills_router")

router = APIRouter(prefix="/api/skills", tags=["Skills & Directorial Plugins"])

class CreateSkillRequest(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "cinematography"
    camera_motions: Optional[List[str]] = []
    lighting_presets: Optional[List[str]] = []
    lenses: Optional[List[str]] = []
    prompt_modifiers: Optional[List[str]] = []
    negative_prompt_modifiers: Optional[List[str]] = []
    system_prompt: Optional[str] = ""

@router.get("", response_model=List[SkillDefinition])
@limiter.limit("60/minute")
async def list_skills(request: Request):
    """List all built-in and user-uploaded directorial skills."""
    return skill_manager.list_skills()

@router.get("/{skill_id}")
@limiter.limit("60/minute")
async def get_skill(skill_id: str, request: Request):
    """Retrieve details of a specific skill."""
    skill = skill_manager.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    return skill

@router.post("", response_model=SkillDefinition)
@limiter.limit("20/minute")
async def create_skill(req: CreateSkillRequest, request: Request):
    """Create or update a custom directorial skill via JSON."""
    try:
        return skill_manager.save_custom_skill(req.dict())
    except Exception as e:
        logger.error("Error creating skill: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload", response_model=SkillDefinition)
@limiter.limit("20/minute")
async def upload_skill_file(file: UploadFile = File(...), request: Request = None):
    """
    Upload a custom directorial skill configuration (.json or .yaml).
    Safely parses declarations without executing arbitrary code.
    """
    if not file.filename.endswith((".json", ".yaml", ".yml")):
        raise HTTPException(status_code=400, detail="Only .json or .yaml skill configuration files are allowed.")

    try:
        content = await file.read()
        text = content.decode("utf-8")
        if file.filename.endswith(".json"):
            data = json.loads(text)
        else:
            try:
                import yaml
                data = yaml.safe_load(text)
            except ImportError:
                # Fallback if PyYAML is not installed
                raise HTTPException(status_code=400, detail="YAML parsing unavailable. Please upload as .json.")

        if not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="Invalid skill structure. Expected a JSON/YAML object.")

        return skill_manager.save_custom_skill(data)
    except Exception as e:
        logger.error("Skill upload failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Failed to parse skill: {str(e)}")

@router.delete("/{skill_id}")
@limiter.limit("20/minute")
async def delete_skill(skill_id: str, request: Request):
    """Delete a user-uploaded custom skill. Builtin skills cannot be deleted."""
    deleted = skill_manager.delete_custom_skill(skill_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Cannot delete skill (either not found or is a protected built-in skill).")
    return {"success": True, "message": f"Skill '{skill_id}' deleted successfully."}
