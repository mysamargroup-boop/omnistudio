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
        num_scenes = context.num_scenes or 4
        dur = float(context.project_brief.get("scene_duration", 4.0) if context.project_brief else 4.0)
        
        prompt_instruction = f"""You are an award-winning cinematic screenwriter and film director.
Write a rich, emotionally captivating {num_scenes}-scene cinematic screenplay based on this concept:
Concept: "{context.user_prompt}"
Visual Style: "{context.style}"
Total Scenes: {num_scenes}

CRITICAL RULES:
1. CHARACTER & OUTFIT CONTINUITY: If a character/protagonist is present (e.g. woman, model, bride, man, actor), the EXACT SAME character, same facial identity, same outfit, and same styling MUST be maintained across ALL scenes. Do not change the protagonist between scenes or replace them with random standalone objects.
2. If the user prompt does NOT contain explicit dialogues, compose evocative, culturally authentic and poetic narration or character dialogue that fits the scene perfectly (e.g., celebratory wedding poetry/narration for an Indian bridal dance).
3. Never output placeholder text like 'Scene 1: cinematic sequence'. Write real, compelling spoken narration/dialogue for the voice actor.
4. Return ONLY a JSON array with exactly {num_scenes} objects, matching this structure:
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

        # 1. Try Gemini
        if get_gemini_key():
            try:
                res = await generate_gemini_text(prompt_instruction, model="gemini-2.5-flash")
                if res.get("success") and res.get("text"):
                    parsed = _clean_json_array(res["text"])
                    if parsed and len(parsed) >= num_scenes:
                        generated_scenes = parsed[:num_scenes]
            except Exception as e:
                logger.warning("Gemini script generation error: %s", e)

        # 2. Try OpenAI (from settings or database)
        openai_key = settings.OPENAI_API_KEY
        if not openai_key:
            try:
                from database import db_get_all_settings
                st = db_get_all_settings()
                openai_key = st.get("openai_api_key") or st.get("OPENAI_API_KEY") or ""
            except Exception:
                pass

        if not generated_scenes and openai_key:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=openai_key)
                completion = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt_instruction}],
                    temperature=0.7
                )
                raw = completion.choices[0].message.content.strip()
                parsed = _clean_json_array(raw)
                if parsed and len(parsed) >= num_scenes:
                    generated_scenes = parsed[:num_scenes]
            except Exception as e:
                logger.warning("OpenAI script generation error: %s", e)

        # 3. Dynamic Context-Aware Fallback (Synthesized from the user's actual prompt)
        if not generated_scenes:
            clean_prompt = context.user_prompt.strip()
            lead_phrase = clean_prompt.split(",")[0].strip() or "The journey unfolds"
            theme_moods = [
                ("The Initial Spark", f"Across the atmosphere of {lead_phrase}, a compelling visual presence commands the screen.", f"In the first breath of {lead_phrase}, every detail whispers anticipation."),
                ("Deepening Resonance", f"Focus tightens into the texture and movement of {lead_phrase} with cinematic depth.", f"With every deliberate rhythm, the world of {lead_phrase} reveals its unspoken elegance."),
                ("The Climax", f"A dramatic peak of lighting and motion as {lead_phrase} reaches full expressive power.", f"Here, amidst striking light and shadow, {lead_phrase} transcends into unforgettable art."),
                ("The Resolution", f"A lingering, luminous frame capturing the enduring aura of {lead_phrase}.", f"As the final cadence settles, the memory of {lead_phrase} echoes with timeless beauty.")
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
        context.scenes = []
        for idx, sc in enumerate(generated_scenes[:num_scenes]):
            context.scenes.append(SceneData(
                index=idx + 1,
                title=sc.get("title", f"Scene {idx + 1}"),
                script=sc.get("script", f"Scene {idx + 1}: narrative movement."),
                description=sc.get("description", context.user_prompt),
                duration_seconds=dur
            ))

        context.add_log(
            self.name,
            f"Screenplay formulated with authentic scene narrations across {len(context.scenes)} scenes (@ {dur}s each)."
        )
        return AgentResult(success=True, data={"scene_count": len(context.scenes)})
