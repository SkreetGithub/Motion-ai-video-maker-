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
import { getBudgetManager, MAX_BUDGET_EXPORT as MAX_BUDGET } from "@/lib/budgetManager";

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
    maxDuration: 8, // Google Veo only supports 4, 6, or 8 seconds
    allowedDurations: [4, 6, 8], // Valid durations for this model
    costPerSecond: 0.015,
    priority: 1,
    enabled: true,
    buildInput: ({ prompt, duration, fps, aspect_ratio }) => {
      // Google Veo only accepts 4, 6, or 8 seconds - clamp to nearest valid value
      let validDuration = duration;
      if (duration <= 5) {
        validDuration = 4;
      } else if (duration <= 7) {
        validDuration = 6;
      } else {
        validDuration = 8;
      }
      return {
        prompt,
        duration: validDuration,
        fps,
        aspect_ratio
      };
    }
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

    // Transform data to handle both old and new schema formats
    return data.map((char) => {
      // If profile is JSONB, extract fields (new schema)
      if (char.profile && typeof char.profile === 'object') {
        return {
          id: char.id,
          name: char.name,
          base_prompt: char.profile.base_prompt || "cinematic, realistic character",
          personality: char.profile.personality || "realistic movie character",
          reference_image: char.reference_image,
          visual_details: char.profile.visual_details || null,
        };
      }
      // Otherwise return as-is (old schema or already transformed)
      return {
        id: char.id,
        name: char.name,
        base_prompt: char.base_prompt || "cinematic, realistic character",
        personality: char.personality || "realistic movie character",
        reference_image: char.reference_image,
        visual_details: char.visual_details || null,
      };
    });
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
${c.personality ? `- Personality: ${c.personality}` : ""}
- CRITICAL: same face, same body, same hairstyle across ALL scenes
- CRITICAL: same wardrobe style and colors (unless story explicitly requires change)
- CRITICAL: identity locked with temporal consistency
- CRITICAL: consistent facial features and proportions in every frame
- CRITICAL: unchanged clothing unless story explicitly requires it
- CRITICAL: maintain exact same appearance from scene to scene
${c.visual_details ? `- Visual Details: ${c.visual_details}` : ""}
${c.reference_image ? `- Based on reference image: ${c.reference_image}` : ""}
- Character must look identical in every scene
- No variations in appearance, clothing, or physical characteristics
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

function safeExcerpt(text, maxChars) {
  if (!text) return "";
  const t = String(text).trim();
  if (!t) return "";
  return t.length > maxChars ? `${t.slice(0, maxChars)}\n…(truncated)…` : t;
}

function buildDirectorSystemPrompt({ baseStoryPrompt }) {
  // This is the "prompt engine": make the model plan beats, keep continuity, and write filmable output.
  return `You are a professional film director + screenwriter.
You write CINEMATIC, filmable scenes designed for AI video generation.

CORE OBJECTIVE:
- Make the best possible creative choices (visual blocking + actions + dialogue) while preserving continuity.

TOPIC / PREMISE ANCHOR (NON-NEGOTIABLE):
- The core premise is: "${baseStoryPrompt}"
- Every scene must advance this premise and stay in-genre.
- Do not introduce unrelated subplots, settings, or themes.

CONTINUITY RULES (NON-NEGOTIABLE):
1) Start exactly where the previous scene ended (positions, motion, props, wardrobe).
2) Never reset the scene, time, or character states unless the story explicitly transitions.
3) Keep names consistent and only introduce new characters if requested.

SCENE DESIGN RULES (BETTER CHOICES):
- Every scene must have: OBJECTIVE (what someone wants), OBSTACLE (what blocks it), TURN (a surprise), and HOOK (momentum into next scene).
- Prefer specific, filmable actions over abstract feelings.
- Include camera language that a cinematographer would understand (wide/medium/close, push-in, pan, dolly, handheld vs locked).
- Use environmental details that influence the scene (sound, crowd, weather, lighting).

DIALOGUE RULES (BETTER DIALOGUE):
- Dialogue must be SHORT and MOVIE-REALISTIC (no prose).
- Distinct voice per character: different rhythm, slang level, temperament, and tactics.
- Use subtext: characters rarely say exactly what they mean.
- Allow interruptions, reactions, and short interjections (e.g., "(beat)", "(overlapping)").
- Max 3–6 lines total unless the user explicitly requests more dialogue-heavy scenes.

OUTPUT FORMAT (STRICT):
SCENE_VISUAL:
[Filmable visual description. Include blocking + camera moves + lighting. Present tense.]

DIALOGUE:
Character: "Line"
Character: "Line"

SCENE_END_HOOK:
[1–2 sentences describing the final continuous motion / cliffhanger that leads directly into the next scene.]

SCENE_SUMMARY:
[One paragraph continuity summary: where everyone is, what changed, what they’re doing next.]`;
}

