import { NextRequest, NextResponse } from "next/server";
import { createMovie } from "@/lib/videoEngine";
import { getBudgetManager, MAX_BUDGET_EXPORT as MAX_BUDGET } from "@/lib/budgetManager";
import { getJobsManager } from "@/lib/generationJobs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userName,
      baseStoryPrompt,
      characterIds,
      totalDurationSeconds,
      sceneDuration,
      modelChain,
      projectName,
    } = body;

    // Validate required fields
    if (!userName || userName.trim().length < 2) {
      return NextResponse.json(
        { error: "User name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!baseStoryPrompt || baseStoryPrompt.trim().length < 10) {
      return NextResponse.json(
        { error: "Story prompt must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (!characterIds || characterIds.length === 0) {
      return NextResponse.json(
        { error: "At least one character ID is required" },
        { status: 400 }
      );
    }

    // Check budget and rate limits before starting
    const budgetManager = getBudgetManager();
    const modelName = modelChain?.[0] || "google/veo-3.1-fast";
    const estimatedCost = budgetManager.calculateEstimatedCost(
      totalDurationSeconds || 120,
      sceneDuration || 6,
      modelName
    );

    // Validate budget
    if (!budgetManager.isWithinBudget(estimatedCost)) {
      return NextResponse.json(
        {
          error: `Estimated cost ($${estimatedCost.total.toFixed(4)}) exceeds maximum budget ($${MAX_BUDGET})`,
          estimatedCost,
          maxBudget: MAX_BUDGET,
        },
        { status: 400 }
      );
    }

    const budgetStatus = budgetManager.getBudgetStatus();
    if (budgetStatus.remaining < estimatedCost.total) {
      return NextResponse.json(
        {
          error: `Insufficient budget remaining. Remaining: $${budgetStatus.remaining.toFixed(4)}, Estimated: $${estimatedCost.total.toFixed(4)}`,
          budgetStatus,
          estimatedCost,
        },
        { status: 400 }
      );
    }

    // Check rate limits
    const openaiRateLimit = budgetManager.checkRateLimit("openai", "api");
    if (!openaiRateLimit.allowed) {
      return NextResponse.json(
        {
          error: `OpenAI rate limit: ${openaiRateLimit.reason}`,
          retryAfter: openaiRateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    const replicateRateLimit = budgetManager.checkRateLimit("replicate", "api");
    if (!replicateRateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Replicate rate limit: ${replicateRateLimit.reason}`,
          retryAfter: replicateRateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Progress callback
    const progressUpdates: any[] = [];
    const onProgress = (progress: any) => {
      progressUpdates.push(progress);
    };

    // Scene completion callback
    const completedScenes: any[] = [];
    const onSceneComplete = (scene: any) => {
      completedScenes.push(scene);
    };

    // Create job for abort functionality
    const jobsManager = getJobsManager();
    const jobId = uuidv4();
    const abortController = jobsManager.createJob(jobId);

    // Create the movie
    let result;
    try {
      result = await createMovie({
        baseStoryPrompt,
        characterIds,
        totalDurationSeconds: totalDurationSeconds || 120,
        sceneDuration: sceneDuration || 6,
        userId: userName.trim(), // Use user name as user_id
        onProgress,
        onSceneComplete,
        enableParallel: true,
        modelChain: modelChain || null,
        projectName: projectName || null,
        abortSignal: abortController.signal,
        jobId,
      });
      jobsManager.completeJob(jobId);
    } catch (error: any) {
      if (error.message?.includes("aborted") || error.message?.includes("Abort")) {
        jobsManager.completeJob(jobId);
        // Get final budget status even if aborted
        const finalBudgetStatus = budgetManager.getBudgetStatus();
        return NextResponse.json({
          success: false,
          aborted: true,
          message: "Generation aborted by user. Partial progress saved.",
          movie: result || null,
          progress: progressUpdates,
          budget: {
            estimated: estimatedCost,
            final: finalBudgetStatus,
          },
          jobId,
        });
      }
      jobsManager.completeJob(jobId);
      throw error;
    }

    // Get final budget status
    const finalBudgetStatus = budgetManager.getBudgetStatus();

    return NextResponse.json({
      success: true,
      movie: result,
      progress: progressUpdates,
      budget: {
        estimated: estimatedCost,
        final: finalBudgetStatus,
      },
      jobId, // Return jobId so client can abort if needed
    });
  } catch (error: any) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create video",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

