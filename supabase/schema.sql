-- ═══════════════════════════════════════════════════════
-- SNAPVERSE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL)
-- ═══════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════
-- Projects table
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  timeline_state JSONB DEFAULT '{}',
  duration FLOAT DEFAULT 0,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- ═══════════════════════════════════════
-- Media Items table
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'photo', 'audio')),
  file_url TEXT,
  r2_key TEXT,
  duration FLOAT,
  thumbnail_url TEXT,
  waveform_data JSONB,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media"
  ON media_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON media_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON media_items FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_project_id ON media_items(project_id);

-- ═══════════════════════════════════════
-- Exports table (export history)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT,
  quality TEXT,
  format TEXT DEFAULT 'mp4',
  file_size BIGINT,
  duration FLOAT,
  status TEXT DEFAULT 'complete',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
  ON exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exports"
  ON exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- AI Feedback table
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_id TEXT,
  category TEXT,
  rating TEXT CHECK (rating IN ('helpful', 'not_helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON ai_feedback FOR ALL
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- Updated at trigger
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════
-- Storage bucket for media files
-- ═══════════════════════════════════════
-- Note: Create a storage bucket named 'media' in
-- Supabase Dashboard > Storage > New Bucket
-- Set it to public for read access
--
-- Then add this storage policy in the dashboard:
-- Policy name: "Allow authenticated uploads"
-- Allowed operation: INSERT
-- Policy: (auth.role() = 'authenticated')
--
-- Policy name: "Allow public reads"
-- Allowed operation: SELECT  
-- Policy: true
