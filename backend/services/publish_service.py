import os
import json
import uuid
import time
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

from config import settings
from database import get_db_cursor
import logging

logger = logging.getLogger("omnistudio.publish")

# Ensure publish output directory exists
PUBLISH_DIR = settings.OUTPUTS_PATH / "publish"
PUBLISH_DIR.mkdir(parents=True, exist_ok=True)

# 15 Supported Social Platforms Catalog
SUPPORTED_PLATFORMS: List[Dict[str, Any]] = [
    {
        "id": "instagram",
        "name": "Instagram",
        "category": "Visual & Reels",
        "formats": ["Feed Post (1:1)", "Reels (9:16)", "Stories (9:16)", "Carousel"],
        "max_chars": 2200,
        "optimal_aspect": "9:16",
        "color": "#E1306C",
        "icon": "instagram",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 20,
        "best_time_hint": "11:00 AM - 1:00 PM & 7:00 PM - 9:00 PM",
    },
    {
        "id": "facebook_pages",
        "name": "Facebook Pages",
        "category": "Social & Video",
        "formats": ["Feed Post", "Reels", "Video Broadcast", "Link Post"],
        "max_chars": 5000,
        "optimal_aspect": "16:9",
        "color": "#1877F2",
        "icon": "facebook",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 5,
        "best_time_hint": "1:00 PM - 4:00 PM",
    },
    {
        "id": "facebook_groups",
        "name": "Facebook Groups",
        "category": "Community",
        "formats": ["Discussion Post", "Community Video", "Photo Poll"],
        "max_chars": 5000,
        "optimal_aspect": "1:1",
        "color": "#0A7CFF",
        "icon": "users",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": False,
        "recommended_tags_count": 3,
        "best_time_hint": "9:00 AM - 11:00 AM",
    },
    {
        "id": "threads",
        "name": "Threads",
        "category": "Conversational",
        "formats": ["Micro-post", "Image Post", "Short Video"],
        "max_chars": 500,
        "optimal_aspect": "1:1",
        "color": "#000000",
        "icon": "at-sign",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 3,
        "best_time_hint": "8:00 AM - 10:00 AM & 8:00 PM",
    },
    {
        "id": "twitter",
        "name": "X (Twitter)",
        "category": "Microblogging",
        "formats": ["Single Tweet", "Tweet Thread", "Video Tweet"],
        "max_chars": 280,
        "optimal_aspect": "16:9",
        "color": "#1DA1F2",
        "icon": "twitter",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": False,
        "recommended_tags_count": 3,
        "best_time_hint": "8:00 AM - 10:00 AM & 12:00 PM",
    },
    {
        "id": "linkedin_personal",
        "name": "LinkedIn Personal",
        "category": "Professional",
        "formats": ["Thought Leadership", "Document Carousel", "Video Post"],
        "max_chars": 3000,
        "optimal_aspect": "1:1",
        "color": "#0A66C2",
        "icon": "linkedin",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 4,
        "best_time_hint": "9:00 AM - 11:00 AM (Tue-Thu)",
    },
    {
        "id": "linkedin_company",
        "name": "LinkedIn Company Pages",
        "category": "Corporate",
        "formats": ["Company Update", "Case Study", "Hiring / Product Video"],
        "max_chars": 3000,
        "optimal_aspect": "1.91:1",
        "color": "#004182",
        "icon": "building",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 5,
        "best_time_hint": "10:00 AM - 12:00 PM",
    },
    {
        "id": "tiktok",
        "name": "TikTok",
        "category": "Short-form Video",
        "formats": ["Vertical Video (9:16)", "Photo Slideshow"],
        "max_chars": 4000,
        "optimal_aspect": "9:16",
        "color": "#FE2C55",
        "icon": "video",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 6,
        "best_time_hint": "6:00 PM - 9:00 PM",
    },
    {
        "id": "youtube_shorts",
        "name": "YouTube Shorts",
        "category": "Short-form Video",
        "formats": ["Shorts (9:16, <60s)"],
        "max_chars": 100,
        "optimal_aspect": "9:16",
        "color": "#FF0000",
        "icon": "youtube",
        "supports_video": True,
        "supports_image": False,
        "supports_carousel": False,
        "recommended_tags_count": 4,
        "best_time_hint": "2:00 PM - 4:00 PM & 7:00 PM",
    },
    {
        "id": "youtube_videos",
        "name": "YouTube Videos",
        "category": "Long-form Cinema",
        "formats": ["Video (16:9)", "Premiere Broadcast"],
        "max_chars": 5000,
        "optimal_aspect": "16:9",
        "color": "#CC0000",
        "icon": "play-square",
        "supports_video": True,
        "supports_image": False,
        "supports_carousel": False,
        "recommended_tags_count": 15,
        "best_time_hint": "3:00 PM - 6:00 PM",
    },
    {
        "id": "pinterest",
        "name": "Pinterest",
        "category": "Discovery & Search",
        "formats": ["Idea Pin (2:3)", "Video Pin", "Product Catalog Pin"],
        "max_chars": 500,
        "optimal_aspect": "2:3",
        "color": "#BD081C",
        "icon": "image",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 8,
        "best_time_hint": "8:00 PM - 11:00 PM",
    },
    {
        "id": "snapchat",
        "name": "Snapchat Spotlight",
        "category": "Vertical Mobile",
        "formats": ["Spotlight Video (9:16)", "Public Story"],
        "max_chars": 250,
        "optimal_aspect": "9:16",
        "color": "#FFFC00",
        "icon": "zap",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": False,
        "recommended_tags_count": 4,
        "best_time_hint": "7:00 PM - 10:00 PM",
    },
    {
        "id": "telegram",
        "name": "Telegram Channels",
        "category": "Direct Broadcast",
        "formats": ["Rich Broadcast", "Media Gallery", "Instant View"],
        "max_chars": 4096,
        "optimal_aspect": "16:9",
        "color": "#229ED9",
        "icon": "send",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": True,
        "recommended_tags_count": 3,
        "best_time_hint": "10:00 AM - 12:00 PM & 6:00 PM",
    },
    {
        "id": "whatsapp",
        "name": "WhatsApp Channels",
        "category": "Mobile Broadcast",
        "formats": ["Channel Update", "Photo Card", "Voice Note"],
        "max_chars": 1024,
        "optimal_aspect": "1:1",
        "color": "#25D366",
        "icon": "message-circle",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": False,
        "recommended_tags_count": 0,
        "best_time_hint": "9:00 AM & 8:00 PM",
    },
    {
        "id": "google_business",
        "name": "Google Business Profile",
        "category": "Local Business & SEO",
        "formats": ["Offer Post", "Update / Event", "Product Showcase"],
        "max_chars": 1500,
        "optimal_aspect": "4:3",
        "color": "#4285F4",
        "icon": "map-pin",
        "supports_video": True,
        "supports_image": True,
        "supports_carousel": False,
        "recommended_tags_count": 0,
        "best_time_hint": "9:00 AM - 11:00 AM",
    }
]

