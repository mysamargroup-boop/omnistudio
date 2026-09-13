-- ==============================================================================
-- OmniStudio AI — Standalone Database Schema for SQLite Local Setups
-- Description: Complete 16-table SQLite schema matching the production database.
-- Run with: sqlite3 omnistudio.db < sqlite_schema.sql
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    topic TEXT,
    style TEXT DEFAULT 'cinematic',
    status TEXT DEFAULT 'completed',
    scenes_count INTEGER DEFAULT 1,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    asset_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    local_path TEXT,
    storage_provider TEXT DEFAULT 'local',
    size_bytes INTEGER DEFAULT 0,
    mime_type TEXT,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 3. Generations & Cost Telemetry Table
CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    service_type TEXT NOT NULL,
    provider TEXT,
    model_used TEXT NOT NULL,
    prompt TEXT,
    negative_prompt TEXT,
    duration_sec REAL,
    parameters TEXT DEFAULT '{}',
    output_url TEXT NOT NULL,
    cost_usd REAL DEFAULT 0.0,
    cost_inr REAL DEFAULT 0.0,
    saved_usd REAL DEFAULT 0.0,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Director Logs Table
CREATE TABLE IF NOT EXISTS director_logs (
    id TEXT PRIMARY KEY,
    user_idea TEXT NOT NULL,
    enhanced_prompt TEXT NOT NULL,
    camera_direction TEXT,
    lighting_directive TEXT,
    negative_prompt TEXT,
    director_notes TEXT,
    agent_model TEXT DEFAULT 'gpt-4o-mini',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Studio Settings Table
CREATE TABLE IF NOT EXISTS studio_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    service TEXT PRIMARY KEY,
    key_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Characters Table
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT DEFAULT '',
    description TEXT DEFAULT '',
    prompt TEXT NOT NULL,
    image_url TEXT,
    is_locked INTEGER DEFAULT 0,
    category TEXT DEFAULT 'custom',
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Asset Favorites Table
CREATE TABLE IF NOT EXISTS asset_favorites (
    filename TEXT PRIMARY KEY,
    is_favorite INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Asset Collections Table
CREATE TABLE IF NOT EXISTS asset_collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Asset Collection Items Table
CREATE TABLE IF NOT EXISTS asset_collection_items (
    collection_id TEXT,
    filename TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, filename),
    FOREIGN KEY(collection_id) REFERENCES asset_collections(id) ON DELETE CASCADE
);

-- 11. Social Accounts Table
CREATE TABLE IF NOT EXISTS social_accounts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    platform_account_id TEXT,
    account_name TEXT NOT NULL,
    username TEXT,
    avatar_url TEXT,
    access_token TEXT,
    status TEXT DEFAULT 'connected',
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}'
);

-- 12. Publish Posts Table
CREATE TABLE IF NOT EXISTS publish_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    media_urls TEXT DEFAULT '[]',
    media_type TEXT DEFAULT 'image',
    thumbnail_url TEXT,
    platforms TEXT NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    scheduled_at DATETIME,
    published_at DATETIME,
    status_by_platform TEXT DEFAULT '{}',
    platform_post_ids TEXT DEFAULT '{}',
    ai_adaptation TEXT DEFAULT '{}',
    approval_status TEXT DEFAULT 'approved',
    workspace_id TEXT DEFAULT 'default',
    campaign_id TEXT,
    is_recycled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Publish Templates Table
CREATE TABLE IF NOT EXISTS publish_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platforms TEXT NOT NULL DEFAULT '[]',
    caption_template TEXT,
    hashtag_template TEXT,
    default_schedule_offset INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Social Analytics Table
CREATE TABLE IF NOT EXISTS social_analytics (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    platform TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement_rate REAL DEFAULT 0.0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    watch_time_sec REAL DEFAULT 0.0,
    followers_growth INTEGER DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. Publish Workspaces Table
CREATE TABLE IF NOT EXISTS publish_workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT DEFAULT '',
    approval_required INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. Saved Prompts Table
CREATE TABLE IF NOT EXISTS saved_prompts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    negative_prompt TEXT DEFAULT '',
    category TEXT DEFAULT 'cinematic',
    tags TEXT DEFAULT '[]',
    studio_type TEXT DEFAULT 'all',
    is_favorite INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_generations_service ON generations(service_type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_characters_created ON characters(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_category ON saved_prompts(category);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_favorite ON saved_prompts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_publish_posts_status ON publish_posts(status);
CREATE INDEX IF NOT EXISTS idx_publish_posts_scheduled ON publish_posts(scheduled_at);

-- Default Workspace
INSERT OR IGNORE INTO publish_workspaces (id, name, client_name, approval_required)
VALUES ('default', 'Main Studio Workspace', 'OmniStudio AI', 0);
