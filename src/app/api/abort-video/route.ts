import { NextRequest, NextResponse } from "next/server";
import { getJobsManager } from "@/lib/generationJobs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const jobsManager = getJobsManager();
    const aborted = jobsManager.abortJob(jobId);

    if (aborted) {
      return NextResponse.json({
        success: true,
        message: "Generation aborted successfully",
        jobId,
      });
    } else {
      return NextResponse.json(
        {
          error: "Job not found or already completed",
          jobId,
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("Error aborting video:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to abort video",
      },
      { status: 500 }
    );
  }
}

