export interface PromptItem {
  id: string;
  category: "jewellery" | "bridal" | "poses" | "consistent_video" | "realism" | "fashion" | "commercial" | "cinematic";
  subCategory?: string;
  title: string;
  badge: string;
  recommendedRatio: "9:16" | "16:9" | "1:1" | "4:5";
  description: string;
  prompt: string;
  negativePrompt?: string;
  tags: string[];
  cameraDetails?: string;
  isCustomizableJewellery?: boolean;
}

export const UNIVERSAL_REALISM_TAG =
  "natural Indian facial features, realistic skin texture, visible pores, subtle peach fuzz, tiny skin imperfections, minor pimple marks only visible when zoomed in, soft natural makeup, realistic eyelashes, detailed eyes, natural lip texture, authentic skin undertones, no plastic skin, no beauty filter effect, no CGI appearance, no AI generated look, premium fashion photography, ultra realistic face, cinematic color grading";

export const MASTER_NEGATIVE_PROMPT =
  "Plastic skin, glass skin, beauty filter, airbrushed skin, doll face, CGI, 3D render, cartoon, perfect symmetry, over sharpened eyes, excessive makeup, fake eyelashes, oversaturated colors, unrealistic lighting, wax skin, AI generated look, fashion doll, hyper retouched face, extra fingers, distorted limbs, duplicate jewellery";

export const VIDEO_CONSISTENCY_NEGATIVE_PROMPT =
  "Do not change the face, do not change the outfit, do not change jewellery, no face morphing, no identity drift, no age change, no hairstyle change, no outfit redesign, no color change, no extra accessories, no extra people, no cartoon look, no AI artifacts, no distorted hands, no flickering, no duplicate limbs, no text, no watermark, no logo. Keep the dress and face identical throughout the entire video.";