function buildDirectorUserPrompt({
  baseStoryPrompt,
  styleReference,
  previousSceneEnd,
  storySoFar,
  characters,
  sceneNumber,
  totalScenes
}) {
  const styleBlock = safeExcerpt(styleReference, 4500);
  const continuityBlock = safeExcerpt(storySoFar, 5000);

  return `
STORY PREMISE / PROJECT BRIEF:
${baseStoryPrompt}

${styleBlock ? `STYLE REFERENCE (tone + cadence only, do NOT copy verbatim):\n${styleBlock}\n` : ""}
${previousSceneEnd ? `PREVIOUS SCENE ENDED WITH (match this exactly): ${previousSceneEnd}\n` : ""}
STORY CONTINUITY SO FAR (treat as canon):
${continuityBlock || "Beginning of the film."}

CHARACTER DETAILS (keep voices distinct; do not change wardrobe/identity):
${characters
  .map((c) => {
    const lines = [];
    lines.push(`- ${c.name}`);
    if (c.personality) lines.push(`  - Personality/voice: ${c.personality}`);
    if (c.base_prompt) lines.push(`  - Visual style: ${c.base_prompt}`);
    if (c.visual_details) lines.push(`  - Visual details: ${c.visual_details}`);
    if (c.reference_image) lines.push(`  - Reference: ${c.reference_image}`);
    lines.push(`  - Must remain visually identical across scenes (face/body/hair/wardrobe)`);
    return lines.join("\n");
  })
  .join("\n")}

WRITE: SCENE ${sceneNumber} of ${totalScenes}.

REQUIREMENTS:
- Start exactly where the previous scene left off
- Make strong, specific choices (objective/obstacle/turn/hook)
- Add camera moves + blocking + lighting
- End with continuous motion that leads into scene ${sceneNumber + 1}
- Keep dialogue sparse (movie dialogue), 3–6 lines max`;
}

