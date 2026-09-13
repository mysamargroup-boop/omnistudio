-- ==============================================================================
-- OmniStudio AI — Production Database Schema for Supabase PostgreSQL
-- Project: Omni (lsttnpynhwtpkzfbfntf)
-- Region: ap-south-1 (Mumbai)
-- Description: Complete standalone schema covering all 16 tables, indexes,
--              triggers, and Row Level Security (RLS) policies.
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Projects Table (Multi-Scene Cinema & Autonomous Workflows)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
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

-- ------------------------------------------------------------------------------
-- 2. Assets Table (Images, Videos, Audio stored in Cloudflare R2 / Local)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES public.projects(id) ON DELETE SET NULL,
    asset_type VARCHAR(32) NOT NULL, -- 'image', 'video', 'audio', 'final_cut'
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    local_path TEXT,
    storage_provider VARCHAR(32) DEFAULT 'cloudflare_r2',
    size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. Generations & Cost Telemetry Table (Audit Log per generation event)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generations (
    id VARCHAR(64) PRIMARY KEY,
    service_type VARCHAR(32) NOT NULL, -- 'image', 'video', 'voice', 'pipeline'
    provider VARCHAR(64) NOT NULL,     -- 'google', 'openai', 'replicate', 'elevenlabs', 'local', etc.
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

-- ------------------------------------------------------------------------------
-- 4. AI Cinema Director Logs Table (Screenplay & Prompt Enhancer Memory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.director_logs (
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

-- ------------------------------------------------------------------------------
-- 5. Studio Settings Table (Key-Value Store for configurations & Brand Kit)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. API Keys Table (Encrypted at rest with Fernet)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
    service VARCHAR(64) PRIMARY KEY,
    key_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. Characters Table (Consistent Persona Archetypes & Face DNA Locks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.characters (
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

-- ------------------------------------------------------------------------------
-- 8. Asset Favorites Table (Vault Quick-Access Stars)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_favorites (
    filename VARCHAR(255) PRIMARY KEY,
    is_favorite INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 9. Asset Collections Table (Vault Folders / Project Buckets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_collections (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 10. Asset Collection Items Table (Many-to-Many Asset Collections)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_collection_items (
    collection_id VARCHAR(64) REFERENCES public.asset_collections(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, filename)
);

-- ------------------------------------------------------------------------------
-- 11. Social Accounts Table (Connected OAuth / Handle Profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_accounts (
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

-- ------------------------------------------------------------------------------
-- 12. Publish Posts Table (Omnichannel Scheduled & Published Posts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publish_posts (
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

-- ------------------------------------------------------------------------------
-- 13. Publish Templates Table (Reusable Caption & Hashtag Blueprints)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publish_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    caption_template TEXT,
    hashtag_template TEXT,
    default_schedule_offset INT DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 14. Social Analytics Table (Historical Reach & Engagement Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_analytics (
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

-- ------------------------------------------------------------------------------
-- 15. Publish Workspaces Table (Multi-Client Agency Workspaces)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publish_workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) DEFAULT '',
    approval_required INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 16. Saved Prompts Table (Prompt Vault / Prompt Maker Matrix)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_prompts (
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

-- ------------------------------------------------------------------------------
-- Performance Indexes (High-Speed Filtering, Partitioning & Search)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON public.assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_project ON public.assets(project_id);

CREATE INDEX IF NOT EXISTS idx_generations_service ON public.generations(service_type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON public.generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_provider ON public.generations(provider);

CREATE INDEX IF NOT EXISTS idx_projects_created ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_director_logs_created ON public.director_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_created ON public.characters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_locked ON public.characters(is_locked);

CREATE INDEX IF NOT EXISTS idx_saved_prompts_category ON public.saved_prompts(category);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_favorite ON public.saved_prompts(is_favorite);

CREATE INDEX IF NOT EXISTS idx_publish_posts_status ON public.publish_posts(status);
CREATE INDEX IF NOT EXISTS idx_publish_posts_scheduled ON public.publish_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publish_posts_workspace ON public.publish_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_post ON public.social_analytics(post_id);

-- ------------------------------------------------------------------------------
-- Automated Updated_at Trigger Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables with updated_at
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_characters_updated_at ON public.characters;
CREATE TRIGGER set_characters_updated_at BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_publish_posts_updated_at ON public.publish_posts;
CREATE TRIGGER set_publish_posts_updated_at BEFORE UPDATE ON public.publish_posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_saved_prompts_updated_at ON public.saved_prompts;
CREATE TRIGGER set_saved_prompts_updated_at BEFORE UPDATE ON public.saved_prompts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- Enable Row Level Security (RLS) & Grant Studio Access
-- ------------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated studio service role full CRUD access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to projects') THEN
        CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to assets') THEN
        CREATE POLICY "Allow all access to assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to generations') THEN
        CREATE POLICY "Allow all access to generations" ON public.generations FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to director_logs') THEN
        CREATE POLICY "Allow all access to director_logs" ON public.director_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to studio_settings') THEN
        CREATE POLICY "Allow all access to studio_settings" ON public.studio_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to api_keys') THEN
        CREATE POLICY "Allow all access to api_keys" ON public.api_keys FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to characters') THEN
        CREATE POLICY "Allow all access to characters" ON public.characters FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to asset_favorites') THEN
        CREATE POLICY "Allow all access to asset_favorites" ON public.asset_favorites FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to asset_collections') THEN
        CREATE POLICY "Allow all access to asset_collections" ON public.asset_collections FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to asset_collection_items') THEN
        CREATE POLICY "Allow all access to asset_collection_items" ON public.asset_collection_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to social_accounts') THEN
        CREATE POLICY "Allow all access to social_accounts" ON public.social_accounts FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to publish_posts') THEN
        CREATE POLICY "Allow all access to publish_posts" ON public.publish_posts FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to publish_templates') THEN
        CREATE POLICY "Allow all access to publish_templates" ON public.publish_templates FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to social_analytics') THEN
        CREATE POLICY "Allow all access to social_analytics" ON public.social_analytics FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to publish_workspaces') THEN
        CREATE POLICY "Allow all access to publish_workspaces" ON public.publish_workspaces FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to saved_prompts') THEN
        CREATE POLICY "Allow all access to saved_prompts" ON public.saved_prompts FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- Seed Default Workspace (Ensures immediate out-of-the-box functionality)
-- ------------------------------------------------------------------------------
INSERT INTO public.publish_workspaces (id, name, client_name, approval_required)
VALUES ('default', 'Main Studio Workspace', 'OmniStudio AI', 0)
ON CONFLICT (id) DO NOTHING;
