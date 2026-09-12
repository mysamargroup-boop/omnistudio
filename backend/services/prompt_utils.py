import re
import uuid
from typing import Optional

# Comprehensive set of common stopwords and non-descriptive filler terms
STOPWORDS = {
    # Articles, conjunctions, prepositions
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "cant", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
    "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how",
    "i", "if", "in", "into", "is", "isn't", "it", "its", "itself", "me", "more", "most", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
    "out", "over", "own", "same", "she", "should", "shouldn't", "so", "some", "such", "than", "that", "the",
    "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through",
    "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what", "when",
    "where", "which", "while", "who", "whom", "why", "with", "won't", "would", "wouldn't", "you", "your",
    "yours", "yourself", "yourselves",
    # Generic AI prompt filler terms to exclude from filenames
    "image", "photo", "photograph", "picture", "generate", "create", "hyperrealistic", "photorealistic",
    "ultra", "hd", "4k", "8k", "high", "quality", "masterpiece", "detailed", "render", "resolution",
    "style", "aesthetic", "shot", "showing", "looking", "like", "view", "realistic", "cinematic",
    "master", "focus", "lighting", "aperture", "lens", "camera", "color", "grading",
    "stunning", "beautiful", "epic", "amazing", "gorgeous", "incredible", "breathtaking"
}

def extract_prompt_keywords_slug(prompt: str, max_words: int = 4, max_len: int = 36) -> str:
    """
    Extracts key descriptive words from a user's prompt to generate a clean, readable filename slug.
    Example: 'A cinematic shot of a cyberpunk samurai in rainy neo tokyo' -> 'cyberpunk_samurai_rainy_neo'
    """
    if not prompt or not prompt.strip():
        return "image"
    
    # Remove URLs, mentions, hashtags
    cleaned = re.sub(r'https?://\S+|@\S+|#\S+', ' ', prompt)
    # Remove punctuation and special characters, retain alphanumeric and spaces
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', cleaned).lower()
    
    words = cleaned.split()
    
    # First pass: words > 2 chars not in STOPWORDS
    meaningful_words = [w for w in words if len(w) > 2 and w not in STOPWORDS]
    
    # Fallback if too few words: words > 1 char not in common articles
    if not meaningful_words:
        meaningful_words = [w for w in words if len(w) > 1 and w not in {"a", "an", "the", "in", "on", "at", "to", "of"}]
        
    if not meaningful_words:
        # If words were 1-letter or non-latin
        meaningful_words = [w for w in words if w]
        
    if not meaningful_words:
        return "image"
        
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for w in meaningful_words:
        if w not in seen:
            seen.add(w)
            deduped.append(w)
            
    selected = deduped[:max_words]
    slug = "_".join(selected)
    
    if len(slug) > max_len:
        slug = slug[:max_len].rstrip("_")
        
    return slug or "image"

def generate_image_filename(prompt: str, ext: str = ".png", prefix: Optional[str] = None) -> str:
    """
    Generates a unique keyword-based filename from a prompt.
    Format: [prefix_]keyword1_keyword2_keyword3_shortid.ext
    Example: cyberpunk_samurai_rainy_a7f2.png
    """
    if not ext.startswith("."):
        ext = f".{ext}"
    slug = extract_prompt_keywords_slug(prompt, max_words=4, max_len=35)
    short_id = uuid.uuid4().hex[:6]
    if prefix:
        return f"{prefix}_{slug}_{short_id}{ext}"
    return f"{slug}_{short_id}{ext}"
