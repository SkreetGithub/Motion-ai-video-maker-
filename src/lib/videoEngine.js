/**
 * ULTIMATE AI VIDEO ENGINE - PRODUCTION CONFIGURED (JS)
 * IMPORTANT:
 * - No API keys are hardcoded here.
 * - Configure via .env.local (see .env.example).
 */

import "server-only";

import Replicate from "replicate";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { getEnv } from "@/lib/env";

/* =======================
   ENVIRONMENT CONFIGURATION
======================= */

function createConfig() {
  const env = getEnv();

  return {
    supabase: {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
    },
    ai: {
      openai: env.OPENAI_API_KEY,
      openaiModel: env.OPENAI_MODEL || "gpt-4o-mini",
      replicate: env.REPLICATE_API_TOKEN,
      elevenlabs: env.ELEVENLABS_API_KEY,
      google: env.GOOGLE_API_KEY
    }
  };
}

/* =======================
   CLIENTS INITIALIZATION
======================= */

function createClients(config) {
  const replicate = new Replicate({ auth: config.ai.replicate });
  const openai = new OpenAI({ apiKey: config.ai.openai });

  // Server-side client (service role)
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false }
  });

  // Public client (anon)
  const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey);

  return { replicate, openai, supabase, supabaseAnon };
}

/* =======================
   CONSTANTS & CONFIGURATION
======================= */

export const VIDEO_CONSTRAINTS = {
  MIN_DURATION: 4,
  MAX_DURATION: 30,
  MAX_TOTAL_DURATION: 60 * 60, // 60 minutes
  DEFAULT_SCENE_DURATION: 6,
  DEFAULT_FPS: 24,
  ASPECT_RATIO: "16:9",
  MAX_PARALLEL_SCENES: 2,
  MODEL_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  UPLOAD_TIMEOUT_MS: 30 * 1000 // 30 seconds
};

export const VIDEO_MODELS = {
  "google/veo-3.1-fast": {
    name: "Google Veo 3.1 Fast",
    maxDuration: 30,
    costPerSecond: 0.015,
    priority: 1,
    enabled: true,
    buildInput: ({ prompt, duration, fps, aspect_ratio }) => ({
      prompt,
      duration,
      fps,
      aspect_ratio
    })
  },
  "luma/dream-machine": {
    name: "Luma Dream Machine",
    maxDuration: 30,
    costPerSecond: 0.01,
    priority: 2,
    enabled: true,
    buildInput: ({ prompt, duration, fps }) => ({
      prompt,
      duration,
      style: "realistic",
      fps
    })
  },
  "stability-ai/svd": {
    name: "Stable Video Diffusion",
    maxDuration: 30,
    costPerSecond: 0.008,
    priority: 3,
    enabled: true,
    buildInput: ({ prompt, duration, fps }) => ({
      image: null, // Requires image input
      prompt,
      num_frames: Math.floor(duration * fps),
      fps
    })
  },
  "anotherjesse/zeroscope-v2-xl": {
    name: "Zeroscope v2 XL",
    maxDuration: 30,
    costPerSecond: 0.007,
    priority: 4,
    enabled: true,
    buildInput: ({ prompt, duration, fps }) => ({
      prompt,
      num_frames: Math.floor(duration * fps),
      fps
    })
  }
};

/* =======================
   GLOBAL VISUAL LOCK 🔒
======================= */

const GLOBAL_STYLE = `
CINEMATIC STYLE LOCK:
- cinematic lighting
- film color grading
- smooth camera movement
- ultra realistic
- high temporal consistency
- no flicker
- professional movie look
- consistent motion blur
- depth of field
- 4K quality
- Arri Alexa camera style
- Roger Deakins cinematography
- Christopher Nolan film style
`;

/* =======================
   CHARACTER SYSTEM
======================= */

async function getCharacters(supabase, characterIds) {
  try {
    const { data, error } = await supabase.from("characters").select("*").in("id", characterIds);

    if (error) throw new Error(`Failed to fetch characters: ${error.message}`);
    if (!data || data.length === 0) throw new Error("No characters found with provided IDs");

    return data;
  } catch (error) {
    // Safe fallback for early development/testing:
    return characterIds.map((id) => ({
      id,
      name: `Character ${String(id).slice(0, 4)}`,
      base_prompt: "cinematic, realistic character",
      reference_image: null,
      personality: "realistic movie character"
    }));
  }
}

