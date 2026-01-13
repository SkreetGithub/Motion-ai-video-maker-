# Motion AI Video Engine - Complete Documentation

## Overview

The **Motion AI Video Engine** is a production-ready, enterprise-grade AI video generation system designed to create long-form cinematic videos with consistent character continuity, professional cinematography, and seamless scene transitions. It combines multiple AI models (OpenAI, Replicate, Supabase) to generate high-quality video content automatically.

### What It's Made For

- **Long-form video creation**: Generate videos up to 60 minutes in length
- **Cinematic storytelling**: Create professional movie-quality videos with consistent visual style
- **Character continuity**: Maintain consistent character appearance across multiple scenes
- **Automated scene generation**: AI-powered script writing and video generation
- **Multi-model fallback**: Automatic failover between different video generation models
- **Production workflows**: Built for scalability, reliability, and error handling

---

## Core Capabilities

### 1. **Multi-Model Video Generation**
- Supports 4 different AI video models with automatic fallback
- Cost-optimized model selection based on priority
- Circuit breaker pattern for reliability
- Parallel scene processing for faster generation

### 2. **AI-Powered Script Generation**
- OpenAI GPT-4 integration for scene scripting
- Maintains story continuity across scenes
- Generates cinematic visual descriptions
- Creates natural dialogue and scene transitions

### 3. **Character System**
- Character database integration (Supabase)
- Visual consistency locking across scenes
- Character personality and appearance management
- Reference image support

### 4. **Storage & Database**
- Automatic video upload to Supabase Storage
- Movie metadata tracking
- Scene-by-scene progress tracking
- User association and project management

### 5. **Progress Tracking**
- Real-time progress updates
- Scene-by-scene status monitoring
- Success/failure rate tracking
- Performance metrics

---

## Configuration & Constants

### Video Constraints

```javascript
VIDEO_CONSTRAINTS = {
  MIN_DURATION: 4,              // Minimum scene duration (seconds)
  MAX_DURATION: 30,             // Maximum scene duration (seconds)
  MAX_TOTAL_DURATION: 3600,     // Maximum total video (60 minutes)
  DEFAULT_SCENE_DURATION: 6,    // Default scene length
  DEFAULT_FPS: 24,              // Frames per second
  ASPECT_RATIO: "16:9",         // Video aspect ratio
  MAX_PARALLEL_SCENES: 2,       // Parallel processing limit
  MODEL_TIMEOUT_MS: 300000,     // 5 minutes timeout
  UPLOAD_TIMEOUT_MS: 30000      // 30 seconds upload timeout
}
```

### Supported Video Models

1. **Google Veo 3.1 Fast** (Priority 1)
   - Max Duration: 30 seconds
   - Cost: $0.015/second
   - Best for: High-quality, fast generation

2. **Luma Dream Machine** (Priority 2)
   - Max Duration: 30 seconds
   - Cost: $0.01/second
   - Best for: Realistic cinematic videos

3. **Stable Video Diffusion** (Priority 3)
   - Max Duration: 30 seconds
   - Cost: $0.008/second
   - Best for: Image-to-video generation

4. **Zeroscope v2 XL** (Priority 4)
   - Max Duration: 30 seconds
   - Cost: $0.007/second
   - Best for: Budget-friendly generation

---

## Environment Variables

### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
OPENAI_API_KEY=your_openai_key
REPLICATE_API_TOKEN=your_replicate_token

# Optional
ELEVENLABS_API_KEY=your_elevenlabs_key
GOOGLE_API_KEY=your_google_key
OPENAI_MODEL=gpt-4o-mini  # Default model
```

---

## Main Functions

### 1. `createMovie(options)`

**Primary function for generating complete movies/videos.**

#### Parameters

```javascript
{
  baseStoryPrompt: string,        // Main story/concept description
  characterIds: string[],         // Array of character IDs
  totalDurationSeconds: number,   // Total video length (default: 120)
  sceneDuration: number,          // Duration per scene (default: 6)
  userId: string | null,          // Optional user ID
  onProgress: function | null,    // Progress callback
  onSceneComplete: function | null, // Scene completion callback
  enableParallel: boolean,        // Enable parallel processing (default: true)
  modelChain: string[] | null,   // Custom model priority chain
  projectName: string | null      // Optional project name
}
```

#### Returns

```javascript
{
  movieId: string,                // Generated movie ID
  totalScenes: number,            // Total scenes attempted
  successfulScenes: number,       // Successfully generated scenes
  failedScenes: number,          // Failed scenes count
  totalDuration: number,          // Total duration in seconds
  scenes: Array<SceneData>,       // Array of successful scenes
  failed: Array<FailedScene>,    // Array of failed scenes
  summary: {
    total: number,
    completed: number,
    failed: number,
    successRate: number,
    totalTime: number,
    avgSceneTime: number
  },
  characters: Array<Character>,
  generatedAt: string,            // ISO timestamp
  dbRecord: object | null,        // Database record
  projectName: string | null
}
```

#### Example Usage

```javascript
import { createMovie } from '@/lib/videoEngine';

