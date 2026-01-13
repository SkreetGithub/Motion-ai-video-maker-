/**
 * Generation Jobs Manager - Tracks active video generation jobs
 * Allows aborting ongoing generations to prevent unnecessary spending
 */

class GenerationJobsManager {
  constructor() {
    this.jobs = new Map(); // jobId -> { abortController, startTime, movieId }
  }

  /**
   * Create a new generation job
   */
  createJob(jobId, movieId = null) {
    const abortController = new AbortController();
    this.jobs.set(jobId, {
      abortController,
      startTime: Date.now(),
      movieId,
      status: "running",
    });
    return abortController;
  }

  /**
   * Get abort signal for a job
   */
  getAbortSignal(jobId) {
    const job = this.jobs.get(jobId);
    return job?.abortController?.signal || null;
  }

  /**
   * Abort a generation job
   */
  abortJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.status === "running") {
      job.abortController.abort();
      job.status = "aborted";
      job.abortedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Complete a job
   */
  completeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "completed";
      job.completedAt = Date.now();
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return {
      status: job.status,
      startTime: job.startTime,
      movieId: job.movieId,
      elapsed: Date.now() - job.startTime,
    };
  }

  /**
   * Remove old completed jobs (cleanup)
   */
  cleanup(olderThanMs = 60 * 60 * 1000) { // 1 hour
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status !== "running" && (now - (job.completedAt || job.abortedAt || job.startTime)) > olderThanMs) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// Singleton instance
let jobsManagerInstance = null;

export function getJobsManager() {
  if (!jobsManagerInstance) {
    jobsManagerInstance = new GenerationJobsManager();
    // Cleanup old jobs every 10 minutes
    setInterval(() => jobsManagerInstance.cleanup(), 10 * 60 * 1000);
  }
  return jobsManagerInstance;
}

