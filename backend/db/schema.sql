-- ==============================================================================
-- OmniStudio AI — Production Database Schema for PostgreSQL & Supabase
-- ==============================================================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topic TEXT,
    style VARCHAR(64) DEFAULT 'cinematic',
    status VARCHAR(32) DEFAULT 'completed',
    scenes_count INT DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE SET NULL,
    asset_type VARCHAR(32) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    local_path TEXT,
    storage_provider VARCHAR(32) DEFAULT 'cloudflare_r2',
    size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Generations & Cost Telemetry Table
CREATE TABLE IF NOT EXISTS generations (
    id VARCHAR(64) PRIMARY KEY,
    service_type VARCHAR(32) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    model_used VARCHAR(64) NOT NULL,
    prompt TEXT,
    negative_prompt TEXT,
    duration_sec NUMERIC(6, 2),
    parameters JSONB DEFAULT '{}'::jsonb,
    output_url TEXT NOT NULL,
    cost_usd NUMERIC(8, 4) DEFAULT 0.0000,
    cost_inr NUMERIC(10, 2) DEFAULT 0.00,
    saved_usd NUMERIC(8, 4) DEFAULT 0.0000,
    status VARCHAR(32) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Cinema Director Logs Table
CREATE TABLE IF NOT EXISTS director_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_idea TEXT NOT NULL,
    enhanced_prompt TEXT NOT NULL,
    camera_direction VARCHAR(64),
    lighting_directive TEXT,
    negative_prompt TEXT,
    director_notes TEXT,
    agent_model VARCHAR(64) DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Studio Settings Table
CREATE TABLE IF NOT EXISTS studio_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. API Keys Table (Encrypted at rest with Fernet)
CREATE TABLE IF NOT EXISTS api_keys (
    service VARCHAR(64) PRIMARY KEY,
    key_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Characters Table
CREATE TABLE IF NOT EXISTS characters (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    prompt TEXT NOT NULL,
    image_url TEXT,
    is_locked INT DEFAULT 0,
    category VARCHAR(64) DEFAULT 'custom',
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Asset Favorites Table
CREATE TABLE IF NOT EXISTS asset_favorites (
    filename VARCHAR(255) PRIMARY KEY,
    is_favorite INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Asset Collections Table
CREATE TABLE IF NOT EXISTS asset_collections (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Asset Collection Items Table
CREATE TABLE IF NOT EXISTS asset_collection_items (
    collection_id VARCHAR(64) REFERENCES asset_collections(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, filename)
);

-- 11. Social Accounts Table
CREATE TABLE IF NOT EXISTS social_accounts (
    id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(64) NOT NULL,
    platform_account_id VARCHAR(255),
    account_name VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    avatar_url TEXT,
    access_token TEXT,
    status VARCHAR(32) DEFAULT 'connected',
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 12. Publish Posts Table
CREATE TABLE IF NOT EXISTS publish_posts (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    media_type VARCHAR(32) DEFAULT 'image',
    thumbnail_url TEXT,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    status_by_platform JSONB DEFAULT '{}'::jsonb,
    platform_post_ids JSONB DEFAULT '{}'::jsonb,
    ai_adaptation JSONB DEFAULT '{}'::jsonb,
    approval_status VARCHAR(32) DEFAULT 'approved',
    workspace_id VARCHAR(64) DEFAULT 'default',
    campaign_id VARCHAR(64),
    is_recycled INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Publish Templates Table
CREATE TABLE IF NOT EXISTS publish_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    caption_template TEXT,
    hashtag_template TEXT,
    default_schedule_offset INT DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Social Analytics Table
CREATE TABLE IF NOT EXISTS social_analytics (
    id VARCHAR(64) PRIMARY KEY,
    post_id VARCHAR(64),
    platform VARCHAR(64) NOT NULL,
    views INT DEFAULT 0,
    reach INT DEFAULT 0,
    engagement_rate NUMERIC(6, 4) DEFAULT 0.0000,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    watch_time_sec NUMERIC(8, 2) DEFAULT 0.00,
    followers_growth INT DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Publish Workspaces Table
CREATE TABLE IF NOT EXISTS publish_workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) DEFAULT '',
    approval_required INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Saved Prompts (Prompt Vault) Table
CREATE TABLE IF NOT EXISTS saved_prompts (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    negative_prompt TEXT DEFAULT '',
    category VARCHAR(64) DEFAULT 'cinematic',
    tags JSONB DEFAULT '[]'::jsonb,
    studio_type VARCHAR(64) DEFAULT 'all',
    is_favorite INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_service ON generations(service_type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_provider ON generations(provider);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_director_logs_created ON director_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_created ON characters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_category ON saved_prompts(category);
CREATE INDEX IF NOT EXISTS idx_publish_posts_status ON publish_posts(status);
CREATE INDEX IF NOT EXISTS idx_publish_posts_scheduled ON publish_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_analytics_post ON social_analytics(post_id);