def get_platform_by_id(pid: str) -> Optional[Dict[str, Any]]:
    for p in SUPPORTED_PLATFORMS:
        if p["id"] == pid:
            return p
    return None


# -----------------------------------------------------------------------------
# AI Hashtag Engine
# -----------------------------------------------------------------------------
def generate_platform_hashtags(topic: str, platform_id: str) -> Dict[str, List[str]]:
    """Generates tiered hashtags (Trending, Niche, Location, Industry) suited to platform algorithms."""
    words = [w.strip("#,.!?:;") for w in topic.split() if len(w) > 3]
    clean_topic = "".join([c for c in topic if c.isalnum() or c == " "]).strip()
    slug_topic = "".join([c for c in topic if c.isalnum()]).capitalize() or "Creative"
    
    trending = ["#Trending", "#Viral", "#NewContent", "#TrendingNow", "#ExplorePage"]
    niche = [f"#{slug_topic}", f"#{slug_topic}Life", f"#{slug_topic}Daily", f"#{slug_topic}Creators"]
    industry = ["#CreativeAI", "#OmniStudio", "#DigitalMarketing", "#ContentStrategy", "#VisualDesign"]
    location = ["#GlobalReach", "#Worldwide", "#DigitalCreator", "#ModernStudio"]
    
    if platform_id in ["linkedin_personal", "linkedin_company"]:
        return {
            "trending": ["#Innovation", "#Strategy", "#FutureOfWork"],
            "niche": [f"#{slug_topic}", f"#{slug_topic}Trends"],
            "industry": ["#MarketingStrategy", "#Technology", "#ContentMarketing"],
            "location": ["#BusinessGrowth"]
        }
    elif platform_id in ["tiktok", "youtube_shorts", "snapchat"]:
        return {
            "trending": ["#fyp", "#viral", "#foryoupage", "#trending"],
            "niche": [f"#{slug_topic.lower()}", f"#{slug_topic.lower()}tok"],
            "industry": ["#behindthescenes", "#quicktips"],
            "location": ["#creators"]
        }
    elif platform_id in ["twitter", "threads"]:
        return {
            "trending": ["#Tech", "#Creative"],
            "niche": [f"#{slug_topic}"],
            "industry": ["#OmniStudio"],
            "location": []
        }
    elif platform_id == "pinterest":
        return {
            "trending": ["#PinterestInspo", "#AestheticGoals"],
            "niche": [f"#{slug_topic}Inspo", f"#{slug_topic}Design"],
            "industry": ["#DesignTrends", "#InspirationDaily"],
            "location": ["#Moodboard"]
        }
    
    return {
        "trending": trending,
        "niche": niche,
        "industry": industry,
        "location": location
    }


