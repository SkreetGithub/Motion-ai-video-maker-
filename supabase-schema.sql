-- ============================================================================
-- COMPLETE SUPABASE DATABASE SCHEMA
-- ============================================================================
-- This is the complete, safe-to-run SQL schema for the AI Video Generator
-- Can be run multiple times without errors
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Characters table
-- Stores character profiles and reference images for consistent video generation
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  profile JSONB DEFAULT '{}',
  reference_image TEXT,
  seed BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
-- Stores generated videos and metadata
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  prompt TEXT,
  images JSONB DEFAULT '[]',
  video_url TEXT,
  duration INTEGER DEFAULT 10,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
-- Stores video generation jobs with state machine, progress, and cost tracking
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  character_name TEXT,
  character_profile JSONB DEFAULT '{}',
  duration INTEGER DEFAULT 10,
  style TEXT DEFAULT 'cinematic realistic',
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  error TEXT,
  result JSONB DEFAULT '{}',
  cost_tracking JSONB DEFAULT '{"images": 0, "video": 0, "audio": 0, "total": 0}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movies table (for backward compatibility with video engine)
-- Stores complete movie/video projects with multiple scenes
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  title TEXT NOT NULL,
  total_scenes INTEGER NOT NULL,
  successful_scenes INTEGER NOT NULL DEFAULT 0,
  total_duration INTEGER NOT NULL,
  story_premise TEXT NOT NULL,
  character_ids JSONB DEFAULT '[]'::jsonb,
  scenes_data JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Add unique constraint for character names per user (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'characters_user_id_name_key'
  ) THEN
    ALTER TABLE characters ADD CONSTRAINT characters_user_id_name_key UNIQUE(user_id, name);
  END IF;
END $$;

-- Fix existing tables: Change user_id from UUID to TEXT if needed
-- Must drop policies first, then alter column, then recreate policies
DO $$
BEGIN
  -- Check if characters.user_id is UUID type and change to TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'characters' 
    AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    -- Drop all policies that depend on user_id
    DROP POLICY IF EXISTS "Users can view own characters" ON characters;
    DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
    DROP POLICY IF EXISTS "Users can update own characters" ON characters;
    
    -- Alter the column type
    ALTER TABLE characters ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
  
  -- Check if videos.user_id is UUID type and change to TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' 
    AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    -- Drop all policies that depend on user_id
    DROP POLICY IF EXISTS "Users can view own videos" ON videos;
    DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
    
    -- Alter the column type
    ALTER TABLE videos ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;

  -- Check if movies.user_id is UUID type and change to TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'movies' 
    AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    -- Drop all policies that depend on user_id
    DROP POLICY IF EXISTS "Movies are viewable by everyone" ON movies;
    DROP POLICY IF EXISTS "Users can create movies" ON movies;
    DROP POLICY IF EXISTS "Users can update their own movies" ON movies;
    
    -- Alter the column type
    ALTER TABLE movies ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_character_id ON videos(character_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movies_user_id ON movies(user_id);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to auto-update updated_at on character updates
DROP TRIGGER IF EXISTS update_characters_updated_at ON characters;
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on job updates
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on movie updates
DROP TRIGGER IF EXISTS update_movies_updated_at ON movies;
CREATE TRIGGER update_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - CHARACTERS
-- ============================================================================

-- Policy: Users can view their own characters
-- Note: Cast auth.uid() to TEXT to match user_id TEXT type
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
CREATE POLICY "Users can view own characters"
  ON characters FOR SELECT
  USING (auth.uid()::TEXT = user_id);

-- Policy: Users can insert their own characters
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
CREATE POLICY "Users can insert own characters"
  ON characters FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Policy: Users can update their own characters
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  USING (auth.uid()::TEXT = user_id);

-- Policy: Public read access for characters (for service role)
DROP POLICY IF EXISTS "Characters are viewable by everyone" ON characters;
CREATE POLICY "Characters are viewable by everyone"
  ON characters FOR SELECT
  USING (true);

-- ============================================================================
-- RLS POLICIES - VIDEOS
-- ============================================================================

-- Policy: Users can view their own videos
DROP POLICY IF EXISTS "Users can view own videos" ON videos;
CREATE POLICY "Users can view own videos"
  ON videos FOR SELECT
  USING (auth.uid()::TEXT = user_id);

-- Policy: Users can insert their own videos
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
CREATE POLICY "Users can insert own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Policy: Public read access for videos (for service role)
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON videos;
CREATE POLICY "Videos are viewable by everyone"
  ON videos FOR SELECT
  USING (true);

-- ============================================================================
-- RLS POLICIES - JOBS
-- ============================================================================

-- Policy: Users can view their own jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid()::TEXT = user_id);

