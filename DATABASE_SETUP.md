# Database Setup Guide

## Quick Setup

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/hstbdphyxwfeaalpnueq
   - Click on **SQL Editor** in the left sidebar

2. **Run the Schema**
   - Open the `supabase-schema.sql` file
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Verify Setup**
   - The schema will create all tables, indexes, policies, and storage buckets
   - Check for any errors in the output
   - If successful, you should see "Success. No rows returned"

## Database Tables

### 1. `characters` Table
Stores character profiles for consistent video generation.

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - User identifier
- `name` (TEXT) - Character name
- `profile` (JSONB) - Character profile data (personality, base_prompt, etc.)
- `reference_image` (TEXT) - URL to reference image
- `seed` (BIGINT) - Random seed for consistency
- `created_at`, `updated_at` - Timestamps

### 2. `videos` Table
Stores individual generated videos.

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - User identifier
- `character_id` (UUID) - Reference to character
- `prompt` (TEXT) - Generation prompt
- `images` (JSONB) - Array of image URLs
- `video_url` (TEXT) - Final video URL
- `duration` (INTEGER) - Duration in seconds
- `metadata` (JSONB) - Additional metadata
- `created_at` - Timestamp

### 3. `jobs` Table
Tracks video generation jobs with progress and cost tracking.

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - User identifier
- `prompt` (TEXT) - Generation prompt
- `character_id` (UUID) - Reference to character
- `character_name` (TEXT) - Character name
- `character_profile` (JSONB) - Character profile
- `duration` (INTEGER) - Duration in seconds
- `style` (TEXT) - Video style
- `status` (TEXT) - Job status (queued, processing, completed, failed)
- `progress` (INTEGER) - Progress percentage (0-100)
- `error` (TEXT) - Error message if failed
- `result` (JSONB) - Result data
- `cost_tracking` (JSONB) - Cost breakdown
- `metadata` (JSONB) - Additional metadata
- `created_at`, `updated_at` - Timestamps

### 4. `movies` Table
Stores complete movie/video projects with multiple scenes (for video engine).

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - User identifier (nullable)
- `title` (TEXT) - Movie title
- `total_scenes` (INTEGER) - Total number of scenes
- `successful_scenes` (INTEGER) - Successfully generated scenes
- `total_duration` (INTEGER) - Total duration in seconds
- `story_premise` (TEXT) - Story description
- `character_ids` (JSONB) - Array of character IDs
- `scenes_data` (JSONB) - Array of scene data with video URLs
- `metadata` (JSONB) - Additional metadata
- `status` (TEXT) - Status (pending, generating, completed, failed)
- `created_at`, `updated_at` - Timestamps

## Storage Buckets

The schema automatically creates two storage buckets:

1. **`images`** - For character reference images
   - Public: Yes
   - Policies: Public read, authenticated upload

2. **`videos`** - For generated video files
   - Public: Yes
   - Policies: Public read, authenticated upload

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Characters**: Users can view/insert/update their own characters + public read
- **Videos**: Users can view/insert their own videos + public read
- **Jobs**: Users can view/insert/update/delete their own jobs
- **Movies**: Public read/write (for gallery functionality)

**Note:** When using the service role key (server-side), RLS is bypassed automatically.

## Verification

After running the schema, verify everything is set up:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('characters', 'videos', 'jobs', 'movies');

-- Check storage buckets
SELECT id, name, public 
FROM storage.buckets 
WHERE id IN ('images', 'videos');

-- Check default characters
SELECT id, name, user_id 
FROM characters 
WHERE user_id = 'system';
```

## Troubleshooting

### Error: "relation already exists"
- This is normal if you've run the schema before
- The schema uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times

### Error: "policy already exists"
- The schema uses `DROP POLICY IF EXISTS` before creating
- This is safe and expected

### Storage buckets not created
- Storage buckets are created via SQL
- If they don't appear, check the Supabase Dashboard > Storage
- You can create them manually if needed

### RLS blocking queries
- If using service role key, RLS is bypassed
- If using anon key, make sure policies are correct
- Check that `auth.uid()` returns the correct user ID

## Default Characters

The schema includes 5 default characters:
- 🧑‍🔬 Dr. Aris Thorne (Sci-Fi Explorer)
- 🦸‍♂️ Captain Vector (Space Hero)
- 🧙‍♀️ Lyra Moonwhisper (Fantasy Mage)
- 🕵️‍♂️ Detective Kairo (Noir Detective)
- 👨‍🚀 Nova Pilot (Astronaut)

These are created with `user_id = 'system'` and are available to all users.

## Next Steps

1. ✅ Run the schema SQL
2. ✅ Verify tables and buckets exist
3. ✅ Test character fetching via API
4. ✅ Test video creation
5. ✅ Check gallery displays videos correctly

Your database is now ready for the Motion AI Video Engine!