export const PROMPT_LIBRARY_DATA: PromptItem[] = [
  // ==========================================
  // 1. CELEBRITY JEWELLERY CAMPAIGNS & HERO SHOTS (From Tab 1 & Tab 4)
  // ==========================================
  {
    id: "jewel_million_dollar_hero",
    category: "jewellery",
    subCategory: "Hero Campaign",
    title: "Million-Dollar Campaign Hero Shot",
    badge: "HERO SHOT 8K",
    recommendedRatio: "4:5",
    description: "Ultra-close cinematic portrait with jewellery as the hero subject, rich lighting, and natural diamond dispersion.",
    prompt:
      "Ultra close cinematic portrait, luxury jewellery as hero subject, rich luxury lighting, natural skin pores, premium diamond reflections, medium telephoto lens, high-end jewellery campaign, magazine cover quality, photorealistic 8K.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cameraDetails: "Sony A7R V, 105mm macro, f/1.8",
    tags: ["jewellery", "hero", "diamond", "campaign", "8k"],
  },
  {
    id: "jewel_first_image_style",
    category: "jewellery",
    subCategory: "Celebrity Endorsement",
    title: "Tanishq / Kalyan Celebrity Endorsement Close-Up",
    badge: "CELEBRITY STYLE",
    recommendedRatio: "4:5",
    description: "24-year-old fair Indian model with expressive eyes, delicate features, diamond earrings and statement ring with soft window light.",
    prompt:
      "A 24-year-old fair Indian female model with large expressive eyes, delicate facial features and naturally radiant skin. Close-up luxury jewellery campaign portrait. Looking directly into the camera with a soft confident expression. One hand gently placed near her chin. Long silky dark hair styled half-tied with subtle volume. Wearing elegant diamond earrings and statement ring. Soft pink matte lipstick, natural blush, realistic skin texture with visible pores only at extreme zoom level. Front-facing composition, head slightly tilted by a few degrees, eyes sharply focused. Luxury indoor environment with creamy neutral background, subtle depth and soft bokeh. Large window light illuminating the face evenly. Cinematic beauty photography. 105mm lens, f/1.8, Sony A7R V. Extremely detailed eyes, premium jewellery advertisement, celebrity endorsement campaign aesthetic, shallow depth of field, ultra realistic photography, high-end Indian fashion campaign, natural skin rendering, sharp focus on eyes and jewellery, 8K.",
    negativePrompt:
      "AI generated face, beauty filter, plastic skin, glass skin, CGI, doll face, airbrushed skin, excessive skin smoothing, fake eyelashes, over sharpened eyes, hyper realistic render, cartoon, 3D render.",
    cameraDetails: "Sony A7R V, 105mm lens, f/1.8",
    tags: ["jewellery", "celebrity", "earrings", "ring", "portrait", "8k"],
  },
  {
    id: "jewel_second_image_style",
    category: "jewellery",
    subCategory: "High Fashion Editorial",
    title: "Over-The-Shoulder Couture Jewellery Editorial",
    badge: "VOGUE INDIA",
    recommendedRatio: "9:16",
    description: "26-year-old Indian model in low ponytail, embroidered couture, premium diamond earrings, dark blue textured backdrop.",
    prompt:
      "A 26-year-old fair Indian female model with elegant facial structure and luxurious dark hair styled into a textured low ponytail. High-fashion jewellery editorial portrait. Over-the-shoulder pose, upper body turned away from camera while face turns back toward viewer. Looking slightly past the camera with a confident cinematic expression. Wearing designer embroidered couture outfit with intricate beadwork and premium diamond earrings. Soft matte makeup with realistic skin texture, natural pores and subtle imperfections visible only under extreme zoom. Clean jawline, soft cheek highlights, realistic hair strands. Dark blue textured studio backdrop with premium fashion campaign styling. Dramatic Rembrandt lighting from camera left, gentle shadow falloff across face, background darker than subject. Medium telephoto compression. Shot on Canon R5, 135mm lens, f/2.0. Luxury jewellery advertisement, celebrity photoshoot style, fashion editorial quality, cinematic portrait photography, ultra realistic skin rendering, 8K quality.",
    negativePrompt:
      "Plastic skin, beauty filter, wax skin, CGI, artificial eyes, doll face, fashion illustration, cartoon, over processed skin.",
    cameraDetails: "Canon R5, 135mm lens, f/2.0",
    tags: ["jewellery", "editorial", "rembrandt", "couture", "vogue"],
  },
  {
    id: "jewel_orange_background_saree",
    category: "jewellery",
    subCategory: "Studio Saree",
    title: "Wine-Purple Saree & Gold Jhumkas (Vibrant Studio)",
    badge: "STUDIO AD",
    recommendedRatio: "9:16",
    description: "Wine-purple silk saree with gold zari bird motifs, statement jhumka earrings, on seamless vibrant studio backdrop.",
    prompt:
      "Ultra-realistic Indian fashion studio photoshoot, stunning Indian woman wearing a royal wine-purple silk saree with intricate gold zari bird motifs and heavily embroidered border, matching designer blouse, statement gold jhumka earrings, elegant low bun hairstyle, subtle bridal-inspired makeup, soft glowing skin, confident expression, plain vibrant orange seamless studio backdrop, luxury ethnic fashion campaign, Vogue India editorial photography, professional beauty lighting, softbox key light, clean studio environment, fashion catalogue shoot, ultra detailed saree fabric texture, realistic skin texture, high-end commercial photography, 85mm lens, shallow depth of field, luxury saree advertisement, magazine-quality photoshoot, extremely realistic, 8K.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cameraDetails: "85mm lens, softbox key light, f/2.0",
    tags: ["saree", "jhumka", "gold", "studio", "fashion", "8k"],
  },
  {
    id: "jewel_kundan_velvet_lehenga",
    category: "jewellery",
    subCategory: "Heritage Kundan",
    title: "Couture Velvet Lehenga & Royal Kundan Set",
    badge: "SABYASACHI STYLE",
    recommendedRatio: "9:16",
    description: "29-year-old Indian woman in premium kundan set and couture velvet lehenga, soft cinematic lighting, luxury palace interior.",
    prompt:
      "A 29-year-old Indian woman wearing premium kundan set and couture velvet lehenga. Looking directly forward. Luxury indoor background with elegant architecture. Soft cinematic lighting. Realistic skin, photorealistic fashion photography, unretouched skin, visible pores, natural asymmetry, RAW photograph, soft directional lighting, candid pose, 85mm lens.",
    negativePrompt:
      "AI look, CGI, cartoon, doll face, plastic skin, over-retouched skin, excessive beauty filter, exaggerated makeup, oversaturated colors, low resolution, blurry eyes, distorted hands, extra fingers, duplicate jewellery, wax skin, fake pores, unrealistic facial symmetry, over sharpened skin, anime, illustration, painting.",
    cameraDetails: "Sony A7R V, 85mm GM, f/1.8",
    tags: ["kundan", "lehenga", "velvet", "heritage", "sabyasachi"],
  },
  {
    id: "jewel_short_staircase",
    category: "jewellery",
    subCategory: "Ready Pose",
    title: "Royal Staircase Necklace Hero Pose",
    badge: "1-LINE SHORT",
    recommendedRatio: "9:16",
    description: "Standing on luxury staircase, one hand on railing, modern lehenga, necklace hero focus.",
    prompt:
      "Keep exact model face and exact uploaded jewellery. Standing on luxury staircase, one hand on railing, looking directly at camera, modern designer lehenga, Sony A7R V, 90mm macro lens, f/2.8, necklace hero focus, natural skin texture, cinematic editorial lighting, photorealistic RAW.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["staircase", "necklace", "sony", "macro", "short"],
  },
  {
    id: "jewel_short_hand_framing",
    category: "jewellery",
    subCategory: "Ready Pose",
    title: "Hand Framing Necklace Close-Up",
    badge: "MACRO HERO",
    recommendedRatio: "1:1",
    description: "Both hands softly framing necklace, looking at camera, elegant lehenga, macro jewellery photography.",
    prompt:
      "Keep exact model face and exact uploaded jewellery. Both hands softly framing necklace, looking at camera, elegant lehenga, macro jewellery photography, luxury advertising campaign, Sony A7R V, 90mm macro lens, f/2.8, natural skin texture, 8k.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["macro", "hands", "necklace", "advertising"],
  },
  {
    id: "jewel_short_window_light",
    category: "jewellery",
    subCategory: "Ready Pose",
    title: "Window Light Elegance Necklace Focus",
    badge: "NATURAL LIGHT",
    recommendedRatio: "4:5",
    description: "Standing beside large window, soft natural light, direct gaze, necklace sharply focused.",
    prompt:
      "Keep exact model face and exact uploaded jewellery. Standing beside large window, soft natural light, direct gaze, designer lehenga, necklace sharply focused, photorealistic luxury portrait, Sony A7R V, 85mm lens, f/1.8.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["window", "natural", "portrait", "necklace"],
  },

  // ==========================================
  // 2. 20 LIGHTING & ENVIRONMENT PRESETS (From Tab 4)
  // ==========================================
  {
    id: "light_window_royal_portrait",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "1. Window Light Royal Palace Portrait",
    badge: "PALACE LIGHT",
    recommendedRatio: "9:16",
    description: "25-year-old Indian woman in blush pink lehenga, rose gold jewellery, carved sandstone window daylight.",
    prompt:
      "25-year-old Indian woman wearing trending blush pink embroidered lehenga, rose gold jewellery set, standing near a grand palace window, soft morning daylight entering from the side, natural shadows, elegant hand near neckline, realistic skin texture, minor pimple marks visible only on close inspection, luxury palace interiors, carved sandstone architecture, cinematic atmosphere, Sony A7R V, 85mm lens, f/1.8, shallow depth of field, editorial jewellery campaign, ultra realistic.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["blush-pink", "rose-gold", "palace", "window-light", "8k"],
  },
  {
    id: "light_golden_hour_courtyard",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "2. Golden Hour Courtyard Rim Light",
    badge: "GOLDEN HOUR",
    recommendedRatio: "9:16",
    description: "Pastel peach designer lehenga, diamond jewellery, golden hour rim lighting in royal courtyard.",
    prompt:
      "Indian fashion model wearing trending pastel peach designer lehenga, diamond jewellery, standing inside a royal courtyard during golden hour, warm sunlight creating rim light around hair, cinematic shadows, luxurious palace background, realistic skin pores, natural makeup, Canon R5, 135mm lens, f/2.0, luxury bridal campaign.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["peach", "diamond", "golden-hour", "rim-light", "courtyard"],
  },
  {
    id: "light_soft_overcast_luxury",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "3. Soft Overcast Luxury Haveli",
    badge: "DIFFUSED LIGHT",
    recommendedRatio: "9:16",
    description: "Ivory organza saree, delicate diamond jewellery, soft cloudy daylight in heritage haveli setting.",
    prompt:
      "Young Indian woman wearing ivory organza saree with delicate diamond jewellery, luxury haveli setting, soft cloudy daylight, diffused natural lighting, realistic skin imperfections, elegant pose, muted cinematic tones, Nikon Z8, 105mm lens, f/2.2.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["organza", "saree", "haveli", "overcast", "nikon"],
  },
  {
    id: "light_moody_editorial_dark",
    category: "fashion",
    subCategory: "Lighting & Environment",
    title: "4. Moody Dark Studio Editorial",
    badge: "REMBRANDT",
    recommendedRatio: "9:16",
    description: "Champagne gold lehenga, rose-gold jewellery, dark luxury studio background, dramatic side lighting.",
    prompt:
      "Indian model in trending champagne gold lehenga, rose-gold jewellery, dark luxury studio background, dramatic side lighting, deep shadows, fashion magazine editorial style, realistic facial texture, premium jewellery advertisement, Hasselblad X2D, 90mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["champagne", "hasselblad", "dark-studio", "editorial"],
  },
  {
    id: "light_candlelight_luxury",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "5. Candlelight Palace Luxury Scene",
    badge: "LOW-LIGHT 4K",
    recommendedRatio: "9:16",
    description: "Wine-red lehenga, diamond necklace set, surrounded by candles and palace decor, warm glow.",
    prompt:
      "Beautiful Indian woman wearing wine-red designer lehenga, diamond necklace set, surrounded by candles and palace décor, cinematic low-light environment, warm candle glow on face, realistic skin details, luxury bridal fashion photography, Sony A1, 85mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["candlelight", "wine-red", "low-light", "diamond", "palace"],
  },
  {
    id: "light_rainy_window_portrait",
    category: "cinematic",
    subCategory: "Lighting & Environment",
    title: "6. Rainy Window Emotional Portrait",
    badge: "CINEMATIC RAIN",
    recommendedRatio: "9:16",
    description: "Powder blue lehenga, solitaire jewellery set, sitting beside rain-covered palace window, cool daylight.",
    prompt:
      "Indian woman in trending powder blue lehenga, solitaire jewellery set, sitting beside a rain-covered palace window, soft cool daylight, emotional cinematic mood, realistic skin texture, natural beauty, Leica SL2, 85mm lens, f/1.8.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["rain", "window", "blue", "solitaire", "leica"],
  },
  {
    id: "light_floral_luxury_scene",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "7. Floral Luxury Bridal Scene",
    badge: "FLORAL EDITORIAL",
    recommendedRatio: "9:16",
    description: "Lavender lehenga, diamond jewellery, surrounded by luxury flowers and pastel roses.",
    prompt:
      "Indian fashion model wearing trending lavender lehenga, elegant diamond jewellery, surrounded by luxury flowers and pastel roses, soft studio lighting, premium bridal campaign aesthetic, realistic face details, Nikon Z9, 105mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["floral", "lavender", "roses", "bridal", "nikon"],
  },
  {
    id: "light_royal_staircase_portrait",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "8. Royal Grand Staircase Descent",
    badge: "MARBLE STAIRS",
    recommendedRatio: "9:16",
    description: "Ivory and gold lehenga, sparkling jewellery, descending grand marble staircase, natural skylight.",
    prompt:
      "Indian woman descending a grand marble staircase, wearing trending ivory and gold lehenga, sparkling jewellery, natural daylight from palace skylight, cinematic composition, realistic facial features, Sony A7R V, 135mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["staircase", "marble", "ivory-gold", "royal"],
  },
  {
    id: "light_luxury_hotel_editorial",
    category: "fashion",
    subCategory: "Lighting & Environment",
    title: "9. Luxury Hotel Five-Star Editorial",
    badge: "HOTEL SUITE",
    recommendedRatio: "9:16",
    description: "Champagne satin saree, minimalist diamond jewellery, 5-star hotel interior, ambient evening lighting.",
    prompt:
      "Fashion model wearing champagne satin saree, minimalist diamond jewellery, luxury five-star hotel interior, ambient evening lighting, realistic skin imperfections, Vogue editorial photography, Canon R3, 85mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["satin", "saree", "hotel", "vogue", "canon"],
  },
  {
    id: "light_sunset_terrace_shoot",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "10. Sunset Palace Terrace Shoot",
    badge: "SUNSET GLOW",
    recommendedRatio: "9:16",
    description: "Coral pink lehenga, rose-gold jewellery, golden sky background, cinematic rim lighting.",
    prompt:
      "Indian woman standing on a palace terrace at sunset, trending coral pink lehenga, rose-gold jewellery, golden sky background, cinematic rim lighting, realistic skin texture, luxury advertisement photography, Nikon Z8.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["sunset", "terrace", "coral-pink", "rim-light"],
  },
  {
    id: "light_chandelier_lighting",
    category: "jewellery",
    subCategory: "Lighting & Environment",
    title: "11. Crystal Chandelier Dramatic Lighting",
    badge: "CHANDELIER",
    recommendedRatio: "9:16",
    description: "Emerald green designer lehenga, standing beneath crystal chandelier, dramatic luxury reflections.",
    prompt:
      "Indian model wearing emerald green designer lehenga, premium jewellery set, standing beneath a crystal chandelier, dramatic luxury lighting, realistic face, elegant expression, Hasselblad medium format camera, 105mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["emerald", "chandelier", "hasselblad", "luxury"],
  },
  {
    id: "light_contemporary_indo_western",
    category: "fashion",
    subCategory: "Lighting & Environment",
    title: "12. Contemporary Indo-Western Fashion",
    badge: "INDO-WESTERN",
    recommendedRatio: "9:16",
    description: "Indo-Western couture outfit, statement jewellery, luxury studio setup, softbox lighting.",
    prompt:
      "Indian woman wearing trending Indo-Western couture outfit, statement jewellery, luxury studio setup, softbox lighting, editorial pose, realistic beauty shot, premium magazine photography, Sony A1, 85mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["indo-western", "couture", "studio", "sony"],
  },
  {
    id: "light_mirror_reflection_portrait",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "13. Antique Mirror Reflection Storytelling",
    badge: "MIRROR SHOT",
    recommendedRatio: "9:16",
    description: "Blush pink designer saree, solitaire jewellery, palace dressing room with antique mirror reflection.",
    prompt:
      "Beautiful Indian woman in blush pink designer saree, solitaire jewellery, palace dressing room with antique mirror reflections, cinematic lighting, realistic skin details, luxury jewellery campaign, Leica SL2.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["mirror", "reflection", "antique", "saree", "leica"],
  },
  {
    id: "light_palace_corridor_walk",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "14. Palace Corridor Soft Daylight Walk",
    badge: "CORRIDOR WALK",
    recommendedRatio: "9:16",
    description: "Champagne lehenga, elegant jewellery, walking through royal palace corridor with directional daylight.",
    prompt:
      "Indian model wearing trending champagne lehenga, elegant jewellery set, walking through a royal palace corridor, soft directional daylight, cinematic depth, realistic face texture, Canon R5, 135mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["corridor", "champagne", "daylight", "canon"],
  },
  {
    id: "light_moonlight_luxury_portrait",
    category: "cinematic",
    subCategory: "Lighting & Environment",
    title: "15. Moonlight Terrace Cool Blue Lighting",
    badge: "MOONLIGHT",
    recommendedRatio: "9:16",
    description: "Silver-grey lehenga, diamond jewellery, luxury terrace under moonlight, cool blue cinematic lighting.",
    prompt:
      "Indian woman wearing silver-grey lehenga, diamond jewellery, luxury terrace under moonlight, cool blue cinematic lighting, realistic skin and makeup, editorial fashion photography, Sony A7R V.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["moonlight", "silver-grey", "cool-blue", "cinematic"],
  },
  {
    id: "light_heritage_haveli_campaign",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "16. Heritage Haveli Courtyard Campaign",
    badge: "HAVELI HERITAGE",
    recommendedRatio: "9:16",
    description: "Tissue silk saree, premium rose-gold jewellery, heritage haveli courtyard with warm architectural lighting.",
    prompt:
      "Indian woman in trending tissue silk saree, premium rose-gold jewellery, standing in a heritage haveli courtyard, warm architectural lighting, luxury advertisement style, realistic beauty portrait, Nikon Z9.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["haveli", "tissue-silk", "rose-gold", "nikon"],
  },
  {
    id: "light_fashion_week_spotlight",
    category: "fashion",
    subCategory: "Lighting & Environment",
    title: "17. Bridal Fashion Week Dramatic Spotlight",
    badge: "SPOTLIGHT",
    recommendedRatio: "9:16",
    description: "Modern bridal fashion week couture lehenga, dramatic spotlight lighting, Hasselblad X2D.",
    prompt:
      "Indian supermodel wearing trending couture lehenga from modern bridal fashion week, luxury jewellery, dramatic spotlight lighting, editorial campaign, realistic skin pores, Hasselblad X2D, 90mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["fashion-week", "spotlight", "hasselblad", "editorial"],
  },
  {
    id: "light_luxury_garden_portrait",
    category: "bridal",
    subCategory: "Lighting & Environment",
    title: "18. Luxury Garden & Fountains Morning Light",
    badge: "GARDEN BOKEH",
    recommendedRatio: "9:16",
    description: "Pastel floral lehenga, delicate diamond jewellery, luxury garden with fountains and roses, morning light.",
    prompt:
      "Indian woman wearing pastel floral lehenga, delicate diamond jewellery, luxury garden with fountains and roses, soft morning light, realistic skin texture, cinematic bridal photography, Canon R3.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["garden", "fountain", "pastel-floral", "canon"],
  },
  {
    id: "light_dark_luxury_background",
    category: "jewellery",
    subCategory: "Lighting & Environment",
    title: "19. Dark Textured Luxury Studio Rembrandt",
    badge: "REMBRANDT DARK",
    recommendedRatio: "4:5",
    description: "Champagne gold outfit, sparkling solitaire jewellery, dark textured luxury background, Rembrandt lighting.",
    prompt:
      "Indian model wearing champagne gold designer outfit, sparkling solitaire jewellery, dark textured luxury background, Rembrandt lighting, premium jewellery campaign, realistic face details, Sony A1, 105mm lens.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["dark-studio", "rembrandt", "solitaire", "sony"],
  },
  {
    id: "light_bollywood_couture_campaign",
    category: "fashion",
    subCategory: "Lighting & Environment",
    title: "20. Bollywood Actress Couture Palace Campaign",
    badge: "BOLLYWOOD GLAM",
    recommendedRatio: "9:16",
    description: "Blush gold couture lehenga, elegant rose-gold jewellery, grand palace interior, Bollywood lighting.",
    prompt:
      "Beautiful Indian actress-style woman wearing trending blush gold couture lehenga, elegant rose-gold jewellery, grand palace interior, cinematic Bollywood lighting, realistic skin imperfections, natural makeup, luxury fashion advertisement, Sony A7R V, 85mm lens, f/1.4, magazine cover quality, ultra realistic 8k.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["bollywood", "blush-gold", "palace", "actress", "8k"],
  },

  // ==========================================
  // 3. MODEL POSES & SHOT STYLES (From Tab 1 & Tab 3)
  // ==========================================
  {
    id: "pose_front_facing_soft_hold",
    category: "poses",
    subCategory: "Standing Poses",
    title: "Pose 1: Front Facing Soft Pallu Hold",
    badge: "CLASSIC POSE",
    recommendedRatio: "9:16",
    description: "Standing straight, shoulders relaxed, one hand holding saree pallu near collarbone, neck elongated.",
    prompt:
      "Standing straight, shoulders relaxed, facing camera directly, one hand gently holding the saree pallu near collarbone, chin slightly lowered, soft confident expression, elegant fashion editorial pose, neck elongated to showcase jewellery, eyes looking directly into camera, natural skin texture, realistic Indian face, subtle makeup, Sony A7R V, 85mm GM lens, f/2, RAW photo, editorial fashion photography, cinematic lighting, ultra realistic, 8k.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["pose", "saree", "pallu", "collarbone", "front"],
  },
  {
    id: "pose_side_profile_glamour",
    category: "poses",
    subCategory: "Profile Poses",
    title: "Pose 2: Side Profile Glamour (Hair Lift)",
    badge: "JEWELLERY FOCUS",
    recommendedRatio: "4:5",
    description: "Body turned 45 degrees, face looking downward in profile, one hand behind head lifting hair slightly, neck exposed.",
    prompt:
      "Body turned 45 degrees sideways, face looking downward in profile, one hand behind head lifting hair slightly, neck exposed, graceful shoulder line, luxury jewellery focus, fashion magazine pose, natural skin texture, visible pores, Sony A7R V, 85mm lens, f/2, RAW photograph.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["pose", "profile", "hair-lift", "neck", "earrings"],
  },
  {
    id: "pose_looking_over_shoulder",
    category: "poses",
    subCategory: "Back & Shoulder",
    title: "Pose 3: Looking Over Shoulder (Waist Rest)",
    badge: "CINEMATIC ANGLE",
    recommendedRatio: "9:16",
    description: "Body facing away from camera, head turned back over shoulder, one hand resting on waist, jewellery clearly visible.",
    prompt:
      "Body facing away from camera, head turned back over shoulder, soft expression, one hand resting on waist, jewellery clearly visible from side angle, cinematic fashion campaign pose, flowing lehenga drape, Sony A7R V, 85mm GM, shallow depth of field, 8k.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["pose", "over-shoulder", "waist", "cinematic"],
  },
  {
    id: "pose_touching_earring_close",
    category: "poses",
    subCategory: "Beauty Close-Up",
    title: "Pose 4: Touching Earring Beauty Close-Up",
    badge: "EARRING FOCUS",
    recommendedRatio: "1:1",
    description: "Close-up portrait, fingers gently touching earring, head tilted slightly, eyes looking away from camera.",
    prompt:
      "Close-up portrait, fingers gently touching earring, head tilted slightly sideways, eyes looking away from camera, relaxed lips, jewellery as primary focus, beauty editorial style, visible skin pores, authentic skin texture, macro lens, 8k.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["pose", "earring", "macro", "touching", "close-up"],
  },
  {
    id: "pose_chin_rest_luxury",
    category: "poses",
    subCategory: "Sitting Poses",
    title: "Pose 6: Chin Rest Armchair Luxury Pose",
    badge: "SEATED ELEGANCE",
    recommendedRatio: "4:5",
    description: "Seated pose, elbow resting on armrest, chin lightly supported by fingertips, calm luxury expression.",
    prompt:
      "Seated pose, elbow resting on armrest, chin lightly supported by fingertips, calm luxury expression, camera slightly above eye level, jewellery prominently displayed, velvet armrest, rich Indian ethnic wear, Sony A7R V, f/2.2.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["pose", "chin-rest", "seated", "armrest", "luxury"],
  },
  {
    id: "pose_dupatta_covering_half_face",
    category: "poses",
    subCategory: "Dupatta & Veil",
    title: "Pose: Dupatta Covering Half Face (Eyes Visible)",
    badge: "MYSTIQUE BRIDAL",
    recommendedRatio: "9:16",
    description: "Sheer embroidered dupatta covering half face, intense beautiful eyes visible, soft romantic gaze.",
    prompt:
      "Traditional Indian bridal pose, sheer embroidered dupatta covering half face with intense expressive eyes visible, detailed kohl eyeliner, subtle maang tikka on forehead, soft golden sunlight filtering through sheer fabric, cinematic storytelling portrait, 85mm f/1.4 lens, 8k photorealistic.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["dupatta", "veil", "eyes", "bridal", "mystique"],
  },
  {
    id: "pose_twirl_motion_saree",
    category: "poses",
    subCategory: "Motion Poses",
    title: "Pose 22: Twirl Motion Saree Flow",
    badge: "DYNAMIC MOTION",
    recommendedRatio: "9:16",
    description: "Mid-spin movement, saree flowing naturally, joyful expression, realistic fabric dynamics.",
    prompt:
      "Mid-spin movement, saree flowing naturally with realistic cloth physics, joyful radiant expression, natural arm movement, motion blur on fabric edges with sharp focus on face and necklace, high-fashion editorial, Sony A7R V, 1/500s shutter, 8k.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["twirl", "motion", "saree-flow", "dynamic"],
  },
  {
    id: "pose_luxury_sofa_reclining",
    category: "poses",
    subCategory: "Sitting Poses",
    title: "Pose: Luxury Sofa Reclining Editorial",
    badge: "SOFA EDITORIAL",
    recommendedRatio: "16:9",
    description: "Reclining on designer sofa, soft expression, side profile, lehenga spread elegantly around.",
    prompt:
      "Reclining gracefully on vintage velvet sofa, soft relaxed expression, side profile, lehenga fabric spread around lavishly, jewellery-focused close-up on sofa, ambient warm chandelier lighting, high-end commercial fashion editorial, 85mm GM lens, f/2.0.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["sofa", "reclining", "velvet", "editorial", "luxury"],
  },

  // ==========================================
  // 4. 100% CONSISTENT CHARACTER & OUTFIT AI VIDEO (From Tab 2)
  // ==========================================
  {
    id: "video_character_outfit_consistency",
    category: "consistent_video",
    subCategory: "AI Video Prompt",
    title: "100% Character & Outfit Consistency Master Video",
    badge: "AI VIDEO CONSISTENCY",
    recommendedRatio: "9:16",
    description: "Use uploaded portrait as character reference and storyboard as motion reference. Preserves exact face, jewellery, and outfit.",
    prompt:
      "Use the uploaded portrait image as the primary character reference and the uploaded storyboard image as the motion and scene reference. Create a realistic cinematic fashion video featuring the exact same woman from the uploaded image. Maintain 100% facial consistency throughout the video. Preserve the exact face shape, eyes, nose, lips, skin tone, hairstyle, body proportions, expression style, jewellery, and outfit details. The mustard yellow embroidered top, lace details, necklace, earrings, heels, and draped dhoti-style bottom must remain exactly identical to the reference image. Do not modify the design, embroidery, color, fabric texture, fitting, accessories, or styling. Follow the poses and movements from the storyboard image while keeping the same character and outfit. Use natural body movement, realistic cloth physics, flowing fabric motion, and subtle hair movement. Apply cinematic pacing: Slow-motion during beauty shots, close-ups, fabric movement, jewellery highlights, hair movement, and elegant posing moments. Faster pacing during walking sequences, turning movements, transitions, and dynamic fashion-model actions. Smooth transitions between scenes. Natural eye movement and realistic expressions. Camera angles should include: Full-body fashion shots, Medium portrait shots, Close-up beauty shots, Over-the-shoulder angles, Side profile shots, Elegant walking shots. The camera should frequently highlight the outfit details, embroidery work, draping style, jewellery, and fabric flow. Visual style: Luxury ethnic fashion campaign, premium designer wear advertisement, Vogue India editorial photography style, cinematic natural lighting, realistic skin texture, realistic hair strands, high-end commercial fashion film, shallow depth of field, ultra-realistic, 4K, luxury color grading.",
    negativePrompt: VIDEO_CONSISTENCY_NEGATIVE_PROMPT,
    tags: ["video", "consistency", "seedance", "veo", "fashion-film", "4k"],
  },

  // ==========================================
  // 5. ANTI-AI REALISM & DOCUMENTARY (From Tab 4)
  // ==========================================
  {
    id: "realism_hasselblad_authentic",
    category: "realism",
    subCategory: "Anti-AI Realism",
    title: "Hasselblad H6D-100c Raw Authentic Portrait",
    badge: "RAW DOCUMENTARY",
    recommendedRatio: "4:5",
    description: "24-year-old Pakistani/Indian woman, visible micro-pores, fine skin texture, subtle freckles, peach fuzz, stray baby hairs.",
    prompt:
      "Raw, authentic studio portrait of a 24-year-old woman, warm natural skin undertones, soft natural smile looking directly into camera. Visible micro-pores, fine skin texture, subtle freckles and peach fuzz, dewy skin sheen, stray baby hairs around forehead. Wearing a minimal beige cotton kurta. Shot on Hasselblad H6D-100c with 85mm f/1.4 lens, softbox lighting creating delicate catchlights in the eyes, clean off-white background. Ultra-realistic commercial lookbook photo, unedited, 8k. --ar 4:5 --style raw.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cameraDetails: "Hasselblad H6D-100c, 85mm f/1.4",
    tags: ["raw", "hasselblad", "micro-pores", "freckles", "anti-ai"],
  },
  {
    id: "realism_sony_a7r_unretouched",
    category: "realism",
    subCategory: "Anti-AI Realism",
    title: "Sony A7R V Unretouched Beauty & Natural Asymmetry",
    badge: "UNRETOUCHED",
    recommendedRatio: "4:5",
    description: "Natural facial proportions, subtle natural asymmetry, visible pores, healthy skin sheen, realistic eye reflections, octabox key light.",
    prompt:
      "Ultra-photorealistic luxury Indian fashion editorial. A beautiful Indian woman with authentic Indian features, realistic facial proportions, subtle natural asymmetry, visible skin pores, natural skin texture, healthy skin sheen, realistic eye reflections, natural eyebrows, subtle makeup, unretouched beauty look. Relaxed natural pose, candid expression, elegant body language, realistic hand placement. Professional editorial fashion photography, commercial luxury advertising, magazine-quality portrait. Shot on Sony A7R V, 85mm GM portrait lens, f/2 aperture, RAW photograph, full-frame camera look, shallow depth of field. Large octabox key light, soft directional studio lighting, gentle shadow transitions, natural highlight roll-off, warm cinematic ambience. Realistic fabric textures, physically accurate materials, realistic jewellery reflections, high dynamic range, authentic photographic realism. Luxury fashion campaign, premium beauty photography, no AI look, genuine human appearance.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cameraDetails: "Sony A7R V, 85mm GM, f/2.0, Large Octabox",
    tags: ["unretouched", "asymmetry", "octabox", "sony", "no-ai"],
  },
  {
    id: "realism_leica_candid_street",
    category: "realism",
    subCategory: "Anti-Detection",
    title: "Leica M11 Candid Natural Documentary Shot",
    badge: "LEICA M11",
    recommendedRatio: "4:5",
    description: "Candid 35mm street photography, natural daylight, slight motion blur, visible pores and natural skin blemishes, unedited raw.",
    prompt:
      "Candid 35mm street photography, shot on Leica M11, natural daylight, slight motion blur, visible pores and natural skin blemishes, unedited raw documentary shot. Looking slightly off-camera, natural candid angle, soft side lighting, genuine human emotion, authentic film grain.",
    negativePrompt: "CGI, 3D render, smooth plastic skin, doll face, artificial lighting",
    cameraDetails: "Leica M11, 35mm f/1.4",
    tags: ["leica", "candid", "street", "documentary", "film-grain"],
  },
  {
    id: "realism_shraddha_kapoor_vibe",
    category: "fashion",
    subCategory: "Celebrity Vibe",
    title: "Pastel Sky Blue Organza Saree (Celebrity Vibe)",
    badge: "CELEBRITY VIBE",
    recommendedRatio: "9:16",
    description: "26-year-old Indian woman in pastel sky blue organza saree, sleeveless embroidered blouse, voluminous Bollywood waves.",
    prompt:
      "Ultra-realistic luxury Indian fashion editorial featuring a 26-year-old Indian woman wearing a pastel sky blue organza saree with sleeveless embroidered blouse. Pose: One hand gently touching hair near temple, head slightly tilted, soft gaze toward camera. Expression: gentle natural smile. Camera Angle: eye level camera angle. Hair: voluminous Bollywood-style waves. Jewellery: delicate diamond necklace and matching earrings. Lighting: warm golden hour sunlight. Background: heritage haveli courtyard. Composition: subject centered with soft background blur. Shot Type: waist up portrait. Color Palette: pastel blue, cream, warm gold. Mood: elegant, feminine, celebrity-inspired. Vogue India fashion editorial, luxury ethnic wear campaign, shallow depth of field, realistic skin.",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    tags: ["organza", "sky-blue", "haveli", "celebrity-vibe", "bollywood"],
  },
];