# -----------------------------------------------------------------------------
# AI Platform Adaptation Engine
# -----------------------------------------------------------------------------
async def adapt_content_for_platform(
    title: str,
    base_text: str,
    platform_id: str,
    media_type: str = "image"
) -> Dict[str, Any]:
    """Transforms raw user copy into platform-native optimized caption, structure, and hashtags."""
    platform = get_platform_by_id(platform_id)
    if not platform:
        raise ValueError(f"Unknown platform ID: {platform_id}")

    topic = title or base_text[:60] or "Next-Gen AI Production"
    tags_data = generate_platform_hashtags(topic, platform_id)
    
    all_tags = []
    for category_tags in tags_data.values():
        all_tags.extend(category_tags)
    
    tag_limit = platform["recommended_tags_count"]
    selected_tags = all_tags[:tag_limit]
    tags_string = " ".join(selected_tags)

    # Tailor caption according to platform audience psychology
    if platform_id == "instagram":
        hook = f"✨ Stop scrolling. Here is something extraordinary:"
        body = f"{base_text}\n\nEvery single detail was crafted with intention to bring cinematic clarity to life."
        cta = f"👇 Drop a '🔥' in the comments if you want to see how we engineered this!\nSave this post for your moodboard 📌"
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n.\n.\n{tags_string}"
        tone = "Hook-driven, emoji-rich, community engagement"
        growth_tip = "Use high-contrast visuals in the first 3 seconds; encourage saves in the caption."

    elif platform_id == "facebook_pages":
        hook = f"📢 EXCLUSIVE LOOK: {title or 'Creative Showcase'}"
        body = f"{base_text}\n\nWe spent hours refining the visual coherence, dynamic range, and studio grading to ensure broadcast caliber standards."
        cta = f"What do you think of this approach? Let us know in the comments below! Don't forget to like and follow our page for daily releases."
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n{tags_string}"
        tone = "Conversation starter, community focus, long-form discussion"
        growth_tip = "Reply to every comment within the first 60 minutes to trigger the recommendation algorithm."

    elif platform_id == "facebook_groups":
        hook = f"Hey everyone! 👋 Wanted to share our latest project with the group:"
        body = f"{base_text}\n\nWould love to get feedback from fellow creators here. How are you handling similar production workflows in 2026?"
        cta = f"Let's discuss below!"
        caption = f"{hook}\n\n{body}\n\n{cta}"
        tone = "Peer-to-peer, conversational, soliciting feedback"
        growth_tip = "Avoid spammy links; keep questions open-ended to drive authentic responses."

    elif platform_id == "threads":
        hook = f"Here's what happens when you combine imagination with next-gen studio AI:"
        body = f"{base_text}"
        cta = f"Thoughts? 🧵"
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n{tags_string}"
        if len(caption) > 490:
            caption = caption[:485] + "..."
        tone = "Casual, candid, micro-thought"
        growth_tip = "Post controversial or curiosity-sparking opening statements to ignite replies."

    elif platform_id == "twitter":
        hook = f"⚡ {title or 'Creative Breakthrough'}:"
        body = f"{base_text[:140]}"
        cta = f"Full breakdown in the thread below 👇"
        caption = f"{hook}\n\n{body}\n\n{cta} {tags_string}"
        if len(caption) > 275:
            caption = f"{hook}\n\n{base_text[:120]}...\n\n👇 {tags_string}"
        tone = "Punchy, concise, high-velocity"
        growth_tip = "Retweet yourself with quote-tweet context 6 hours after publishing."

    elif platform_id == "linkedin_personal":
        hook = f"Most creators focus on quantity. Here is why precision craftsmanship still wins in 2026 💡"
        body = (
            f"Over the past few weeks, we set out to solve a core problem: {base_text}\n\n"
            f"Key Lessons Learned:\n"
            f"1. Cohesive aesthetics amplify perceived brand value 10x.\n"
            f"2. Automated workflows don't replace creativity—they unlock it.\n"
            f"3. High-velocity multi-channel distribution is table stakes."
        )
        cta = f"How is your team adapting your content production this year? Let's connect in the comments."
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n{tags_string}"
        tone = "Executive thought leadership, structured insights, professional"
        growth_tip = "Tag relevant contributors and respond to insightful commentary with paragraph replies."

    elif platform_id == "linkedin_company":
        hook = f"🚀 Enterprise Announcement: Elevating Visual Standards."
        body = (
            f"{base_text}\n\n"
            f"OmniStudio AI empowers modern brands to produce studio-grade cinematic media and distribute it seamlessly across global channels."
        )
        cta = f"Explore how OmniStudio AI accelerates enterprise media pipelines: Visit our platform link."
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n{tags_string}"
        tone = "Corporate, authoritative, B2B product value"
        growth_tip = "Encourage team employees to repost with their own personal commentary."

    elif platform_id == "tiktok":
        hook = f"Wait till the end to see how this was made 🤯"
        body = f"{base_text[:150]}"
        cta = f"Hit + for more studio secrets! Sound on 🔊"
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n{tags_string}"
        tone = "High-energy, youth-oriented, viral sound cue"
        growth_tip = "Ensure the first 1.5 seconds contains a high-tempo visual or audio hook."

    elif platform_id == "youtube_shorts":
        hook = f"{title or 'Unbelievable AI Result'} 🔥"
        caption = f"{hook} #Shorts {tags_string}"
        if len(caption) > 100:
            caption = caption[:96] + "..."
        tone = "Punchy search hook, minimal text"
        growth_tip = "Include #Shorts in the title and description to activate the Shorts shelf."

    elif platform_id == "youtube_videos":
        hook = f"How We Created This Masterpiece with OmniStudio AI (Step-by-Step Breakdown)"
        body = (
            f"In this video, we dive deep into the production process:\n\n"
            f"{base_text}\n\n"
            f"⏱️ CHAPTERS:\n"
            f"0:00 - Introduction & Concept\n"
            f"1:15 - AI Generation & Prompt Engineering\n"
            f"3:40 - Multi-Track Video Timeline Editing\n"
            f"5:20 - Color Grading, Relighting & AI Audio\n"
            f"7:10 - Final Export & Cross-Platform Distribution\n\n"
            f"🔗 RESOURCES & LINKS:\n"
            f"• Access OmniStudio AI: https://omnistudio.ai\n"
            f"• Join our Creator Community"
        )
        cta = f"🔔 Don't forget to LIKE, SUBSCRIBE, and ring the notification bell so you never miss a tutorial!"
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n{tags_string}"
        tone = "SEO-indexed, chaptered, comprehensive description"
        growth_tip = "Optimize the first 2 lines of the description for YouTube search keywords."

    elif platform_id == "pinterest":
        hook = f"✨ Aesthetic Moodboard: {title or 'Modern Luxury Inspiration'}"
        body = f"{base_text}\n\nSave this Pin to your creative board for instant project inspiration and design reference."
        caption = f"{hook}\n\n{body}\n\n{tags_string}"
        tone = "Search-friendly, high-intent discovery, aesthetic"
        growth_tip = "Use a 2:3 vertical pin format (1000x1500) for maximum board screen real estate."

    elif platform_id == "snapchat":
        hook = f"This took 30 seconds to generate ⚡"
        caption = f"{hook} {base_text[:80]} {tags_string}"
        tone = "Fast, informal, visual"
        growth_tip = "Add interactive lens filters or sound stickers to boost viewer completion rate."

    elif platform_id == "telegram":
        hook = f"🌟 **{title or 'Studio Production Release'}**"
        body = f"{base_text}\n\n_Engineered with OmniStudio Neural Engine 5.0._"
        cta = f"👉 [Open in OmniStudio Vault](https://omnistudio.ai)\n💬 Discuss in channel comments:"
        caption = f"{hook}\n\n{body}\n\n{cta}\n\n{tags_string}"
        tone = "Direct broadcast, markdown bold/italic formatting"
        growth_tip = "Post at consistent daily hours so subscribers develop a listening/reading routine."

    elif platform_id == "whatsapp":
        hook = f"🟢 *{title or 'OmniStudio Update'}*"
        body = f"{base_text}\n\nFresh from the studio pipeline today."
        cta = f"Tap below to view high-res version!"
        caption = f"{hook}\n\n{body}\n\n{cta}"
        tone = "Clean, direct mobile broadcast, bold headers"
        growth_tip = "Keep file sizes compact for fast mobile data loading."

    elif platform_id == "google_business":
        hook = f"🎉 FEATURED UPDATE: {title or 'Special Showcase'}"
        body = f"{base_text}\n\nExperience industry-leading creative production with OmniStudio AI."
        cta = f"Visit our website or call us today to discover how our creative solutions can transform your business!"
        caption = f"{hook}\n\n{body}\n\n{cta}"
        tone = "Local business call-to-action, promotional, professional"
        growth_tip = "Include your location name and operating hours in promotional posts."

    else:
        caption = f"{title}\n\n{base_text}\n\n{tags_string}"
        tone = "Standard"
        growth_tip = "Post consistently to maintain organic reach."

    return {
        "platform_id": platform_id,
        "platform_name": platform["name"],
        "caption": caption,
        "character_count": len(caption),
        "max_chars": platform["max_chars"],
        "is_within_limit": len(caption) <= platform["max_chars"],
        "recommended_aspect": platform["optimal_aspect"],
        "hashtags": selected_tags,
        "tone": tone,
        "growth_tip": growth_tip,
        "best_time_hint": platform["best_time_hint"],
    }


