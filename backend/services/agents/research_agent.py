import json
import logging
from typing import Dict, Any, List
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.gemini_service import get_gemini_key, generate_gemini_text
from config import settings

logger = logging.getLogger("omnistudio.agents.research")

class ResearchAgent(BaseAgent):
    name = "ResearchAgent"
    description = "Discovers viral cultural tropes, trending visual motifs, competitive angles, and emotional subtext for the story concept."
    icon = "compass"

    async def execute(self, context: PipelineContext) -> AgentResult:
        prompt = context.user_prompt or "Cinematic Film"
        style = context.style or "cinematic"

        instruction = f"""You are a creative researcher and cultural trend analyst for high-end film and advertising productions.
Analyze this creative brief to discover viral narrative tropes, aesthetic motifs, and audience resonance factors:

Concept: "{prompt}"
Visual Style: "{style}"

Generate:
1. "audience_angle": The core emotional trigger and why viewers will care.
2. "trending_motifs": 3-4 visual symbols or aesthetic motifs to feature on camera.
3. "cinematic_references": 2-3 iconic films, directors, or photography styles that inspire this look.
4. "core_keywords": 5 high-impact thematic keywords.

Return ONLY a valid JSON object matching this schema:
{{
  "audience_angle": "string",
  "trending_motifs": ["motif 1", "motif 2", "motif 3"],
  "cinematic_references": ["reference 1", "reference 2"],
  "core_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}}
"""
        research_data = None
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
                    research_data = json.loads(clean.strip())
            except Exception as e:
                logger.warning("Gemini research agent error: %s", e)

        if not research_data and settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a creative director researcher. Respond with valid JSON only."},
                        {"role": "user", "content": instruction}
                    ],
                    response_format={"type": "json_object"}
                )
                raw = resp.choices[0].message.content
                if raw:
                    research_data = json.loads(raw)
            except Exception as oe:
                logger.warning("OpenAI research agent error: %s", oe)

        if not research_data:
            research_data = {
                "audience_angle": "Emotional wonder and visual realism that grips the viewer instantly.",
                "trending_motifs": ["Volumetric atmospheric lighting", "Macro textural focus", "Dynamic kinetic parallax"],
                "cinematic_references": ["Roger Deakins ASC", "Denis Villeneuve", "Terrence Malick"],
                "core_keywords": ["immersion", "auteur", "depth", "realism", "atmosphere"]
            }

        if not context.project_brief:
            context.project_brief = {}
        context.project_brief["creative_research"] = research_data
        context.add_log(self.name, f"Completed creative research: Identified '{research_data.get('audience_angle', '')[:50]}...'")

        return AgentResult(success=True, data=research_data)