function characterLockBlock(characters) {
  return characters
    .map(
      (c) => `
CHARACTER LOCK: ${c.name}
${c.base_prompt || "cinematic, realistic character"}
- same face, same body, same hairstyle across all scenes
- same wardrobe style and colors
- identity locked with temporal consistency
- consistent facial features and proportions
- unchanged clothing unless story requires
${c.visual_details ? `- ${c.visual_details}` : ""}
${c.reference_image ? `- Based on reference image: ${c.reference_image}` : ""}
`
    )
    .join("\n");
}

/* =======================
   PROGRESS TRACKING
======================= */

class ProgressTracker {
  constructor(totalScenes, onProgress = null) {
    this.totalScenes = totalScenes;
    this.completedScenes = 0;
    this.failedScenes = [];
    this.startTime = Date.now();
    this.onProgress = onProgress;
  }

  notify(sceneNumber, status, data = {}) {
    this.completedScenes = sceneNumber;
    const progress = {
      scene: sceneNumber,
      total: this.totalScenes,
      percentage: Math.round((sceneNumber / this.totalScenes) * 100),
      elapsed: Date.now() - this.startTime,
      status,
      ...data
    };

    if (this.onProgress) this.onProgress(progress);
    return progress;
  }

  addFailure(sceneNumber, error) {
    const failure = { scene: sceneNumber, error: error.message, timestamp: Date.now() };
    this.failedScenes.push(failure);
    return failure;
  }

  getSummary() {
    return {
      total: this.totalScenes,
      completed: this.completedScenes,
      failed: this.failedScenes.length,
      failedScenes: this.failedScenes,
      successRate:
        this.totalScenes > 0
          ? ((this.completedScenes - this.failedScenes.length) / this.totalScenes) * 100
          : 0,
      totalTime: Date.now() - this.startTime
    };
  }
}

/* =======================
   CIRCUIT BREAKER
======================= */

class CircuitBreaker {
  constructor(failureThreshold = 3, resetTimeout = 60 * 1000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = new Map();
  }

  canExecute(model) {
    const record = this.failures.get(model);
    if (!record) return true;

    if (Date.now() - record.lastFailure > this.resetTimeout) {
      this.failures.delete(model);
      return true;
    }

    return record.count < this.failureThreshold;
  }

  recordSuccess(model) {
    this.failures.delete(model);
  }

  recordFailure(model) {
    const record = this.failures.get(model) || { count: 0, lastFailure: 0 };
    record.count++;
    record.lastFailure = Date.now();
    this.failures.set(model, record);
    return record.count;
  }

  getStatus(model) {
    const record = this.failures.get(model);
    if (!record) return "closed";
    return record.count >= this.failureThreshold ? "open" : "half-open";
  }
}

export const circuitBreaker = new CircuitBreaker();

/* =======================
   🎬 DIRECTOR AI (OPENAI)
======================= */

async function generateSceneScript({
  openai,
  openaiModel,
  storySoFar,
  sceneNumber,
  totalScenes,
  characters,
  baseStoryPrompt,
  previousSceneEnd = null
}) {
  const systemPrompt = `You are a professional film director and screenwriter with 20 years experience.
You write realistic cinematic scenes with strong continuity for AI video generation.

CRITICAL RULES:
1. Scenes MUST flow naturally from previous scene
2. END every scene with CONTINUOUS MOTION that leads into next scene
3. Keep dialogue SHORT and REALISTIC (movie dialogue, not prose)
4. NEVER reset story or character positions
5. Maintain consistent character wardrobes and appearances
6. Always describe VISUAL elements that can be shown on screen
7. Focus on actions, expressions, camera movements
8. Each scene should have a clear beginning, middle, and cliffhanger ending

FORMAT STRICTLY:
SCENE_VISUAL:
[Detailed visual description including camera movements, lighting, character actions]

DIALOGUE:
Character: "Line"
Character: "Line"

SCENE_SUMMARY:
[One paragraph summary for continuity]`;

  const userPrompt = `
STORY PREMISE: ${baseStoryPrompt}

${previousSceneEnd ? `PREVIOUS SCENE ENDED WITH: ${previousSceneEnd}\n` : ""}
STORY CONTINUITY SO FAR:
${storySoFar || "Beginning of the film."}

CHARACTERS:
${characters
  .map(
    (c) =>
      `- ${c.name}: ${c.personality || "realistic movie character"}${
        c.base_prompt ? ` (${c.base_prompt})` : ""
      }`
  )
  .join("\n")}

Write SCENE ${sceneNumber} of ${totalScenes}.

CONTINUATION REQUIREMENTS:
- Start exactly where previous scene left off
- Describe camera movements: pan, dolly, push in, crane shot, etc.
- Include lighting and atmosphere
- Characters should be in motion when possible
- End with a moment that naturally leads into scene ${sceneNumber + 1}
- Dialogue should be sparse and impactful (max 3-4 lines total)
- Use present tense for visual descriptions`;

  try {
    const response = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    return response.choices?.[0]?.message?.content || "";
  } catch {
    // Fallback if OpenAI fails
    return `SCENE_VISUAL:
A cinematic scene showing ${characters.map((c) => c.name).join(" and ")} continuing their story.
Professional camera movements, smooth transitions.

DIALOGUE:
${characters[0]?.name || "Character"}: "We need to keep moving."

SCENE_SUMMARY:
The characters continue their journey, maintaining momentum for the next scene.`;
  }
}