# -----------------------------------------------------------------------------
# AI Thumbnail Generator
# -----------------------------------------------------------------------------
async def generate_social_thumbnail(
    title: str,
    platform_format: str = "youtube_16_9",
    source_image_path: Optional[str] = None,
    category_badge: str = "AI MASTERCLASS",
    accent_color: str = "#6366F1"
) -> str:
    """Creates a high-contrast, platform-optimized thumbnail with bold typography, category pill, and gradient overlays."""
    # Define canvas dimensions
    format_specs = {
        "youtube_16_9": (1280, 720, "16:9"),
        "pinterest_2_3": (1000, 1500, "2:3"),
        "linkedin_banner": (1200, 628, "1.91:1"),
        "instagram_square": (1080, 1080, "1:1"),
        "facebook_post": (1200, 630, "1.91:1"),
    }
    
    width, height, aspect = format_specs.get(platform_format, (1280, 720, "16:9"))
    
    # Base canvas
    if source_image_path and Path(source_image_path).exists():
        try:
            base_img = Image.open(source_image_path).convert("RGBA")
            # Crop to aspect ratio then resize
            target_ratio = width / height
            cur_ratio = base_img.width / base_img.height
            if cur_ratio > target_ratio:
                new_w = int(base_img.height * target_ratio)
                left = (base_img.width - new_w) // 2
                base_img = base_img.crop((left, 0, left + new_w, base_img.height))
            else:
                new_h = int(base_img.width / target_ratio)
                top = (base_img.height - new_h) // 2
                base_img = base_img.crop((0, top, base_img.width, top + new_h))
            img = base_img.resize((width, height), Image.Resampling.LANCZOS)
        except Exception as e:
            logger.warning("Failed to open source image for thumbnail: %s", e)
            img = Image.new("RGBA", (width, height), (15, 17, 23, 255))
    else:
        # Create rich gradient background
        img = Image.new("RGBA", (width, height), (12, 14, 20, 255))
        gradient = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(gradient)
        for y in range(height):
            alpha = int(140 * (y / height))
            g_draw.line([(0, y), (width, y)], fill=(20, 24, 40, alpha))
        img = Image.alpha_composite(img, gradient)

    # Add dark vignette / gradient scrim at bottom and left for text readability
    scrim = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(scrim)
    # Left dark gradient
    for x in range(int(width * 0.75)):
        ratio = 1.0 - (x / (width * 0.75))
        alpha = int(210 * ratio)
        s_draw.line([(x, 0), (x, height)], fill=(5, 6, 10, alpha))
    # Bottom dark gradient
    for y in range(int(height * 0.4), height):
        ratio = (y - int(height * 0.4)) / (height * 0.6)
        alpha = int(190 * ratio)
        s_draw.line([(0, y), (width, y)], fill=(0, 0, 0, alpha))
        
    img = Image.alpha_composite(img, scrim)

    draw = ImageDraw.Draw(img)

    # Parse hex color
    h = accent_color.lstrip('#')
    try:
        rgb_accent = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        rgb_accent = (99, 102, 241)

    # Draw Category Badge Pill
    badge_text = (category_badge or "AI PRODUCTION").upper()
    pill_x = 60
    pill_y = 60 if platform_format != "pinterest_2_3" else 100
    pill_pad_x = 22
    pill_pad_y = 10
    
    # Estimate badge text width
    badge_w = len(badge_text) * 12 + pill_pad_x * 2
    badge_h = 36
    draw.rounded_rectangle(
        [pill_x, pill_y, pill_x + badge_w, pill_y + badge_h],
        radius=18,
        fill=(*rgb_accent, 240)
    )
    draw.text((pill_x + pill_pad_x, pill_y + 8), badge_text, fill=(255, 255, 255, 255))

    # Draw Bold Title Text
    clean_title = title.strip() or "Cinematic AI Generation"
    # Word wrap into lines of ~20-25 chars
    words = clean_title.split()
    lines = []
    curr = []
    max_line_len = 22 if platform_format == "pinterest_2_3" else 26
    for w in words:
        if sum(len(x) for x in curr) + len(curr) + len(w) <= max_line_len:
            curr.append(w)
        else:
            lines.append(" ".join(curr))
            curr = [w]
    if curr:
        lines.append(" ".join(curr))
    lines = lines[:3] # Max 3 lines

    text_y = pill_y + badge_h + 30
    line_height = 68 if height >= 1000 else 58
    
    for i, line in enumerate(lines):
        y_pos = text_y + (i * line_height)
        # Drop shadow
        draw.text((pill_x + 3, y_pos + 3), line.upper(), fill=(0, 0, 0, 220))
        # Main white text
        draw.text((pill_x, y_pos), line.upper(), fill=(255, 255, 255, 255))

    # Draw branding watermark at bottom right
    brand_text = "OMNISTUDIO 5.0"
    draw.text((width - 190, height - 45), brand_text, fill=(255, 255, 255, 180))

    # Add subtle accent border line on the left
    draw.rectangle([0, 0, 8, height], fill=(*rgb_accent, 255))

    # Save to disk
    out_name = f"thumb_{uuid.uuid4().hex[:10]}_{platform_format}.png"
    out_path = PUBLISH_DIR / out_name
    img.convert("RGB").save(out_path, "PNG", quality=95)

    return f"/outputs/publish/{out_name}"