const result = await createMovie({
  baseStoryPrompt: "A sci-fi adventure about time travel",
  characterIds: ["char-123", "char-456"],
  totalDurationSeconds: 60,
  sceneDuration: 8,
  onProgress: (progress) => {
    console.log(`Scene ${progress.scene}/${progress.total} - ${progress.percentage}%`);
  },
  onSceneComplete: (scene) => {
    console.log(`Scene ${scene.scene} completed: ${scene.video}`);
  }
});
```

---

### 2. `getMovie(movieId)`

**Retrieve a movie record from the database.**

#### Parameters

- `movieId` (string): The movie ID to retrieve

#### Returns

```javascript
{
  id: string,
  user_id: string | null,
  title: string,
  total_scenes: number,
  successful_scenes: number,
  total_duration: number,
  story_premise: string,
  character_ids: string[],
  scenes_data: Array<SceneData>,
  metadata: object,
  created_at: string
}
```

#### Example Usage

```javascript
import { getMovie } from '@/lib/videoEngine';

const movie = await getMovie('movie-123');
console.log(movie.title, movie.scenes_data);
```

---

### 3. `getRecentMovies(limit)`

**Get a list of recently created movies.**

#### Parameters

- `limit` (number, optional): Maximum number of movies to return (default: 10)

#### Returns

Array of movie objects (same structure as `getMovie`)

#### Example Usage

```javascript
import { getRecentMovies } from '@/lib/videoEngine';

const recent = await getRecentMovies(20);
recent.forEach(movie => console.log(movie.title));
```

---

## Internal Functions

### Configuration Functions

#### `createConfig()`
- Validates and loads environment variables
- Returns configuration object with Supabase and AI credentials
- Throws error if required variables are missing

#### `createClients(config)`
- Initializes Replicate, OpenAI, and Supabase clients
- Returns object with all client instances
- Creates both service role and anonymous Supabase clients

---

### Character Management

#### `getCharacters(supabase, characterIds)`
- Fetches character data from Supabase database
- Returns array of character objects
- Includes fallback for development/testing

**Character Object Structure:**
```javascript
{
  id: string,
  name: string,
  base_prompt: string,
  reference_image: string | null,
  personality: string,
  visual_details: string | null
}
```

#### `characterLockBlock(characters)`
- Generates prompt block for character consistency
- Ensures same appearance across scenes
- Returns formatted string for video generation prompts

---

### Script Generation

#### `generateSceneScript(options)`
- Uses OpenAI to generate cinematic scene scripts
- Maintains story continuity
- Returns formatted script with visual, dialogue, and summary sections

**Options:**
```javascript
{
  openai: OpenAIClient,
  openaiModel: string,
  storySoFar: string,
  sceneNumber: number,
  totalScenes: number,
  characters: Array<Character>,
  baseStoryPrompt: string,
  previousSceneEnd: string | null
}
```

**Returns:**
```javascript
"SCENE_VISUAL:\n[description]\n\nDIALOGUE:\n[lines]\n\nSCENE_SUMMARY:\n[summary]"
```

#### `extractSceneParts(sceneScript)`
- Parses scene script into structured parts
- Returns object with `visual`, `dialogue`, `summary`, and `fullScript`

---

### Video Generation

#### `buildVideoPrompt(sceneParts, characters, previousSceneEnd)`
- Combines scene parts with global style and character locks
- Creates optimized prompt for video generation
- Ensures continuity between scenes
- Truncates to max 4000 characters

#### `generateSceneVideo(clients, prompt, duration, modelChain)`
- Generates video using Replicate API
- Tries models in priority order with fallback
- Implements circuit breaker pattern
- Handles timeouts and errors gracefully

**Returns:**
```javascript
{
  videoUrl: string,
  model: string,
  duration: number,
  promptLength: number
}
```

---

### Storage & Database

#### `saveVideo(clients, videoUrl)`
- Downloads video from external URL
- Uploads to Supabase Storage
- Returns public URL for the video
- Handles timeouts and errors

#### `saveMovieRecord(clients, movieData, userId)`
- Saves complete movie record to database
- Stores all scene data and metadata
- Returns database record or null on error

---

### Processing & Utilities

#### `processScenesInParallel(sceneFns, maxParallel)`
- Processes multiple scenes concurrently
- Limits parallel execution to prevent overload
- Returns array of results in order

#### `ProgressTracker` (Class)
- Tracks progress across scene generation
- Provides callbacks for progress updates
- Records failures and success rates

**Methods:**
- `notify(sceneNumber, status, data)` - Update progress
- `addFailure(sceneNumber, error)` - Record failure
- `getSummary()` - Get completion summary

#### `CircuitBreaker` (Class)
- Prevents repeated failures on problematic models
- Tracks failure counts per model
- Auto-resets after timeout period

**Methods:**
- `canExecute(model)` - Check if model can be used
- `recordSuccess(model)` - Record successful execution
- `recordFailure(model)` - Record failure
- `getStatus(model)` - Get circuit breaker status

---

## Global Visual Style Lock

The engine applies a consistent cinematic style across all generated videos:

```
- Cinematic lighting
- Film color grading
- Smooth camera movement
- Ultra realistic
- High temporal consistency
- No flicker
- Professional movie look
- Consistent motion blur
- Depth of field
- 4K quality
- Arri Alexa camera style
- Roger Deakins cinematography
- Christopher Nolan film style
```

---

## Error Handling

The engine includes comprehensive error handling:

1. **Model Failures**: Automatic fallback to next model in chain
2. **Circuit Breaker**: Prevents repeated failures on broken models
3. **Timeouts**: Configurable timeouts for API calls and uploads
4. **Validation**: Input validation with helpful error messages
5. **Graceful Degradation**: Continues processing even if some scenes fail

---

## Performance Optimizations

1. **Parallel Processing**: Up to 2 scenes processed simultaneously
2. **Model Prioritization**: Cost and quality-based model selection
3. **Caching**: Supabase storage caching for faster access
4. **Timeout Management**: Prevents hanging on slow API calls
5. **Progress Tracking**: Real-time updates without blocking

---

## Database Schema

### Movies Table

```sql
- id: UUID (primary key)
- user_id: UUID (foreign key, nullable)
- title: TEXT
- total_scenes: INTEGER
- successful_scenes: INTEGER
- total_duration: INTEGER (seconds)
- story_premise: TEXT
- character_ids: JSONB
- scenes_data: JSONB
- metadata: JSONB
- created_at: TIMESTAMP
```

### Characters Table

```sql
- id: UUID (primary key)
- name: TEXT
- base_prompt: TEXT
- reference_image: TEXT (nullable)
- personality: TEXT
- visual_details: TEXT (nullable)
- created_at: TIMESTAMP
```

### Storage Bucket

- **Bucket Name**: `videos`
- **Path Format**: `videos/{videoId}.mp4`
- **Content Type**: `video/mp4`
- **Cache Control**: 3600 seconds

---

## Usage Examples

### Basic Video Creation

```javascript
import { createMovie } from '@/lib/videoEngine';