function extractSceneParts(sceneScript) {
  const visualMatch = sceneScript.match(
    /SCENE_VISUAL:\n([\s\S]*?)(?:\n\nDIALOGUE:|\n\nSCENE_SUMMARY:|$)/
  );
  const dialogueMatch = sceneScript.match(/DIALOGUE:\n([\s\S]*?)(?:\n\nSCENE_SUMMARY:|$)/);
  const summaryMatch = sceneScript.match(/SCENE_SUMMARY:\n([\s\S]*)$/);

  return {
    visual: visualMatch ? visualMatch[1].trim() : sceneScript.substring(0, 500),
    dialogue: dialogueMatch ? dialogueMatch[1].trim() : "",
    summary: summaryMatch ? summaryMatch[1].trim() : "Scene continues the story.",
    fullScript: sceneScript
  };
}

/* =======================
   SCENE → VIDEO PROMPT
======================= */

function buildVideoPrompt(sceneParts, characters, previousSceneEnd = null) {
  const { visual, dialogue } = sceneParts;

  let prompt = `
CINEMATIC SCENE DIRECTIONS:
${visual}

${dialogue ? `DIALOGUE SCENE:\n${dialogue}` : ""}

${previousSceneEnd ? `CONTINUE FROM PREVIOUS SCENE: ${previousSceneEnd}` : "Opening scene of the film."}

${GLOBAL_STYLE}

${characterLockBlock(characters)}

CONTINUOUS CINEMATOGRAPHY:
- smooth camera transitions
- professional camera movements
- maintain temporal consistency
- no jump cuts or scene resets
- natural motion flow
- filmic pacing

TECHNICAL REQUIREMENTS:
- 4K resolution, film quality
- natural film grain
- cinematic 16:9 aspect ratio
- professional color grading
- realistic lighting and shadows
- consistent character appearance
- temporal stability between frames
`;

  const MAX_PROMPT_LENGTH = 4000;
  if (prompt.length > MAX_PROMPT_LENGTH) prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
  return prompt.trim();
}

/* =======================
   VIDEO GENERATION WITH FALLBACK
======================= */