# -----------------------------------------------------------------------------
# Content Repurposing Engine
# -----------------------------------------------------------------------------
async def repurpose_content(
    source_title: str,
    source_content: str,
    media_url: Optional[str] = None
) -> Dict[str, Any]:
    """Converts 1 long video or asset into 5 distinct derivative formats:
    - 3x Vertical Reels / Shorts hooks
    - 1x 5-part Tweet Thread
    - 1x 5-slide LinkedIn Carousel text breakdown
    - 1x Pinterest Idea Pin
    - 1x Instagram Interactive Story sequence
    """
    topic = source_title or source_content[:60] or "OmniStudio Masterclass"
    
    # 1. 3 Short Clips / Reels
    clips = [
        {
            "id": "clip_1",
            "title": "The Hook (Opening 0-15s)",
            "timestamp": "0:00 - 0:15",
            "script": f"Did you know you can automate full studio-grade content across 15 platforms in 1 click? Here is what happens when you use OmniStudio AI on '{topic}'.",
            "overlay_text": "THIS CHANGES EVERYTHING 🤯",
            "recommended_sound": "Trending Electronic Beat (128 BPM)"
        },
        {
            "id": "clip_2",
            "title": "The Core Secret (15-45s)",
            "timestamp": "0:15 - 0:45",
            "script": f"Instead of spending 6 hours re-editing for every social app, watch how the AI adaptation engine rewrites hooks, fixes aspect ratios, and generates hashtags instantly.",
            "overlay_text": "WORK SMARTER, NOT HARDER 💡",
            "recommended_sound": "Lo-Fi Focus & Ambience"
        },
        {
            "id": "clip_3",
            "title": "The Big Reveal & CTA (45-60s)",
            "timestamp": "0:45 - 1:00",
            "script": f"The result? 10x output speed and complete consistency across Instagram, YouTube, TikTok, and LinkedIn. Link in bio to try it yourself!",
            "overlay_text": "TRY THIS TODAY 🚀",
            "recommended_sound": "Uplifting Cinematic Crescendo"
        }
    ]

    # 2. 5-part Tweet Thread
    tweet_thread = [
        f"1/5 🧵 How to turn 1 piece of content into 15 multi-platform assets in under 3 minutes.\n\nA masterclass on high-velocity production featuring {topic} 👇",
        f"2/5 The biggest mistake creators make in 2026? Treating every platform the same.\n\nLinkedIn wants data & thought leadership. TikTok wants dopamine hooks. Instagram wants aesthetic saves.\n\nHere is how to adapt seamlessly:",
        f"3/5 ⚡ Automation Step 1: Asset Repurposing.\n\nTake your 16:9 master video. Run feathered outpainting to 9:16 for Reels, 1:1 for Facebook, and 2:3 for Pinterest.\n\nZero re-filming required.",
        f"4/5 🎯 Automation Step 2: Algorithmic Tone Adaptation.\n\nLet AI craft 15 distinct captions matching character limits, emoji density, and trending hashtag brackets.",
        f"5/5 🏁 The outcome:\n\n• 10x distribution reach\n• 0 burnout\n• Maximum brand consistency\n\nRT the first tweet if you found this valuable and follow @OmniStudioAI for daily production workflows!"
    ]

    # 3. 5-slide LinkedIn Carousel
    linkedin_carousel = [
        {"slide": 1, "heading": "THE 1-CLICK CONTENT MULTIPLIER", "body": f"How modern creators generate 15 platform assets from 1 concept: {topic}."},
        {"slide": 2, "heading": "THE BOTTLENECK", "body": "Manual re-cropping, writing 10 different captions, and managing separate calendars drains 70% of creative energy."},
        {"slide": 3, "heading": "THE SOLUTION", "body": "AI Platform Adaptation: Dynamic aspect ratios, audience-tuned hooks, and tiered hashtag syndication."},
        {"slide": 4, "heading": "THE PROVEN METRICS", "body": "+340% increase in weekly post impressions and 4.2x engagement efficiency across B2B and B2C channels."},
        {"slide": 5, "heading": "YOUR ACTION PLAN", "body": "Adopt an 'Omni-Distribution' mindset: Create once, adapt intelligently, publish everywhere simultaneously."}
    ]

    # 4. Pinterest Idea Pin
    pinterest_pin = {
        "title": f"How to Repurpose Visuals: {topic}",
        "description": f"Save this viral blueprint for turning 1 creative asset into 15 social posts without burning out! #ContentRepurposing #OmniStudio #CreatorTips #DesignInspo",
        "aspect": "2:3 (1000 x 1500)",
        "board_category": "Digital Marketing & Creator Workflows"
    }

    # 5. Instagram 3-part Interactive Story Sequence
    instagram_story = [
        {"frame": 1, "text": f"Behind the scenes of our latest production: {topic} 🔥", "interactive_element": "Poll: Have you tried AI repurposing? (Yes / Not Yet)"},
        {"frame": 2, "text": "Which platform drives the highest engagement for your brand right now?", "interactive_element": "Question Sticker: Drop your top platform!"},
        {"frame": 3, "text": "Swipe up to get our full multi-platform distribution blueprint 🚀", "interactive_element": "Link Sticker: omnistudio.ai/publish"}
    ]

    return {
        "topic": topic,
        "media_url": media_url,
        "short_clips": clips,
        "tweet_thread": tweet_thread,
        "linkedin_carousel": linkedin_carousel,
        "pinterest_pin": pinterest_pin,
        "instagram_story": instagram_story
    }


# -----------------------------------------------------------------------------
# AI Social Media Manager (Agent)
# -----------------------------------------------------------------------------
async def generate_campaign_plan(
    campaign_goal: str,
    target_audience: str = "Modern Creators & Brands",
    duration_days: int = 7
) -> Dict[str, Any]:
    """Acts as an autonomous AI Social Media Manager: generates a strategic multi-day publishing schedule across channels."""
    days_data = []
    start_date = datetime.now()
    
    platforms_pool = ["instagram", "tiktok", "youtube_shorts", "linkedin_personal", "twitter", "pinterest", "facebook_pages"]
    content_types = ["Product Spotlight", "Behind the Scenes", "Industry Insight", "Interactive Poll / Question", "User Testimonial", "Quick Tip / Hack", "High-Impact Reveal"]
    times = ["09:30 AM", "11:15 AM", "01:45 PM", "05:30 PM", "07:00 PM", "08:15 PM"]

    for i in range(min(duration_days, 14)):
        current_date = start_date + timedelta(days=i)
        day_name = current_date.strftime("%A")
        date_str = current_date.strftime("%b %d, %Y")
        
        assigned_platform = platforms_pool[i % len(platforms_pool)]
        assigned_type = content_types[i % len(content_types)]
        assigned_time = times[i % len(times)]
        
        title = f"{assigned_type}: {campaign_goal[:40]}"
        adapted = await adapt_content_for_platform(title, f"{campaign_goal} - Highlighting {assigned_type} for our audience ({target_audience}).", assigned_platform)
        
        days_data.append({
            "day_number": i + 1,
            "day_name": day_name,
            "date": date_str,
            "platform": assigned_platform,
            "platform_name": adapted["platform_name"],
            "content_type": assigned_type,
            "post_title": title,
            "recommended_time": assigned_time,
            "caption": adapted["caption"],
            "hashtags": adapted["hashtags"],
            "growth_tip": adapted["growth_tip"],
            "format": "Reel (9:16)" if assigned_platform in ["instagram", "tiktok", "youtube_shorts"] else "Post"
        })

    return {
        "campaign_goal": campaign_goal,
        "target_audience": target_audience,
        "total_posts": len(days_data),
        "duration_days": duration_days,
        "schedule": days_data
    }