async function generateSceneScript({
  openai,
  openaiModel,
  storySoFar,
  sceneNumber,
  totalScenes,
  characters,
  baseStoryPrompt,
  previousSceneEnd = null,
  styleReference = null
}) {
  const systemPrompt = buildDirectorSystemPrompt({ baseStoryPrompt });
  const userPrompt = buildDirectorUserPrompt({
    baseStoryPrompt,
    styleReference,
    previousSceneEnd,
    storySoFar,
    characters,
    sceneNumber,
    totalScenes
  });

  try {
    console.log(`\n🎬 [SCENE ${sceneNumber}/${totalScenes}] Starting script generation...`);
    console.log(`📝 Story Premise: "${baseStoryPrompt.substring(0, 100)}${baseStoryPrompt.length > 100 ? '...' : ''}"`);
    console.log(`👥 Characters: ${characters.map(c => c.name).join(', ')}`);
    
    // Check rate limits
    const budgetManager = getBudgetManager();
    const rateLimitCheck = budgetManager.checkRateLimit("openai", "script-generation");
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit: ${rateLimitCheck.reason}. Retry after ${rateLimitCheck.retryAfter}s`);
    }

    console.log(`🤖 [SCENE ${sceneNumber}] Calling OpenAI (${openaiModel}) to generate scene script...`);
    const response = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    // Track OpenAI cost
    const usage = response.usage;
    if (usage) {
      const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      budgetManager.trackOpenAICost(totalTokens, openaiModel);
      console.log(`✅ [SCENE ${sceneNumber}] Script generated! Tokens: ${totalTokens} (prompt: ${usage.prompt_tokens || 0}, completion: ${usage.completion_tokens || 0})`);
    }

    const script = response.choices?.[0]?.message?.content || "";
    if (script) {
      const preview = script.substring(0, 150).replace(/\n/g, ' ');
      console.log(`📄 [SCENE ${sceneNumber}] Script preview: "${preview}..."`);
    }
    
    return script;
  } catch (error) {
    if (error.message?.includes("Rate limit")) {
      throw error;
    }
    // Fallback if OpenAI fails
    return `SCENE_VISUAL:
A cinematic scene showing ${characters.map((c) => c.name).join(" and ")} continuing their story.
Professional camera movements, smooth transitions.

DIALOGUE:
${characters[0]?.name || "Character"}: "We need to keep moving."

SCENE_END_HOOK:
They keep moving forward, still in motion as the moment cuts.

SCENE_SUMMARY:
The characters continue their journey, maintaining momentum for the next scene.`;
  }
}

function extractSceneParts(sceneScript) {
  const visualMatch = sceneScript.match(
    /SCENE_VISUAL:\n([\s\S]*?)(?:\n\nDIALOGUE:|\n\nSCENE_END_HOOK:|\n\nSCENE_SUMMARY:|$)/
  );
  const dialogueMatch = sceneScript.match(
    /DIALOGUE:\n([\s\S]*?)(?:\n\nSCENE_END_HOOK:|\n\nSCENE_SUMMARY:|$)/
  );
  const endHookMatch = sceneScript.match(/SCENE_END_HOOK:\n([\s\S]*?)(?:\n\nSCENE_SUMMARY:|$)/);
  const summaryMatch = sceneScript.match(/SCENE_SUMMARY:\n([\s\S]*)$/);

  return {
    visual: visualMatch ? visualMatch[1].trim() : sceneScript.substring(0, 500),
    dialogue: dialogueMatch ? dialogueMatch[1].trim() : "",
    endHook: endHookMatch ? endHookMatch[1].trim() : "",
    summary: summaryMatch ? summaryMatch[1].trim() : "Scene continues the story.",
    fullScript: sceneScript
  };
}

/* =======================
   SCENE → VIDEO PROMPT
======================= */

function buildVideoPrompt(sceneParts, characters, previousSceneEnd = null, baseStoryPrompt = null) {
  const { visual, dialogue } = sceneParts;

  // Build character-specific prompt section
  const characterPrompts = characters.map((c) => {
    let charPrompt = `${c.name}: `;
    if (c.base_prompt) charPrompt += `${c.base_prompt}. `;
    if (c.personality) charPrompt += `Personality: ${c.personality}. `;
    if (c.visual_details) charPrompt += `Visual: ${c.visual_details}. `;
    charPrompt += `MUST maintain exact same appearance.`;
    return charPrompt;
  }).join("\n");

  let prompt = `
CINEMATIC SCENE DIRECTIONS:
${visual}

${dialogue ? `DIALOGUE SCENE:\n${dialogue}` : ""}

${baseStoryPrompt ? `STORY CONTEXT: ${baseStoryPrompt}` : ""}

${previousSceneEnd ? `CONTINUE FROM PREVIOUS SCENE: ${previousSceneEnd}` : "Opening scene of the film."}

${GLOBAL_STYLE}

CHARACTER CONSISTENCY REQUIREMENTS:
${characterPrompts}

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
- consistent character appearance (CRITICAL)
- temporal stability between frames
- characters must look identical to previous scenes
`;

  const MAX_PROMPT_LENGTH = 4000;
  if (prompt.length > MAX_PROMPT_LENGTH) prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
  return prompt.trim();
}

/* =======================
   VIDEO GENERATION WITH FALLBACK
======================= */

// Helper function to wait for a specified time
function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Helper function to extract retry time from error message
function extractRetryTime(errorMessage) {
  const retryMatch = errorMessage.match(/retry_after["\s:]*(\d+)/i) || 
                     errorMessage.match(/wait\s+(\d+)\s+seconds/i) ||
                     errorMessage.match(/retry\s+after\s+(\d+)/i);
  return retryMatch ? parseInt(retryMatch[1]) : 10; // Default to 10 seconds
}

async function generateSceneVideo({ replicate }, prompt, duration = 8, modelChain = null, abortSignal = null, retryCount = 0) {
  const models = (modelChain || [
    "google/veo-3.1-fast",
    "luma/dream-machine",
    "stability-ai/svd",
    "anotherjesse/zeroscope-v2-xl"
  ]).filter((m) => VIDEO_MODELS[m]?.enabled);

  if (models.length === 0) throw new Error("No enabled video models available");

  console.log(`🎥 Attempting video generation with ${models.length} model(s): ${models.join(', ')}`);

  // Check abort before starting
  if (abortSignal?.aborted) {
    throw new Error("Generation aborted by user");
  }

  const budgetManager = getBudgetManager();
  const errors = [];
  const MAX_RETRIES = 3; // Maximum retries for rate limit errors

  for (const modelName of models) {
    // Check abort before each model attempt
    if (abortSignal?.aborted) {
      throw new Error("Generation aborted by user");
    }

    if (!circuitBreaker.canExecute(modelName)) {
      errors.push({ model: modelName, error: "Circuit breaker open" });
      continue;
    }

    // Check rate limits
    const rateLimitCheck = budgetManager.checkRateLimit("replicate", modelName);
    if (!rateLimitCheck.allowed) {
      console.log(`⚠️  Model ${modelName}: Rate limit - ${rateLimitCheck.reason} (retry after ${rateLimitCheck.retryAfter}s)`);
      errors.push({ 
        model: modelName, 
        error: `Rate limit: ${rateLimitCheck.reason}. Retry after ${rateLimitCheck.retryAfter}s` 
      });
      continue;
    }

    // Check budget before generating
    const model = VIDEO_MODELS[modelName];
    
    // Clamp duration to model's allowed values if specified
    let actualDuration = Math.min(
      Math.max(duration, VIDEO_CONSTRAINTS.MIN_DURATION),
      model.maxDuration
    );
    
    // If model has specific allowed durations, use the closest valid one
    if (model.allowedDurations) {
      actualDuration = model.allowedDurations.reduce((prev, curr) => 
        Math.abs(curr - actualDuration) < Math.abs(prev - actualDuration) ? curr : prev
      );
      if (actualDuration !== duration) {
        console.log(`📏 [${modelName}] Duration adjusted from ${duration}s to ${actualDuration}s (model requirement: ${model.allowedDurations.join(', ')}s)`);
      }
    }
    
    const estimatedCost = model.costPerSecond * actualDuration;
    const budgetStatus = budgetManager.getBudgetStatus();
    if (budgetStatus.remaining < estimatedCost) {
      errors.push({ 
        model: modelName, 
        error: `Budget insufficient. Remaining: $${budgetStatus.remaining.toFixed(4)}, Needed: $${estimatedCost.toFixed(4)}` 
      });
      continue;
    }

    try {
      console.log(`🎬 Rendering with ${modelName}...`);
      console.log(`   Duration: ${actualDuration}s`);
      console.log(`   Estimated Cost: $${estimatedCost.toFixed(4)}`);
      console.log(`   Prompt length: ${prompt.length} characters`);
      
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

      console.log(`⏳ Calling Replicate API for ${modelName}...`);
      const apiCall = replicate.run(modelName, { input });
      const output = await Promise.race([apiCall, timeoutPromise]);
      console.log(`✅ Received response from ${modelName}`);

      let videoUrl;
      if (Array.isArray(output)) videoUrl = output[0];
      else if (output && typeof output === "object") videoUrl = output.video || output.url || output.output;
      else if (typeof output === "string") videoUrl = output;

      if (!videoUrl || typeof videoUrl !== "string") {
        throw new Error(`Invalid video URL from ${modelName}`);
      }

      console.log(`✅ Video rendered successfully with ${modelName}!`);
      console.log(`   Video URL: ${videoUrl}`);

      // Track Replicate cost
      budgetManager.trackReplicateCost(actualDuration, modelName);

      circuitBreaker.recordSuccess(modelName);
      return { videoUrl, model: modelName, duration: actualDuration, promptLength: prompt.length };
    } catch (error) {
      if (error.message?.includes("Budget exceeded")) {
        throw error;
      }
      
      // Handle specific API errors with helpful messages
      let errorMessage = error.message;
      if (error.message?.includes("402") || error.message?.includes("Payment Required") || error.message?.includes("insufficient credit")) {
        errorMessage = "Replicate account has insufficient credit. Please add credits at https://replicate.com/account/billing";
        console.error(`💳 ${errorMessage}`);
      } else if (error.message?.includes("429") || error.message?.includes("Too Many Requests")) {
        const retryAfter = extractRetryTime(error.message);
        errorMessage = `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying. Low credit accounts have reduced rate limits.`;
        console.error(`⏱️  ${errorMessage}`);
        
        // Auto-retry for rate limit errors if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Auto-retrying in ${retryAfter} seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await wait(retryAfter + 1); // Wait retry time + 1 second buffer
          
          // Check abort during wait
          if (abortSignal?.aborted) {
            throw new Error("Generation aborted by user");
          }
          
          // Retry the same model
          try {
            console.log(`🔄 Retrying ${modelName} after rate limit wait...`);
            return await generateSceneVideo({ replicate }, prompt, duration, [modelName], abortSignal, retryCount + 1);
          } catch (retryError) {
            // If retry also fails, continue to next model
            errorMessage = retryError.message;
          }
        }
      } else {
        console.error(`❌ Model ${modelName} failed: ${error.message}`);
      }
      
      const failureCount = circuitBreaker.recordFailure(modelName);
      if (models.length > 1 && failureCount < 2) {
        console.log(`🔄 Trying next model in chain...`);
      }
      errors.push({ model: modelName, error: errorMessage, failureCount });
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
  if (videoUrl && videoUrl.includes("supabase.co")) {
    console.log(`💾 Video already in Supabase storage: ${videoUrl}`);
    return videoUrl;
  }
  if (!videoUrl) throw new Error("No video URL provided");

  console.log(`📥 Downloading video from: ${videoUrl}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VIDEO_CONSTRAINTS.UPLOAD_TIMEOUT_MS);
  const res = await fetch(videoUrl, { signal: controller.signal });
  clearTimeout(timeoutId);

  if (!res.ok) throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);

  console.log(`⬇️  Video downloaded, size: ${(res.headers.get('content-length') || 0) / 1024 / 1024} MB`);
  const buffer = await res.arrayBuffer();
  const videoId = uuidv4();
  const path = `videos/${videoId}.mp4`;

  console.log(`☁️  Uploading video to Supabase storage: ${path}`);
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(path, Buffer.from(buffer), {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "3600"
    });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
  console.log(`✅ Video saved to Supabase storage: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

/* =======================
   PARALLEL PROCESSING
======================= */

async function processScenesInParallel(sceneFns, maxParallel = VIDEO_CONSTRAINTS.MAX_PARALLEL_SCENES, abortSignal = null) {
  const results = [];
  const running = new Set();

  for (let i = 0; i < sceneFns.length; i++) {
    // Check for abort before starting new scene
    if (abortSignal?.aborted) {
      // Cancel remaining scenes
      for (let j = i; j < sceneFns.length; j++) {
        results[j] = { scene: j + 1, error: "Generation aborted", success: false, aborted: true };
      }
      break;
    }

    while (running.size >= maxParallel) {
      // Check abort during wait
      if (abortSignal?.aborted) {
        break;
      }
      await Promise.race(running);
    }

    if (abortSignal?.aborted) {
      break;
    }

    const sceneIndex = i;
    const promise = sceneFns[i]()
      .then((result) => {
        running.delete(promise);
        if (!abortSignal?.aborted) {
          results[sceneIndex] = result;
        }
        return result;
      })
      .catch((error) => {
        running.delete(promise);
        if (!abortSignal?.aborted) {
          results[sceneIndex] = { scene: sceneIndex + 1, error: error.message, success: false };
        }
        return null;
      });

    running.add(promise);
  }

  // Wait for running scenes to complete or abort
  if (!abortSignal?.aborted) {
    await Promise.allSettled(running);
  }
  return results.filter((r) => r !== undefined);
}

/* =======================
   DATABASE OPERATIONS
======================= */

async function saveMovieRecord({ supabase }, movieData, userId = null) {
  const { totalScenes, duration, scenes, baseStoryPrompt, characterIds, totalTime, cost, wasAborted } = movieData;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`💾 Saving movie record to database...`);
    console.log(`${'='.repeat(60)}`);
    
    const successfulScenes = scenes.filter((s) => s.video && s.success !== false);
    console.log(`📊 Scenes: ${successfulScenes.length}/${totalScenes} successful`);
    console.log(`👤 User: ${userId || 'Anonymous'}`);
    console.log(`📝 Title: "${baseStoryPrompt.substring(0, 50)}..."`);

    // Calculate total cost from scenes if not provided
    const totalCost = cost || successfulScenes.reduce((sum, s) => {
      const model = VIDEO_MODELS[s.model];
      return sum + (model?.costPerSecond || 0) * (s.duration || 6);
    }, 0);
    console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);

    console.log(`🗄️  Inserting record into 'movies' table...`);
    const { data, error } = await supabase
      .from("movies")
      .insert({
        user_id: userId || null, // Explicitly set to null if not provided
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
        status: wasAborted ? "aborted" : (successfulScenes.length > 0 ? "completed" : "failed"),
        metadata: {
          generated_at: new Date().toISOString(),
          models_used: [...new Set(successfulScenes.map((s) => s.model))],
          success_rate: totalScenes > 0 ? (successfulScenes.length / totalScenes) * 100 : 0,
          total_time: totalTime || 0,
          cost: totalCost,
          contentType: movieData.projectName || "custom",
          aborted: wasAborted || false,
          completed_scenes: successfulScenes.length,
          total_scenes_requested: totalScenes
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error saving movie record:`, error);
      console.error(`   Details: ${error.message}`);
      return null;
    }
    
    console.log(`✅ Movie record saved successfully!`);
    console.log(`🆔 Database ID: ${data.id}`);
    console.log(`📊 Status: ${data.status}`);
    console.log(`🎬 Ready to view in gallery at: /video/${data.id}`);
    console.log(`${'='.repeat(60)}\n`);
    
    return data;
  } catch (err) {
    console.error(`❌ Exception saving movie record:`, err);
    console.error(`   Error: ${err.message}`);
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
  projectName = null,
  styleReference = null,
  abortSignal = null,
  jobId = null
}) {
  const config = createConfig();
  const clients = createClients(config);
  const budgetManager = getBudgetManager();

  if (!baseStoryPrompt || baseStoryPrompt.trim().length < 10) {
    throw new Error("Story prompt must be at least 10 characters");
  }
  if (!characterIds || characterIds.length === 0) {
    throw new Error("At least one character ID is required");
  }
  if (totalDurationSeconds > VIDEO_CONSTRAINTS.MAX_TOTAL_DURATION) {
    throw new Error(`Maximum duration is ${VIDEO_CONSTRAINTS.MAX_TOTAL_DURATION / 60} minutes`);
  }

  // Calculate scene duration - ensure it's valid for the selected model
  let calculatedSceneDuration = sceneDuration;
  const selectedModelName = modelChain?.[0] || "google/veo-3.1-fast";
  const selectedModel = VIDEO_MODELS[selectedModelName];
  
  // Special case: 30 seconds - use valid durations
  if (totalDurationSeconds === 30) {
    // For Google Veo (4, 6, 8 only), use 6 seconds = 5 scenes × 6s = 30s (exact match)
    // Or use 8 seconds = 3 scenes × 8s = 24s (close)
    if (selectedModel?.allowedDurations) {
      // Use 6 seconds to get exactly 30 seconds (5 scenes)
      calculatedSceneDuration = 6;
    } else {
      calculatedSceneDuration = 10; // For other models
    }
  }
  
  // Clamp scene duration to model's allowed values
  if (selectedModel?.allowedDurations) {
    const allowed = selectedModel.allowedDurations;
    // Find the closest allowed duration
    calculatedSceneDuration = allowed.reduce((prev, curr) => 
      Math.abs(curr - calculatedSceneDuration) < Math.abs(prev - calculatedSceneDuration) ? curr : prev
    );
    console.log(`📏 Adjusted scene duration to ${calculatedSceneDuration}s (model requirement: ${allowed.join(', ')}s)`);
  }

  // Validate budget before starting
  const modelName = selectedModelName;
  const estimatedCost = budgetManager.calculateEstimatedCost(
    totalDurationSeconds,
    calculatedSceneDuration,
    modelName,
    config.ai.openaiModel
  );

  if (!budgetManager.isWithinBudget(estimatedCost)) {
    throw new Error(
      `Estimated cost ($${estimatedCost.total.toFixed(4)}) exceeds maximum budget ($${MAX_BUDGET}). ` +
      `Please reduce duration or use a cheaper model.`
    );
  }

  const budgetStatus = budgetManager.getBudgetStatus();
  if (budgetStatus.remaining < estimatedCost.total) {
    throw new Error(
      `Insufficient budget remaining. Remaining: $${budgetStatus.remaining.toFixed(4)}, ` +
      `Estimated: $${estimatedCost.total.toFixed(4)}`
    );
  }

  // Calculate total scenes using the calculated scene duration
  let totalScenes = Math.max(1, Math.ceil(totalDurationSeconds / calculatedSceneDuration));
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 STARTING VIDEO GENERATION`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📝 Story: "${baseStoryPrompt.substring(0, 80)}${baseStoryPrompt.length > 80 ? '...' : ''}"`);
  console.log(`⏱️  Total Duration: ${totalDurationSeconds}s`);
  console.log(`🎞️  Scene Duration: ${calculatedSceneDuration}s`);
  console.log(`📊 Total Scenes: ${totalScenes}`);
  console.log(`👥 Characters: ${characterIds.length}`);
  console.log(`💰 Estimated Cost: $${estimatedCost.total.toFixed(4)}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const progress = new ProgressTracker(totalScenes, onProgress);
  console.log(`👥 Fetching character data from database...`);
  const characters = await getCharacters(clients.supabase, characterIds);
  console.log(`✅ Loaded ${characters.length} characters: ${characters.map(c => c.name).join(', ')}`);

  let storySoFar = "";
  let previousSceneEnd = null;
  const scenes = [];
  const startTime = Date.now();

  const sceneFns = [];

  for (let i = 1; i <= totalScenes; i++) {
    sceneFns.push(async () => {
      // Check for abort signal before starting scene
      if (abortSignal?.aborted) {
        throw new Error("Generation aborted by user");
      }

      const sceneStartTime = Date.now();
      let sceneData = { scene: i, success: false, startTime: sceneStartTime };

      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎬 [SCENE ${i}/${totalScenes}] Starting scene generation...`);
        console.log(`${'='.repeat(60)}`);
        
        progress.notify(i, "scripting");

        // Check abort before OpenAI call
        if (abortSignal?.aborted) {
          throw new Error("Generation aborted by user");
        }

        console.log(`📝 [SCENE ${i}] Generating script from prompt...`);
        const sceneScript = await generateSceneScript({
          openai: clients.openai,
          openaiModel: config.ai.openaiModel,
          storySoFar,
          sceneNumber: i,
          totalScenes,
          characters,
          baseStoryPrompt,
          previousSceneEnd,
          styleReference
        });

        const sceneParts = extractSceneParts(sceneScript);
        sceneData.script = sceneScript;
        console.log(`✅ [SCENE ${i}] Script generated successfully!`);

        const videoPrompt = buildVideoPrompt(sceneParts, characters, previousSceneEnd, baseStoryPrompt);
        sceneData.promptPreview = `${videoPrompt.substring(0, 200)}...`;
        console.log(`🎥 [SCENE ${i}] Video prompt built (${videoPrompt.length} chars)`);
        console.log(`📋 [SCENE ${i}] Prompt preview: "${videoPrompt.substring(0, 200)}..."`);

        // Check abort before video generation
        if (abortSignal?.aborted) {
          throw new Error("Generation aborted by user");
        }

        console.log(`🎬 [SCENE ${i}] Starting video rendering/generation...`);
        progress.notify(i, "generating", { promptLength: videoPrompt.length });
        const videoResult = await generateSceneVideo(clients, videoPrompt, calculatedSceneDuration, modelChain, abortSignal);
        console.log(`✅ [SCENE ${i}] Video generated! Model: ${videoResult.model}, Duration: ${videoResult.duration}s`);
        console.log(`🔗 [SCENE ${i}] Video URL: ${videoResult.videoUrl}`);

        console.log(`💾 [SCENE ${i}] Saving video to Supabase storage...`);
        progress.notify(i, "saving");
        const savedUrl = await saveVideo(clients, videoResult.videoUrl);
        console.log(`✅ [SCENE ${i}] Video saved! URL: ${savedUrl}`);

        storySoFar += `\nScene ${i}: ${sceneParts.summary}`;
        previousSceneEnd = sceneParts.endHook || sceneParts.summary;

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
        const sceneTime = Date.now() - sceneStartTime;
        console.log(`✅ [SCENE ${i}] COMPLETED in ${(sceneTime / 1000).toFixed(1)}s`);
        console.log(`📊 Progress: ${scenes.filter(s => s.success).length}/${totalScenes} scenes done\n`);
        progress.notify(i, "completed", { model: videoResult.model, sceneTime });
        return sceneData;
      } catch (error) {
        // Check if aborted
        if (error.message?.includes("aborted") || abortSignal?.aborted) {
          sceneData = { ...sceneData, success: false, error: "Generation aborted", aborted: true, endTime: Date.now(), totalTime: Date.now() - sceneStartTime };
          scenes.push(sceneData);
          progress.notify(i, "aborted", { error: "Generation aborted by user" });
          throw new Error("Generation aborted by user");
        }
        progress.addFailure(i, error);
        sceneData = { ...sceneData, success: false, error: error.message, endTime: Date.now(), totalTime: Date.now() - sceneStartTime };
        scenes.push(sceneData);
        progress.notify(i, "failed", { error: error.message });
        return sceneData;
      }
    });
  }

  // For free accounts with rate limits, generate sequentially with delays
  // This respects the 6 requests/minute limit for low-credit accounts
  const FREE_ACCOUNT_DELAY = 12; // 12 seconds between scenes = 5 requests/minute (safe margin)
  
  if (enableParallel && totalScenes > 1) {
    // Check if we should use sequential mode for free accounts
    // Use sequential if we have many scenes to respect rate limits
    const useSequential = totalScenes > 2; // More than 2 scenes = use sequential to avoid rate limits
    
    if (useSequential) {
      console.log(`⏱️  Using sequential generation with ${FREE_ACCOUNT_DELAY}s delays to respect rate limits`);
      for (let i = 0; i < sceneFns.length; i++) {
        if (abortSignal?.aborted) {
          break;
        }
        await sceneFns[i]();
        
        // Add delay between scenes (except after the last one)
        if (i < sceneFns.length - 1 && !abortSignal?.aborted) {
          console.log(`⏳ Waiting ${FREE_ACCOUNT_DELAY}s before next scene (respecting rate limits)...`);
          await wait(FREE_ACCOUNT_DELAY);
        }
      }
    } else {
      // Use parallel for 2 or fewer scenes
      await processScenesInParallel(sceneFns, VIDEO_CONSTRAINTS.MAX_PARALLEL_SCENES, abortSignal);
    }
  } else {
    // Sequential mode with delays
    for (let i = 0; i < sceneFns.length; i++) {
      if (abortSignal?.aborted) {
        break;
      }
      await sceneFns[i]();
      
      // Add delay between scenes (except after the last one)
      if (i < sceneFns.length - 1 && !abortSignal?.aborted) {
        console.log(`⏳ Waiting ${FREE_ACCOUNT_DELAY}s before next scene (respecting rate limits)...`);
        await wait(FREE_ACCOUNT_DELAY);
      }
    }
  }

  // Check if aborted
  const wasAborted = abortSignal?.aborted || false;

  const successfulScenes = scenes.filter((s) => s.success && s.video);
  const totalTime = Date.now() - startTime;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 VIDEO GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successful Scenes: ${successfulScenes.length}/${totalScenes}`);
  console.log(`⏱️  Total Time: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
  console.log(`💰 Total Cost: $${budgetManager.getBudgetStatus().current.toFixed(4)}`);
  console.log(`${wasAborted ? '⚠️  Generation was aborted' : '✅ Generation completed successfully'}`);
  
  if (successfulScenes.length === 0) {
    console.log(`\n⚠️  WARNING: No videos were generated!`);
    console.log(`   This usually happens due to:`);
    console.log(`   - Rate limits (wait a few minutes and try again)`);
    console.log(`   - Insufficient Replicate credits (add credits at https://replicate.com/account/billing)`);
    console.log(`   - API errors (check console for specific error messages)`);
    console.log(`   - Model failures (system will try fallback models)`);
    console.log(`\n   💡 Tip: Low credit accounts have reduced rate limits (6 requests/minute)`);
    console.log(`   💡 Add more credits to get higher rate limits and faster generation\n`);
  }
  
  console.log(`${'='.repeat(60)}\n`);

  // Calculate total cost
  const finalBudgetStatus = budgetManager.getBudgetStatus();
  const totalCost = finalBudgetStatus.current;

  let dbRecord = null;
  // Save even if aborted (partial progress)
  if (successfulScenes.length > 0 || wasAborted) {
    console.log(`💾 Saving to database...`);
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
        projectName,
        cost: totalCost,
        wasAborted
      },
      userId
    );
    
    if (dbRecord) {
      console.log(`\n🎉 SUCCESS! Video is ready to view!`);
      console.log(`📺 Gallery: /gallery`);
      console.log(`🎬 Video Page: /video/${dbRecord.id}`);
      console.log(`\n`);
    } else {
      console.log(`⚠️  Warning: Video generated but not saved to database`);
    }
  } else {
    console.log(`❌ No successful scenes to save`);
  }

  const summary = progress.getSummary();

  // Always return a valid UUID - use dbRecord.id or generate one
  const finalMovieId = dbRecord?.id || uuidv4();

  return {
    movieId: finalMovieId,
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

