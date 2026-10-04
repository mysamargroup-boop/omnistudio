import json
import logging
from typing import Optional, Dict, Any, List
from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult
from services.gemini_service import get_gemini_key, generate_gemini_text
from config import settings

logger = logging.getLogger("omnistudio.agents.social_copy")

class SocialCopyAgent(BaseAgent):
    name = "SocialCopyAgent"
    description = "Generates high-engagement YouTube title, Instagram/TikTok captions, trending hashtags, and viral hooks."
    icon = "share-2"

    async def execute(self, context: PipelineContext) -> AgentResult:
        prompt = context.user_prompt or "Cinematic Film"
        style = context.style or "cinematic"
        scene_summary = " ".join([s.script for s in context.scenes if s.script]) or prompt

        instruction = f"""You are an elite social media strategist and viral content copywriter.
Analyze this video concept and script to generate high-performing publication copy:

Video Topic: "{prompt}"
Cinematic Palette: "{style}"
Narrative Excerpt: "{scene_summary[:400]}"

Generate:
1. title: An irresistible, clickable YouTube/Vimeo video title (max 70 chars).
2. caption: An engaging, poetic social caption for Instagram/LinkedIn/TikTok with storytelling appeal (80-120 words).
3. hashtags: 6-10 highly relevant trending hashtags (e.g. ["#filmmaking", "#cinematic", "#aivideo"]).
4. ab_hooks: 3 punchy 3-second opening hook variants for A/B testing viewer retention.

Return ONLY a valid JSON object matching this schema:
{{
  "title": "string",
  "caption": "string",
  "hashtags": ["#tag1", "#tag2"],
  "ab_hooks": ["Hook 1", "Hook 2", "Hook 3"]
}}
"""
        copy_data = None
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
                    copy_data = json.loads(clean.strip())
            except Exception as e:
                logger.warning("Gemini social copy generation error: %s", e)

        if not copy_data and settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a viral social media strategist. Respond with valid JSON only."},
                        {"role": "user", "content": instruction}
                    ],
                    response_format={"type": "json_object"}
                )
                raw = resp.choices[0].message.content
                if raw:
                    copy_data = json.loads(raw)
            except Exception as oe:
                logger.warning("OpenAI social copy generation error: %s", oe)

        if not copy_data:
            copy_data = {
                "title": f"{prompt.capitalize()} | Cinematic 4K Master",
                "caption": f"An evocative cinematic visual journey exploring {prompt.lower()}. Captured with rich atmospheric depth and neural soundscapes.",
                "hashtags": ["#cinematography", "#filmmaking", "#aicinema", "#visualstorytelling", "#director"],
                "ab_hooks": [
                    f"What if {prompt.lower()} looked like this?",
                    f"The secret behind {prompt.lower()}.",
                    "Watch this until the very end."
                ]
            }

        # Store in context
        if not context.project_brief:
            context.project_brief = {}
        context.project_brief["social_copy"] = copy_data
        context.add_log(self.name, f"Synthesized publication copy: '{copy_data.get('title')}' with {len(copy_data.get('hashtags', []))} trending tags.")

        return AgentResult(success=True, data=copy_data)