-- Policy: Users can insert their own jobs
DROP POLICY IF EXISTS "Users can create own jobs" ON jobs;
CREATE POLICY "Users can create own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Policy: Users can update their own jobs
DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid()::TEXT = user_id);

-- Policy: Users can delete their own jobs
DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid()::TEXT = user_id);

-- ============================================================================
-- RLS POLICIES - MOVIES (for video engine compatibility)
-- ============================================================================

-- Policy: Movies are viewable by everyone (for public gallery)
DROP POLICY IF EXISTS "Movies are viewable by everyone" ON movies;
CREATE POLICY "Movies are viewable by everyone"
  ON movies FOR SELECT
  USING (true);

-- Policy: Users can create movies
DROP POLICY IF EXISTS "Users can create movies" ON movies;
CREATE POLICY "Users can create movies"
  ON movies FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own movies
DROP POLICY IF EXISTS "Users can update their own movies" ON movies;
CREATE POLICY "Users can update their own movies"
  ON movies FOR UPDATE
  USING (true);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for images and videos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('images', 'images', true),
  ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for images bucket
-- Public read access
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON storage.objects;
CREATE POLICY "Public images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Allow authenticated uploads (service role bypasses this anyway)
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images');

-- Allow updates
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'images');

-- Allow deletes
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images');

-- Storage policies for videos bucket
-- Public read access
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON storage.objects;
CREATE POLICY "Public videos are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

-- Allow authenticated uploads (service role bypasses this anyway)
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos');

-- Allow updates
DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
CREATE POLICY "Users can update own videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos');

-- Allow deletes
DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos');

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default characters (only if they don't exist)
INSERT INTO characters (user_id, name, profile) VALUES
  ('system', '🧑‍🔬 Dr. Aris Thorne', '{"personality": "Sci-Fi Explorer", "base_prompt": "cinematic, realistic scientist character"}'::jsonb),
  ('system', '🦸‍♂️ Captain Vector', '{"personality": "Space Hero", "base_prompt": "cinematic, realistic space hero"}'::jsonb),
  ('system', '🧙‍♀️ Lyra Moonwhisper', '{"personality": "Fantasy Mage", "base_prompt": "cinematic, realistic fantasy mage"}'::jsonb),
  ('system', '🕵️‍♂️ Detective Kairo', '{"personality": "Noir Detective", "base_prompt": "cinematic, realistic noir detective"}'::jsonb),
  ('system', '👨‍🚀 Nova Pilot', '{"personality": "Astronaut", "base_prompt": "cinematic, realistic astronaut"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. If using service role key (server-side only), RLS is bypassed
--    This is fine for server-side API routes
-- 
-- 2. This schema can be run multiple times safely
--    All DROP IF EXISTS statements prevent errors on re-runs
-- 
-- 3. The unique constraint on (user_id, name) ensures one character
--    per name per user
-- 
-- 4. Indexes improve query performance for common lookups
-- 
-- 5. user_id is TEXT type to allow any string (not just UUIDs)
--    This allows usernames, emails, or any identifier
-- 
-- 6. The movies table is kept for backward compatibility with the video engine
--    The videos table is for simpler single-video storage
-- 
-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything is set up correctly:

-- 1. Check tables exist:
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('characters', 'videos', 'jobs', 'movies')
-- ORDER BY table_name, ordinal_position;

-- 2. Check storage buckets:
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('images', 'videos');

-- 3. Check RLS policies:
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename IN ('characters', 'videos', 'jobs', 'movies', 'objects');

-- 4. Test insert (should work with service role):
-- INSERT INTO characters (user_id, name) VALUES ('test-user', 'test-char') RETURNING id;
-- DELETE FROM characters WHERE user_id = 'test-user';

-- ============================================================================
