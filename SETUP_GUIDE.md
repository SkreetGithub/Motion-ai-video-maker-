# Motion AI Video Engine - Setup Guide

## Step 1: Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://hstbdphyxwfeaalpnueq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2sGD_dVLVEOCBQVbRK7S6g_p4FGEPPb
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1c9_YUzZAPNcRgFjP-oLRw_8erK_D_z

# AI Providers (Add your keys here)
OPENAI_API_KEY=your_openai_key_here
REPLICATE_API_TOKEN=your_replicate_token_here

# Optional
ELEVENLABS_API_KEY=
GOOGLE_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

**Important:** Replace `your_openai_key_here` and `your_replicate_token_here` with your actual API keys.

## Step 2: Set Up Supabase Database

1. Go to your Supabase project: https://hstbdphyxwfeaalpnueq.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql` into the editor
4. Click **Run** to execute the SQL

This will create:
- `characters` table
- `movies` table
- Indexes for performance
- Row Level Security (RLS) policies
- Default characters

## Step 3: Set Up Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Name it: `videos`
4. Set it as **Public**
5. Set file size limit to **100MB**
6. Add allowed MIME types: `video/mp4`, `video/webm`

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run the Development Server

```bash
npm run dev
```

The website will be available at `http://localhost:3000` (or the port shown in your terminal).

## Step 6: Test the Integration

1. Go to `/create` page
2. Fill out the form
3. Submit to create a video
4. Check `/gallery` to see your videos

## API Routes Created

- `POST /api/create-video` - Create a new video
- `GET /api/videos` - Get all videos
- `GET /api/videos/[id]` - Get a specific video
- `GET /api/characters` - Get all characters

## Database Schema

### Movies Table
- `id` - UUID (primary key)
- `user_id` - UUID (optional, for user association)
- `title` - Text
- `total_scenes` - Integer
- `successful_scenes` - Integer
- `total_duration` - Integer (seconds)
- `story_premise` - Text
- `character_ids` - JSONB array
- `scenes_data` - JSONB array (contains video URLs)
- `metadata` - JSONB object
- `status` - Text (pending, generating, completed, failed)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Characters Table
- `id` - UUID (primary key)
- `name` - Text
- `base_prompt` - Text
- `reference_image` - Text (URL)
- `personality` - Text
- `visual_details` - Text
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Troubleshooting

### "Missing/invalid environment variables"
- Make sure `.env.local` exists in the root directory
- Check that all required variables are set
- Restart the dev server after adding environment variables

### "Failed to fetch videos"
- Check that the Supabase tables are created
- Verify your Supabase credentials are correct
- Check browser console for detailed error messages

### "Storage upload failed"
- Make sure the `videos` bucket exists in Supabase Storage
- Verify the bucket is set to public
- Check file size limits

### Database connection issues
- Verify your Supabase URL and keys are correct
- Check Supabase project status
- Ensure RLS policies are set correctly

## Next Steps

1. Add authentication (Supabase Auth) for user-specific videos
2. Add OpenAI and Replicate API keys for video generation
3. Test video creation end-to-end
4. Customize characters and add more
5. Set up production deployment

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal/server logs
3. Verify all environment variables are set
4. Ensure database schema is created correctly

