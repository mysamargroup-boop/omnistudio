import json
import logging
import re
from typing import Optional, List, Dict, Any
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult, SceneData
from services.gemini_service import get_gemini_key, generate_gemini_text
from config import settings

logger = logging.getLogger("omnistudio.agents.script")

class ScriptWriterAgent(BaseAgent):
    name = "ScriptWriterAgent"
    description = "Crafts authentic cinematic screenplay, narrative voiceover, and character dialogues for each scene"
    icon = "file-text"

    async def execute(self, context: PipelineContext) -> AgentResult:
        # Skip if user provided detailed storyboard (preserve_user_scenes flag)
        if context.preserve_user_scenes:
            context.add_log(self.name, "Storyboard preservation mode active — skipping AI screenplay generation to preserve user's scene specifications.")
            return AgentResult(success=True)
        
        num_scenes = context.num_scenes or 4
        dur = float(context.project_brief.get("scene_duration", 4.0) if context.project_brief else 4.0)

        char_block = ""
        if context.character_lock and context.character_name:
            char_block = f"""
CHARACTER LOCK ENFORCED:
- Locked Protagonist Name: {context.character_name}
- Appearance & Visual Styling: {context.character_prompt or "Maintain exact facial identity and styling"}
- Continuity Directive: You MUST feature {context.character_name} across ALL {num_scenes} scenes. Keep the exact same appearance, attire, and character traits in every single scene description.
"""
        
        prompt_instruction = f"""You are an award-winning cinematic screenwriter and film director.
Write a rich, emotionally captivating {num_scenes}-scene cinematic screenplay based on this concept:
Concept: "{context.user_prompt}"
Visual Style: "{context.style}"
Total Scenes: {num_scenes}
{char_block}
CRITICAL RULES:
1. CHARACTER & OUTFIT CONTINUITY: If a character/protagonist is present (e.g. woman, model, bride, man, actor), the EXACT SAME character, same facial identity, same outfit, and same styling MUST be maintained across ALL scenes. Do not change the protagonist between scenes or replace them with random standalone objects.
2. If the user prompt does NOT contain explicit dialogues, compose evocative, culturally authentic and poetic narration or character dialogue that fits the scene perfectly (e.g., celebratory wedding poetry/narration for an Indian bridal dance).
3. Never output placeholder text like 'Scene 1: cinematic sequence'. Write real, compelling spoken narration/dialogue for the voice actor.
4. STAY FAITHFUL: Scene descriptions and scripts MUST accurately reflect ONLY what the user described in their concept. Do not add, change, or replace the subject, setting, or atmosphere with anything the user did not write.
5. The visual style "{context.style}" controls ONLY cinematography (camera, lighting, grading) — it must NEVER change the subject matter or setting.
6. Return ONLY a JSON array with exactly {num_scenes} objects, matching this structure:
[
  {{
    "scene_number": 1,
    "title": "Scene 1: The Royal Entrance",
    "description": "Visual action description of what is visible on camera featuring the protagonist...",
    "script": "Poetic, immersive spoken dialogue or voiceover narration (20-30 words)..."
  }}
]
"""
        generated_scenes = []

        def _clean_json_array(text: str) -> Optional[List[Dict[str, Any]]]:
            if not text:
                return None
            cleaned = re.sub(r'^```(?:json)?\s*', '', text.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r'\s*```$', '', cleaned.strip(), flags=re.MULTILINE)
            match = re.search(r'\[.*\]', cleaned, re.DOTALL)
            if not match:
                return None
            raw_json = match.group(0)
            raw_json = re.sub(r',\s*([\]}])', r'\1', raw_json)
            try:
                parsed = json.loads(raw_json)
                if isinstance(parsed, list) and len(parsed) >= 1:
                    return parsed
            except Exception:
                pass
            return None

        # 1. Try OpenAI (Tier 1 Primary for Script & Dialogue Writing)
        from services.openai_service import get_openai_key, generate_openai_chat
        openai_key = get_openai_key()
        if openai_key:
            try:
                res = await generate_openai_chat(
                    messages=[
                        {"role": "system", "content": "You are an award-winning cinematic screenwriter and film director."},
                        {"role": "user", "content": prompt_instruction}
                    ],
                    model="gpt-4o",
                    temperature=0.7
                )
                if res.get("success") and res.get("text"):
                    parsed = _clean_json_array(res["text"])
                    if parsed and len(parsed) >= num_scenes:
                        generated_scenes = parsed[:num_scenes]
                        logger.info("ScriptWriter successfully generated screenplay with OpenAI %s", res.get("model"))
            except Exception as e:
                logger.warning("OpenAI script generation error: %s, falling back to Gemini", e)

        # 2. Try Gemini (Tier 2 Fallback)
        if not generated_scenes and get_gemini_key():
            try:
                res = await generate_gemini_text(prompt_instruction, model="gemini-2.5-flash")
                if res.get("success") and res.get("text"):
                    parsed = _clean_json_array(res["text"])
                    if parsed and len(parsed) >= num_scenes:
                        generated_scenes = parsed[:num_scenes]
            except Exception as e:
                logger.warning("Gemini script generation error: %s", e)

        # 3. Dynamic Context-Aware Fallback (Synthesized from the user's actual prompt)
        if not generated_scenes:
            clean_prompt = context.user_prompt.strip()
            theme_moods = [
                ("The Establishing Vision", clean_prompt, f"In this serene moment: {clean_prompt[:120]}..."),
                ("Deepening Focus", f"Detailed close-up and atmospheric texture: {clean_prompt}", f"Every deliberate detail tells an authentic story."),
                ("The Expressive Peak", f"Dynamic cinematic motion and emotional crescendo: {clean_prompt}", f"Amidst striking light and natural grace, the moment transcends into art."),
                ("The Lasting Aura", f"A lingering, luminous frame capturing: {clean_prompt}", f"The echoes of this moment leave a timeless, unforgettable impression.")
            ]

            generated_scenes = []
            for i in range(num_scenes):
                idx_mod = i % len(theme_moods)
                m_title, m_desc, m_script = theme_moods[idx_mod]
                generated_scenes.append({
                    "scene_number": i + 1,
                    "title": f"Scene {i + 1}: {m_title}",
                    "description": m_desc,
                    "script": m_script
                })

        # Populate context.scenes strictly with 1-based indexing
        scene_durations = (context.project_brief or {}).get("scene_durations", [])
        context.scenes = []
        for idx, sc in enumerate(generated_scenes[:num_scenes]):
            sc_dur = scene_durations[idx] if idx < len(scene_durations) else dur
            context.scenes.append(SceneData(
                index=idx + 1,
                title=sc.get("title", f"Scene {idx + 1}"),
                script=sc.get("script", f"Scene {idx + 1}: narrative movement."),
                description=sc.get("description", context.user_prompt),
                duration_seconds=sc_dur
            ))

        total_sc_dur = sum(s.duration_seconds for s in context.scenes)
        char_msg = f" Enforced character continuity for '{context.character_name}'." if context.character_lock and context.character_name else ""
        context.add_log(
            self.name,
            f"Screenplay formulated with authentic scene narrations across {len(context.scenes)} scenes (total: ~{int(total_sc_dur)}s).{char_msg}"
        )
        return AgentResult(success=True, data={"scene_count": len(context.scenes)})
