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

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_service ON generations(service_type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_provider ON generations(provider);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_director_logs_created ON director_logs(created_at DESC);
