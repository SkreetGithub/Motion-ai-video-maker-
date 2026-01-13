/**
 * Budget Manager - Tracks costs and enforces $5 budget limit
 * Rate limiting for OpenAI and Replicate API calls
 */

import { createClient } from "@supabase/supabase-js";

const MAX_BUDGET = 5.0; // $5 maximum budget
const OPENAI_COST_PER_1K_TOKENS = {
  "gpt-4o-mini": 0.00015, // $0.15 per 1M tokens input, $0.60 per 1M tokens output
  "gpt-4o": 0.0025, // $2.50 per 1M tokens input, $10 per 1M tokens output
  "gpt-4": 0.03, // $30 per 1M tokens input, $60 per 1M tokens output
};

// Rate limiting configuration
const RATE_LIMITS = {
  openai: {
    requestsPerMinute: 60,
    requestsPerHour: 5000,
  },
  replicate: {
    requestsPerMinute: 10,
    requestsPerHour: 500,
  },
};

class BudgetManager {
  constructor() {
    this.currentCost = 0;
    this.rateLimiters = {
      openai: new Map(),
      replicate: new Map(),
    };
  }

  /**
   * Calculate estimated cost for a video generation request
   */
  calculateEstimatedCost(totalDurationSeconds, sceneDuration, modelName, openaiModel = "gpt-4o-mini") {
    const totalScenes = Math.ceil(totalDurationSeconds / sceneDuration);
    const model = this.getModelCost(modelName);
    
    // Video generation cost
    const videoCost = totalScenes * sceneDuration * model.costPerSecond;
    
    // OpenAI script generation cost (estimate ~500 tokens per scene)
    const estimatedTokensPerScene = 500;
    const totalTokens = totalScenes * estimatedTokensPerScene;
    const openaiCost = (totalTokens / 1000) * OPENAI_COST_PER_1K_TOKENS[openaiModel] || 0.00015;
    
    return {
      video: videoCost,
      openai: openaiCost,
      total: videoCost + openaiCost,
      scenes: totalScenes,
    };
  }

  /**
   * Get model cost information
   */
  getModelCost(modelName) {
    const models = {
      "google/veo-3.1-fast": { costPerSecond: 0.015 },
      "luma/dream-machine": { costPerSecond: 0.01 },
      "stability-ai/svd": { costPerSecond: 0.008 },
      "anotherjesse/zeroscope-v2-xl": { costPerSecond: 0.007 },
    };
    return models[modelName] || models["anotherjesse/zeroscope-v2-xl"];
  }

  /**
   * Check if request is within budget
   */
  isWithinBudget(estimatedCost) {
    return estimatedCost.total <= MAX_BUDGET;
  }

  /**
   * Check rate limits
   */
  checkRateLimit(service, identifier = "default") {
    const now = Date.now();
    const limiter = this.rateLimiters[service];
    
    if (!limiter.has(identifier)) {
      limiter.set(identifier, {
        requests: [],
        lastReset: now,
      });
    }

    const record = limiter.get(identifier);
    const limits = RATE_LIMITS[service];

    // Clean old requests (older than 1 hour)
    record.requests = record.requests.filter(
      (time) => now - time < 60 * 60 * 1000
    );

    // Check per-minute limit
    const recentRequests = record.requests.filter(
      (time) => now - time < 60 * 1000
    );
    if (recentRequests.length >= limits.requestsPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${limits.requestsPerMinute} requests per minute`,
        retryAfter: 60 - Math.floor((now - recentRequests[0]) / 1000),
      };
    }

    // Check per-hour limit
    if (record.requests.length >= limits.requestsPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${limits.requestsPerHour} requests per hour`,
        retryAfter: 3600 - Math.floor((now - record.requests[0]) / 1000),
      };
    }

    // Record this request
    record.requests.push(now);

    return { allowed: true };
  }

  /**
   * Track actual cost
   */
  trackCost(service, cost) {
    this.currentCost += cost;
    
    if (this.currentCost > MAX_BUDGET) {
      throw new Error(
        `Budget exceeded! Current cost: $${this.currentCost.toFixed(4)}, Max: $${MAX_BUDGET}`
      );
    }

    return this.currentCost;
  }

  /**
   * Track OpenAI API call cost
   */
  trackOpenAICost(tokens, model = "gpt-4o-mini") {
    const cost = (tokens / 1000) * OPENAI_COST_PER_1K_TOKENS[model] || 0.00015;
    return this.trackCost("openai", cost);
  }

  /**
   * Track Replicate video generation cost
   */
  trackReplicateCost(duration, modelName) {
    const model = this.getModelCost(modelName);
    const cost = duration * model.costPerSecond;
    return this.trackCost("replicate", cost);
  }

  /**
   * Get current budget status
   */
  getBudgetStatus() {
    return {
      current: this.currentCost,
      max: MAX_BUDGET,
      remaining: MAX_BUDGET - this.currentCost,
      percentage: (this.currentCost / MAX_BUDGET) * 100,
    };
  }

  /**
   * Reset budget (for testing or new period)
   */
  reset() {
    this.currentCost = 0;
    this.rateLimiters = {
      openai: new Map(),
      replicate: new Map(),
    };
  }
}

// Singleton instance
let budgetManagerInstance = null;

export function getBudgetManager() {
  if (!budgetManagerInstance) {
    budgetManagerInstance = new BudgetManager();
  }
  return budgetManagerInstance;
}

// Export constants
export const MAX_BUDGET_EXPORT = MAX_BUDGET;
export { RATE_LIMITS, OPENAI_COST_PER_1K_TOKENS };

