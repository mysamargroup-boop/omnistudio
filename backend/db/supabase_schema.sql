-- ==============================================================================
-- OmniStudio AI — Production Database Schema for Supabase PostgreSQL
-- Project: Omni (lsttnpynhwtpkzfbfntf)
-- Region: ap-south-1 (Mumbai)
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Projects Table (Multi-Scene Cinema & Autonomous Agent Workflows)
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
-- 2. Assets Table (Images, Videos, Audio, Voiceovers stored in Cloudflare R2 / Local)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES public.projects(id) ON DELETE SET NULL,
    asset_type VARCHAR(32) NOT NULL, -- 'image', 'video', 'audio', 'final_cut'
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    local_path TEXT,
    storage_provider VARCHAR(32) DEFAULT 'cloudflare_r2', -- 'cloudflare_r2', 'local', 'supabase'
    size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. Generations & Cost Telemetry Table (Live Audit Log per generation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generations (
    id VARCHAR(64) PRIMARY KEY,
    service_type VARCHAR(32) NOT NULL, -- 'image', 'video', 'voice', 'pipeline'
    provider VARCHAR(64) NOT NULL,     -- 'google', 'openai', 'replicate', 'elevenlabs', 'local'
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
-- 5. Studio Settings Table (Key-Value Store for API configs & preferences)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- Performance Indexes (High-Speed Filtering & Search)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON public.assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_project ON public.assets(project_id);

CREATE INDEX IF NOT EXISTS idx_generations_service ON public.generations(service_type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON public.generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_provider ON public.generations(provider);

CREATE INDEX IF NOT EXISTS idx_projects_created ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_director_logs_created ON public.director_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- Enable Row Level Security (RLS) with Public Read/Write for Studio API
-- ------------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon / authenticated roles full access for the studio
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
END $$;