# -----------------------------------------------------------------------------
# 1-Click Creator Mode
# -----------------------------------------------------------------------------
async def run_creator_mode(
    concept: str,
    media_url: Optional[str] = None
) -> Dict[str, Any]:
    """Generates complete asset suite in one click:
    ✓ Reel
    ✓ Story
    ✓ Short
    ✓ Carousel
    ✓ Post
    ✓ Caption
    ✓ Hashtags
    ✓ Thumbnail
    ✓ Ready to Publish
    """
    clean_concept = concept.strip() or "Premium AI Visual Experience"
    
    # 1. Generate Platform Captions
    ig_adapted = await adapt_content_for_platform(clean_concept, f"Experiencing {clean_concept} with OmniStudio AI.", "instagram")
    tt_adapted = await adapt_content_for_platform(clean_concept, f"Watch how {clean_concept} comes to life.", "tiktok")
    yt_adapted = await adapt_content_for_platform(clean_concept, f"{clean_concept} Tutorial & Showcase", "youtube_shorts")
    li_adapted = await adapt_content_for_platform(clean_concept, f"Key takeaways on {clean_concept}.", "linkedin_personal")
    tw_adapted = await adapt_content_for_platform(clean_concept, clean_concept, "twitter")
    
    # 2. Generate Thumbnails
    yt_thumb = await generate_social_thumbnail(clean_concept, "youtube_16_9", accent_color="#EF4444")
    pin_thumb = await generate_social_thumbnail(clean_concept, "pinterest_2_3", accent_color="#E11D48")

    # 3. Assemble complete creator kit
    return {
        "concept": clean_concept,
        "reel": {
            "platform": "Instagram / TikTok",
            "aspect": "9:16",
            "hook": f"You won't believe how this was engineered 🤯: {clean_concept}",
            "caption": ig_adapted["caption"],
            "hashtags": ig_adapted["hashtags"]
        },
        "story": {
            "platform": "Instagram / Facebook",
            "aspect": "9:16",
            "interactive": "Poll sticker: Rate this visual from 1 to 10!",
            "caption": f"Quick look at our new {clean_concept} ✨"
        },
        "short": {
            "platform": "YouTube Shorts",
            "aspect": "9:16",
            "caption": yt_adapted["caption"],
            "hashtags": yt_adapted["hashtags"]
        },
        "carousel": {
            "platform": "LinkedIn / Instagram",
            "aspect": "1:1 / 4:5",
            "slides_count": 5,
            "summary": f"5 Frameworks for mastering {clean_concept}"
        },
        "post": {
            "platform": "Multi-Platform Feed",
            "caption": li_adapted["caption"],
            "x_tweet": tw_adapted["caption"]
        },
        "thumbnails": {
            "youtube_16_9": yt_thumb,
            "pinterest_2_3": pin_thumb
        },
        "status": "ready_to_publish",
        "created_at": datetime.now().isoformat()
    }


# -----------------------------------------------------------------------------
# Database Operations: Posts, Accounts, Templates, Analytics, Workspaces
# -----------------------------------------------------------------------------
def db_get_connected_accounts() -> List[Dict[str, Any]]:
    """Returns connected social platform accounts with mock baseline if none connected."""
    with get_db_cursor() as cur:
        cur.execute("SELECT id, platform, platform_account_id, account_name, username, avatar_url, status, connected_at, metadata FROM social_accounts ORDER BY connected_at DESC")
        rows = cur.fetchall()
        accounts = []
        for r in rows:
            accounts.append({
                "id": r[0],
                "platform": r[1],
                "platform_account_id": r[2],
                "account_name": r[3],
                "username": r[4],
                "avatar_url": r[5],
                "status": r[6],
                "connected_at": r[7],
                "metadata": json.loads(r[8]) if r[8] else {}
            })
        return accounts

def db_connect_account(platform: str, account_name: str, username: str = "") -> Dict[str, Any]:
    """Connects or updates a social platform account."""
    acc_id = f"acc_{uuid.uuid4().hex[:10]}"
    avatar = f"https://api.dicebear.com/7.x/identicon/svg?seed={username or account_name}"
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT OR REPLACE INTO social_accounts (id, platform, platform_account_id, account_name, username, avatar_url, status, metadata)
            VALUES (?, ?, ?, ?, ?, ?, 'connected', '{}')
        """, (acc_id, platform, f"id_{uuid.uuid4().hex[:8]}", account_name, username or f"@{account_name.lower().replace(' ', '')}", avatar))
    return {
        "id": acc_id,
        "platform": platform,
        "account_name": account_name,
        "username": username,
        "avatar_url": avatar,
        "status": "connected"
    }

def db_disconnect_account(account_id: str) -> bool:
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM social_accounts WHERE id = ?", (account_id,))
        return cur.rowcount > 0

def db_create_post(
    title: str,
    content: str,
    platforms: List[str],
    media_urls: List[str] = None,
    media_type: str = "image",
    thumbnail_url: str = "",
    status: str = "draft",
    scheduled_at: Optional[str] = None,
    ai_adaptation: Optional[Dict[str, Any]] = None,
    workspace_id: str = "default"
) -> Dict[str, Any]:
    post_id = f"post_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now().isoformat()
    media_urls_json = json.dumps(media_urls or [])
    platforms_json = json.dumps(platforms)
    ai_adaptation_json = json.dumps(ai_adaptation or {})
    
    # Generate initial per-platform status
    status_by_platform = {p: status for p in platforms}
    status_by_platform_json = json.dumps(status_by_platform)
    
    published_at = now_iso if status == "published" else None

    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO publish_posts (
                id, title, content, media_urls, media_type, thumbnail_url, platforms,
                status, scheduled_at, published_at, status_by_platform, platform_post_ids,
                ai_adaptation, approval_status, workspace_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, 'approved', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (
            post_id, title, content, media_urls_json, media_type, thumbnail_url, platforms_json,
            status, scheduled_at, published_at, status_by_platform_json, ai_adaptation_json, workspace_id
        ))

    # If published, generate initial mock analytics
    if status == "published":
        db_record_initial_analytics(post_id, platforms)

    return db_get_post(post_id)

def db_get_post(post_id: str) -> Optional[Dict[str, Any]]:
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT id, title, content, media_urls, media_type, thumbnail_url, platforms,
                   status, scheduled_at, published_at, status_by_platform, platform_post_ids,
                   ai_adaptation, approval_status, workspace_id, is_recycled, created_at, updated_at
            FROM publish_posts WHERE id = ?
        """, (post_id,))
        r = cur.fetchone()
        if not r:
            return None
        return {
            "id": r[0],
            "title": r[1],
            "content": r[2],
            "media_urls": json.loads(r[3]) if r[3] else [],
            "media_type": r[4],
            "thumbnail_url": r[5],
            "platforms": json.loads(r[6]) if r[6] else [],
            "status": r[7],
            "scheduled_at": r[8],
            "published_at": r[9],
            "status_by_platform": json.loads(r[10]) if r[10] else {},
            "platform_post_ids": json.loads(r[11]) if r[11] else {},
            "ai_adaptation": json.loads(r[12]) if r[12] else {},
            "approval_status": r[13],
            "workspace_id": r[14],
            "is_recycled": bool(r[15]),
            "created_at": r[16],
            "updated_at": r[17]
        }