const movie = await createMovie({
  baseStoryPrompt: "A short film about a robot learning to paint",
  characterIds: ["robot-001"],
  totalDurationSeconds: 30,
  sceneDuration: 6
});

console.log(`Created movie: ${movie.movieId}`);
console.log(`Success rate: ${movie.summary.successRate}%`);
```

### With Progress Tracking

```javascript
const movie = await createMovie({
  baseStoryPrompt: "Adventure story",
  characterIds: ["hero-001", "villain-001"],
  totalDurationSeconds: 120,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
    console.log(`Status: ${progress.status}`);
    console.log(`Elapsed: ${progress.elapsed}ms`);
  },
  onSceneComplete: (scene) => {
    console.log(`Scene ${scene.scene} video: ${scene.video}`);
  }
});
```

### Custom Model Chain

```javascript
const movie = await createMovie({
  baseStoryPrompt: "Sci-fi thriller",
  characterIds: ["protagonist-001"],
  totalDurationSeconds: 60,
  modelChain: [
    "luma/dream-machine",
    "google/veo-3.1-fast"
  ]
});
```

---

## Best Practices

1. **Story Prompts**: Be specific and descriptive (minimum 10 characters)
2. **Character IDs**: Always provide valid character IDs from database
3. **Duration**: Keep total duration under 60 minutes for best results
4. **Scene Duration**: 6-8 seconds per scene works best
5. **Error Handling**: Always check `successfulScenes` count
6. **Progress Callbacks**: Use for better UX in production
7. **Parallel Processing**: Enable for faster generation (default: true)

---

## Limitations

1. Maximum total duration: 60 minutes (3600 seconds)
2. Maximum scene duration: 30 seconds (model-dependent)
3. Minimum scene duration: 4 seconds
4. Parallel scenes: Maximum 2 at a time
5. Model timeout: 5 minutes per scene
6. Upload timeout: 30 seconds per video

---

## Troubleshooting

### Common Issues

1. **"No enabled video models available"**
   - Check that at least one model is enabled in `VIDEO_MODELS`
   - Verify Replicate API token is valid

2. **"Circuit breaker open"**
   - Model has failed too many times
   - Wait for timeout or use different model chain

3. **"Failed to fetch video"**
   - Network issue or invalid video URL
   - Check Replicate API status

4. **"Missing/invalid environment variables"**
   - Create `.env.local` file with required variables
   - See Environment Variables section above

---

## License & Credits

- **OpenAI**: GPT-4 for script generation
- **Replicate**: Video generation models
- **Supabase**: Database and storage
- **Next.js**: Framework

---

## Version

- **Engine Version**: Production (JS)
- **Last Updated**: 2024
- **Next.js Version**: 15.1.6+
- **Node Version**: 20+

---

## Support

For issues or questions:
1. Check environment variables configuration
2. Verify API keys are valid
3. Review error messages in console
4. Check Supabase database connectivity
5. Ensure storage bucket is properly configured

