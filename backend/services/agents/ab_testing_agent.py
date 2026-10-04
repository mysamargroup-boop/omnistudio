import json
import logging
from typing import List, Dict, Any
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.gemini_service import get_gemini_key, generate_gemini_text
from config import settings

logger = logging.getLogger("omnistudio.agents.ab_testing")

class ABTestingAgent(BaseAgent):
    name = "ABTestingAgent"
    description = "Formulates 3 distinct high-converting opening hook variants (Curiosity Gap, Contrarian, Direct Action) for audience split-testing."
    icon = "split"

    async def execute(self, context: PipelineContext) -> AgentResult:
        first_scene = context.scenes[0] if context.scenes else None
        first_script = first_scene.script if first_scene else (context.user_prompt or "Cinematic Film")
        prompt = context.user_prompt or "Cinematic video"

        instruction = f"""You are a master of video hook psychology (MrBeast / Auteur style).
Create 3 high-converting, distinct opening 3-second hook voiceover/text variants for this video:

Video Concept: "{prompt}"
Current Opening: "{first_script}"

Generate 3 diverse hooks:
1. "Curiosity Gap": Intrigues the viewer with a question or mystery.
2. "Contrarian / Disruptive": Challenges common beliefs or shocks the viewer.
3. "High-Stakes Action": Drops the viewer straight into dramatic visual tension.

Return ONLY a valid JSON array of 3 strings:
["Hook variant 1...", "Hook variant 2...", "Hook variant 3..."]
"""
        hooks = None
        if get_gemini_key():
            try:
                res_text = await generate_gemini_text(instruction)
                if res_text:
                    clean = res_text.strip()
                    if clean.startswith("```json"):
                        clean = clean[7:]
                    elif clean.startswith("```"):
                        clean = clean[3:]
                    if clean.endswith("```"):
                        clean = clean[:-3]
                    hooks = json.loads(clean.strip())
            except Exception as e:
                logger.warning("Gemini A/B testing hook error: %s", e)

        if not hooks and settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a video hook specialist. Output valid JSON array of 3 strings only."},
                        {"role": "user", "content": instruction}
                    ]
                )
                raw = resp.choices[0].message.content
                if raw:
                    hooks = json.loads(raw.strip())
            except Exception as oe:
                logger.warning("OpenAI A/B hook error: %s", oe)

        if not hooks or not isinstance(hooks, list):
            hooks = [
                f"What if everything you knew about {prompt.lower()[:30]} was a lie?",
                f"They told us this was impossible. Look what happened next.",
                f"Before you scroll away, remember this moment."
            ]

        if not context.project_brief:
            context.project_brief = {}
        context.project_brief["ab_hook_variants"] = hooks
        context.add_log(self.name, f"Synthesized 3 A/B test hooks: '{hooks[0][:40]}...'")

        return AgentResult(success=True, data={"ab_hooks": hooks})