def db_list_posts(
    status: Optional[str] = None,
    workspace_id: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    query = """
        SELECT id, title, content, media_urls, media_type, thumbnail_url, platforms,
               status, scheduled_at, published_at, status_by_platform, platform_post_ids,
               ai_adaptation, approval_status, workspace_id, is_recycled, created_at, updated_at
        FROM publish_posts WHERE 1=1
    """
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if workspace_id:
        query += " AND workspace_id = ?"
        params.append(workspace_id)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    with get_db_cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        posts = []
        for r in rows:
            post = {
                "id": r[0],
                "title": r[1],
                "content": r[2],
                "media_urls": json.loads(r[3]) if r[3] else [],
                "media_type": r[4],
                "thumbnail_url": r[5],
                "platforms": json.loads(r[6]) if r[6] else [],
                "status": r[7],
                "scheduled_at": r[8],
                "published_at": r[9],
                "status_by_platform": json.loads(r[10]) if r[10] else {},
                "platform_post_ids": json.loads(r[11]) if r[11] else {},
                "ai_adaptation": json.loads(r[12]) if r[12] else {},
                "approval_status": r[13],
                "workspace_id": r[14],
                "is_recycled": bool(r[15]),
                "created_at": r[16],
                "updated_at": r[17]
            }
            if platform and platform not in post["platforms"]:
                continue
            posts.append(post)
        return posts

def db_publish_now(post_id: str) -> Dict[str, Any]:
    post = db_get_post(post_id)
    if not post:
        raise ValueError("Post not found")
    
    now_iso = datetime.now().isoformat()
    platforms = post["platforms"]
    status_by_plat = {p: "published" for p in platforms}
    post_ids_by_plat = {p: f"pub_{p[:3]}_{uuid.uuid4().hex[:6]}" for p in platforms}

    with get_db_cursor() as cur:
        cur.execute("""
            UPDATE publish_posts
            SET status = 'published', published_at = ?, status_by_platform = ?, platform_post_ids = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (now_iso, json.dumps(status_by_plat), json.dumps(post_ids_by_plat), post_id))

    db_record_initial_analytics(post_id, platforms)
    return db_get_post(post_id)

def db_approve_post(post_id: str, approved: bool = True) -> Dict[str, Any]:
    status_val = "approved" if approved else "rejected"
    with get_db_cursor() as cur:
        cur.execute("""
            UPDATE publish_posts
            SET approval_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (status_val, post_id))
    return db_get_post(post_id)

def db_delete_post(post_id: str) -> bool:
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM publish_posts WHERE id = ?", (post_id,))
        cur.execute("DELETE FROM social_analytics WHERE post_id = ?", (post_id,))
        return cur.rowcount > 0

# -----------------------------------------------------------------------------
# Auto Content Recycling
# -----------------------------------------------------------------------------
async def auto_recycle_post(post_id: str) -> Dict[str, Any]:
    """Clones a top-performing post, adapts fresh alternative hooks and copy, and schedules for the next week."""
    original = db_get_post(post_id)
    if not original:
        raise ValueError("Post not found")

    # Generate fresh alternative copy
    fresh_title = f"[Encore] {original['title']}"
    fresh_content = f"Back by popular demand 🔁: {original['content']}\n\nSince this sparked so many great conversations last week, here is an updated look!"
    
    adapted = {}
    for p in original["platforms"]:
        adapted[p] = await adapt_content_for_platform(fresh_title, fresh_content, p)

    next_week = (datetime.now() + timedelta(days=7)).isoformat()

    new_post = db_create_post(
        title=fresh_title,
        content=fresh_content,
        platforms=original["platforms"],
        media_urls=original["media_urls"],
        media_type=original["media_type"],
        thumbnail_url=original["thumbnail_url"],
        status="scheduled",
        scheduled_at=next_week,
        ai_adaptation=adapted,
        workspace_id=original["workspace_id"]
    )
    
    with get_db_cursor() as cur:
        cur.execute("UPDATE publish_posts SET is_recycled = 1 WHERE id = ?", (new_post["id"],))

    return db_get_post(new_post["id"])


# -----------------------------------------------------------------------------
# Cross-Platform Analytics & Smart Recommendations
# -----------------------------------------------------------------------------
def db_record_initial_analytics(post_id: str, platforms: List[str]):
    """Records simulated realistic initial performance metrics for published content."""
    with get_db_cursor() as cur:
        for p in platforms:
            metric_id = f"stat_{uuid.uuid4().hex[:10]}"
            # Base views variation by platform
            base_views = 850 if p in ["tiktok", "youtube_shorts", "instagram"] else 320
            views = base_views + (int(time.time()) % 400)
            reach = int(views * 1.4)
            likes = int(views * 0.08)
            comments = int(views * 0.015)
            shares = int(views * 0.02)
            saves = int(views * 0.03)
            watch_time = round(views * 14.5, 1)
            engagement = round(((likes + comments + shares + saves) / max(views, 1)) * 100, 2)
            growth = max(1, int(likes * 0.12))

            cur.execute("""
                INSERT INTO social_analytics (id, post_id, platform, views, reach, engagement_rate, likes, comments, shares, saves, watch_time_sec, followers_growth)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (metric_id, post_id, p, views, reach, engagement, likes, comments, shares, saves, watch_time, growth))

def get_analytics_summary() -> Dict[str, Any]:
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT 
                COUNT(DISTINCT post_id),
                COALESCE(SUM(views), 0),
                COALESCE(SUM(reach), 0),
                COALESCE(AVG(engagement_rate), 0.0),
                COALESCE(SUM(likes), 0),
                COALESCE(SUM(comments), 0),
                COALESCE(SUM(shares), 0),
                COALESCE(SUM(saves), 0),
                COALESCE(SUM(watch_time_sec), 0.0),
                COALESCE(SUM(followers_growth), 0)
            FROM social_analytics
        """)
        row = cur.fetchone()
        
        # Breakdown by platform
        cur.execute("""
            SELECT platform, SUM(views), SUM(likes), AVG(engagement_rate), SUM(shares)
            FROM social_analytics
            GROUP BY platform
        """)
        p_rows = cur.fetchall()
        by_platform = []
        for pr in p_rows:
            plat_meta = get_platform_by_id(pr[0])
            by_platform.append({
                "platform": pr[0],
                "platform_name": plat_meta["name"] if plat_meta else pr[0],
                "color": plat_meta["color"] if plat_meta else "#6366F1",
                "views": pr[1],
                "likes": pr[2],
                "avg_engagement": round(pr[3], 2),
                "shares": pr[4]
            })

    # If no data yet, provide baseline benchmark estimates
    total_posts = row[0] if row and row[0] > 0 else 5
    total_views = row[1] if row and row[1] > 0 else 18450
    total_reach = row[2] if row and row[2] > 0 else 24800
    avg_eng = round(row[3] if row and row[3] > 0 else 7.84, 2)
    total_likes = row[4] if row and row[4] > 0 else 1420
    total_comments = row[5] if row and row[5] > 0 else 312
    total_shares = row[6] if row and row[6] > 0 else 428
    total_saves = row[7] if row and row[7] > 0 else 512
    total_watch = round(row[8] if row and row[8] > 0 else 48200.0, 1)
    followers_growth = row[9] if row and row[9] > 0 else 385

    return {
        "total_posts_tracked": total_posts,
        "views": total_views,
        "reach": total_reach,
        "engagement_rate": avg_eng,
        "likes": total_likes,
        "comments": total_comments,
        "shares": total_shares,
        "saves": total_saves,
        "watch_time_sec": total_watch,
        "followers_growth": followers_growth,
        "by_platform": by_platform or [
            {"platform": "instagram", "platform_name": "Instagram", "color": "#E1306C", "views": 7200, "likes": 580, "avg_engagement": 8.4, "shares": 190},
            {"platform": "tiktok", "platform_name": "TikTok", "color": "#FE2C55", "views": 6100, "likes": 490, "avg_engagement": 9.1, "shares": 160},
            {"platform": "youtube_shorts", "platform_name": "YouTube Shorts", "color": "#FF0000", "views": 3400, "likes": 240, "avg_engagement": 7.2, "shares": 50},
            {"platform": "linkedin_personal", "platform_name": "LinkedIn", "color": "#0A66C2", "views": 1750, "likes": 110, "avg_engagement": 6.3, "shares": 28},
        ]
    }

def get_smart_recommendations() -> Dict[str, Any]:
    """Generates AI Smart Posting recommendations and viral opportunity signals."""
    return {
        "best_posting_times": [
            {"day": "Tuesday", "time": "11:30 AM", "platform": "LinkedIn", "expected_engagement": "+38%"},
            {"day": "Wednesday", "time": "07:15 PM", "platform": "Instagram & TikTok", "expected_engagement": "+45%"},
            {"day": "Thursday", "time": "02:00 PM", "platform": "YouTube Shorts", "expected_engagement": "+32%"},
            {"day": "Sunday", "time": "08:30 PM", "platform": "Threads & X", "expected_engagement": "+52%"}
        ],
        "viral_opportunities": [
            {
                "topic": "Behind-The-Scenes AI Outpainting",
                "format": "Split Before/After Reel (9:16)",
                "platforms": ["Instagram", "TikTok", "YouTube Shorts"],
                "reason": "Engagement with split-view workflow videos is up 64% this week across creative niches."
            },
            {
                "topic": "Multi-Channel Distribution Blueprint",
                "format": "Document Carousel (5 Slides)",
                "platforms": ["LinkedIn Personal", "Twitter Thread"],
                "reason": "B2B audience demand for agency automation frameworks peaked on Tuesday morning."
            }
        ],
        "top_performing_format": "9:16 High-Contrast Vertical Video with Auto-Captions",
        "recommended_repost_frequency": "Every 14 days with fresh alternative hooks"
    }


# -----------------------------------------------------------------------------
# Calendar View Aggregator
# -----------------------------------------------------------------------------
def get_calendar_events(month: int = None, year: int = None) -> List[Dict[str, Any]]:
    posts = db_list_posts(limit=100)
    events = []
    for p in posts:
        target_time = p["scheduled_at"] or p["published_at"] or p["created_at"]
        events.append({
            "id": p["id"],
            "title": p["title"],
            "status": p["status"],
            "date": target_time,
            "platforms": p["platforms"],
            "media_type": p["media_type"],
            "thumbnail_url": p["thumbnail_url"],
            "is_recycled": p["is_recycled"],
            "approval_status": p["approval_status"]
        })
    return events


# -----------------------------------------------------------------------------
# Publishing Templates & Workspaces
# -----------------------------------------------------------------------------
def db_list_templates() -> List[Dict[str, Any]]:
    with get_db_cursor() as cur:
        cur.execute("SELECT id, name, platforms, caption_template, hashtag_template, default_schedule_offset, tags FROM publish_templates ORDER BY created_at DESC")
        rows = cur.fetchall()
        return [
            {
                "id": r[0],
                "name": r[1],
                "platforms": json.loads(r[2]) if r[2] else [],
                "caption_template": r[3],
                "hashtag_template": r[4],
                "default_schedule_offset": r[5],
                "tags": json.loads(r[6]) if r[6] else []
            }
            for r in rows
        ]

def db_create_template(name: str, platforms: List[str], caption_template: str, hashtag_template: str = "") -> Dict[str, Any]:
    tmpl_id = f"tmpl_{uuid.uuid4().hex[:8]}"
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO publish_templates (id, name, platforms, caption_template, hashtag_template)
            VALUES (?, ?, ?, ?, ?)
        """, (tmpl_id, name, json.dumps(platforms), caption_template, hashtag_template))
    return {"id": tmpl_id, "name": name, "platforms": platforms, "caption_template": caption_template, "hashtag_template": hashtag_template}

def db_list_workspaces() -> List[Dict[str, Any]]:
    with get_db_cursor() as cur:
        cur.execute("SELECT id, name, client_name, approval_required FROM publish_workspaces")
        rows = cur.fetchall()
        if not rows:
            # Default workspace
            return [
                {"id": "default", "name": "OmniStudio Main", "client_name": "Internal Studio", "approval_required": False},
                {"id": "agency_client_1", "name": "Samar Luxury Group", "client_name": "Samar Group B2B", "approval_required": True}
            ]
        return [{"id": r[0], "name": r[1], "client_name": r[2], "approval_required": bool(r[3])} for r in rows]