async function generateSceneVideo({ replicate }, prompt, duration = 8, modelChain = null) {
  const models = (modelChain || [
    "google/veo-3.1-fast",
    "luma/dream-machine",
    "stability-ai/svd",
    "anotherjesse/zeroscope-v2-xl"
  ]).filter((m) => VIDEO_MODELS[m]?.enabled);

  if (models.length === 0) throw new Error("No enabled video models available");

  const errors = [];

  for (const modelName of models) {
    if (!circuitBreaker.canExecute(modelName)) {
      errors.push({ model: modelName, error: "Circuit breaker open" });
      continue;
    }

    const model = VIDEO_MODELS[modelName];
    const actualDuration = Math.min(
      Math.max(duration, VIDEO_CONSTRAINTS.MIN_DURATION),
      model.maxDuration
    );

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Model ${modelName} timeout after ${VIDEO_CONSTRAINTS.MODEL_TIMEOUT_MS / 1000}s`
              )
            ),
          VIDEO_CONSTRAINTS.MODEL_TIMEOUT_MS
        );
      });

      const input = model.buildInput({
        prompt,
        duration: actualDuration,
        fps: VIDEO_CONSTRAINTS.DEFAULT_FPS,
        aspect_ratio: VIDEO_CONSTRAINTS.ASPECT_RATIO
      });

      const apiCall = replicate.run(modelName, { input });
      const output = await Promise.race([apiCall, timeoutPromise]);

      let videoUrl;
      if (Array.isArray(output)) videoUrl = output[0];
      else if (output && typeof output === "object") videoUrl = output.video || output.url || output.output;
      else if (typeof output === "string") videoUrl = output;

      if (!videoUrl || typeof videoUrl !== "string") {
        throw new Error(`Invalid video URL from ${modelName}`);
      }

      circuitBreaker.recordSuccess(modelName);
      return { videoUrl, model: modelName, duration: actualDuration, promptLength: prompt.length };
    } catch (error) {
      const failureCount = circuitBreaker.recordFailure(modelName);
      errors.push({ model: modelName, error: error.message, failureCount });
      if (failureCount >= 2) continue;
    }
  }

  throw new Error(
    `All video generation models failed:\n${errors.map((e) => `  - ${e.model}: ${e.error}`).join("\n")}`
  );
}

/* =======================
   STORAGE & UPLOAD
======================= */

async function saveVideo({ supabase }, videoUrl) {
  if (videoUrl && videoUrl.includes("supabase.co")) return videoUrl;
  if (!videoUrl) throw new Error("No video URL provided");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VIDEO_CONSTRAINTS.UPLOAD_TIMEOUT_MS);
  const res = await fetch(videoUrl, { signal: controller.signal });
  clearTimeout(timeoutId);

  if (!res.ok) throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  const videoId = uuidv4();
  const path = `videos/${videoId}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(path, Buffer.from(buffer), {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "3600"
    });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
  return urlData.publicUrl;
}

/* =======================
   PARALLEL PROCESSING
======================= */

async function processScenesInParallel(sceneFns, maxParallel = VIDEO_CONSTRAINTS.MAX_PARALLEL_SCENES) {
  const results = [];
  const running = new Set();

  for (let i = 0; i < sceneFns.length; i++) {
    while (running.size >= maxParallel) {
      await Promise.race(running);
    }

    const sceneIndex = i;
    const promise = sceneFns[i]()
      .then((result) => {
        running.delete(promise);
        results[sceneIndex] = result;
        return result;
      })
      .catch((error) => {
        running.delete(promise);
        results[sceneIndex] = { scene: sceneIndex + 1, error: error.message, success: false };
        return null;
      });

    running.add(promise);
  }

  await Promise.allSettled(running);
  return results.filter((r) => r !== undefined);
}

/* =======================
   DATABASE OPERATIONS
======================= */

async function saveMovieRecord({ supabase }, movieData, userId = null) {
  const { totalScenes, duration, scenes, baseStoryPrompt, characterIds } = movieData;

  try {
    const successfulScenes = scenes.filter((s) => s.video && s.success !== false);

    const { data, error } = await supabase
      .from("movies")
      .insert({
        user_id: userId,
        title: baseStoryPrompt.substring(0, 100),
        total_scenes: totalScenes,
        successful_scenes: successfulScenes.length,
        total_duration: duration,
        story_premise: baseStoryPrompt,
        character_ids: characterIds,
        scenes_data: successfulScenes.map((s) => ({
          scene: s.scene,
          video_url: s.video,
          script: s.script?.substring(0, 1000),
          model: s.model,
          duration: s.duration
        })),
        metadata: {
          generated_at: new Date().toISOString(),
          models_used: [...new Set(successfulScenes.map((s) => s.model))],
          success_rate: totalScenes > 0 ? (successfulScenes.length / totalScenes) * 100 : 0,
          total_time: movieData.totalTime || 0
        }
      })
      .select()
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/* =======================
   🎞️ MASTER LONG-FORM ENGINE
======================= */

export async function createMovie({
  baseStoryPrompt,
  characterIds,
  totalDurationSeconds = 120,
  sceneDuration = VIDEO_CONSTRAINTS.DEFAULT_SCENE_DURATION,
  userId = null,
  onProgress = null,
  onSceneComplete = null,
  enableParallel = true,
  modelChain = null,
  projectName = null
}) {
  const config = createConfig();
  const clients = createClients(config);

  if (!baseStoryPrompt || baseStoryPrompt.trim().length < 10) {
    throw new Error("Story prompt must be at least 10 characters");
  }
  if (!characterIds || characterIds.length === 0) {
    throw new Error("At least one character ID is required");
  }
  if (totalDurationSeconds > VIDEO_CONSTRAINTS.MAX_TOTAL_DURATION) {
    throw new Error(`Maximum duration is ${VIDEO_CONSTRAINTS.MAX_TOTAL_DURATION / 60} minutes`);
  }

  const totalScenes = Math.max(1, Math.ceil(totalDurationSeconds / sceneDuration));
  const progress = new ProgressTracker(totalScenes, onProgress);
  const characters = await getCharacters(clients.supabase, characterIds);

  let storySoFar = "";
  let previousSceneEnd = null;
  const scenes = [];
  const startTime = Date.now();

  const sceneFns = [];

  for (let i = 1; i <= totalScenes; i++) {
    sceneFns.push(async () => {
      const sceneStartTime = Date.now();
      let sceneData = { scene: i, success: false, startTime: sceneStartTime };

      try {
        progress.notify(i, "scripting");

        const sceneScript = await generateSceneScript({
          openai: clients.openai,
          openaiModel: config.ai.openaiModel,
          storySoFar,
          sceneNumber: i,
          totalScenes,
          characters,
          baseStoryPrompt,
          previousSceneEnd
        });

        const sceneParts = extractSceneParts(sceneScript);
        sceneData.script = sceneScript;

        const videoPrompt = buildVideoPrompt(sceneParts, characters, previousSceneEnd);
        sceneData.promptPreview = `${videoPrompt.substring(0, 200)}...`;

        progress.notify(i, "generating", { promptLength: videoPrompt.length });
        const videoResult = await generateSceneVideo(clients, videoPrompt, sceneDuration, modelChain);

        progress.notify(i, "saving");
        const savedUrl = await saveVideo(clients, videoResult.videoUrl);

        storySoFar += `\nScene ${i}: ${sceneParts.summary}`;
        previousSceneEnd = sceneParts.summary;

        sceneData = {
          ...sceneData,
          success: true,
          video: savedUrl,
          model: videoResult.model,
          duration: videoResult.duration,
          prompt: videoPrompt,
          summary: sceneParts.summary,
          endTime: Date.now(),
          totalTime: Date.now() - sceneStartTime
        };

        scenes.push(sceneData);
        if (onSceneComplete) onSceneComplete(sceneData);
        progress.notify(i, "completed", { model: videoResult.model, sceneTime: Date.now() - sceneStartTime });
        return sceneData;
      } catch (error) {
        progress.addFailure(i, error);
        sceneData = { ...sceneData, success: false, error: error.message, endTime: Date.now(), totalTime: Date.now() - sceneStartTime };
        scenes.push(sceneData);
        progress.notify(i, "failed", { error: error.message });
        return sceneData;
      }
    });
  }

  if (enableParallel && totalScenes > 1) {
    await processScenesInParallel(sceneFns, VIDEO_CONSTRAINTS.MAX_PARALLEL_SCENES);
  } else {
    for (let i = 0; i < sceneFns.length; i++) await sceneFns[i]();
  }

  const successfulScenes = scenes.filter((s) => s.success && s.video);
  const totalTime = Date.now() - startTime;

  let dbRecord = null;
  if (successfulScenes.length > 0) {
    dbRecord = await saveMovieRecord(
      clients,
      {
        totalScenes,
        duration: totalDurationSeconds,
        scenes: successfulScenes,
        baseStoryPrompt,
        characterIds,
        userId,
        totalTime,
        projectName
      },
      userId
    );
  }

  const summary = progress.getSummary();

  return {
    movieId: dbRecord?.id || `movie_${Date.now()}`,
    totalScenes,
    successfulScenes: successfulScenes.length,
    failedScenes: summary.failed,
    totalDuration: totalDurationSeconds,
    scenes: successfulScenes,
    failed: summary.failedScenes,
    summary: { ...summary, totalTime, avgSceneTime: summary.total ? totalTime / summary.total : 0 },
    characters: characters.map((c) => ({ id: c.id, name: c.name })),
    generatedAt: new Date().toISOString(),
    dbRecord,
    projectName
  };
}

/* =======================
   READ-ONLY QUERIES (PUBLIC)
======================= */

export async function getMovie(movieId) {
  const config = createConfig();
  const { supabaseAnon } = createClients(config);
  const { data, error } = await supabaseAnon.from("movies").select("*").eq("id", movieId).single();
  if (error) throw new Error(`Movie not found: ${error.message}`);
  return data;
}

export async function getRecentMovies(limit = 10) {
  const config = createConfig();
  const { supabaseAnon } = createClients(config);
  const { data, error } = await supabaseAnon.from("movies").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Failed to fetch recent movies: ${error.message}`);
  return data || [];
}

