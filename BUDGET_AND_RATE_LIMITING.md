# Budget and Rate Limiting System

## Overview

The Motion AI Video Engine includes comprehensive budget tracking and rate limiting to ensure costs stay under **$5** and prevent API abuse.

## Budget Management

### Maximum Budget: $5.00

The system enforces a hard limit of **$5.00** per session. This includes:
- **OpenAI costs** - Script generation (GPT-4o-mini: ~$0.00015 per 1K tokens)
- **Replicate costs** - Video generation (varies by model: $0.007-$0.015 per second)

### Cost Calculation

**OpenAI Costs:**
- GPT-4o-mini: $0.00015 per 1K tokens
- Estimated ~500 tokens per scene
- Example: 20 scenes = 10K tokens = ~$0.0015

**Replicate Costs (per second):**
- Google Veo 3.1 Fast: $0.015/sec
- Luma Dream Machine: $0.01/sec
- Stable Video Diffusion: $0.008/sec
- Zeroscope v2 XL: $0.007/sec

**Example Calculation:**
- 120 seconds total duration
- 6 seconds per scene = 20 scenes
- Using Zeroscope ($0.007/sec): 20 × 6 × $0.007 = **$0.84**
- OpenAI script: ~$0.0015
- **Total: ~$0.84**

### Budget Validation

Before starting video generation:
1. ✅ Calculates estimated cost
2. ✅ Checks if within $5 budget
3. ✅ Verifies sufficient remaining budget
4. ✅ Blocks request if budget exceeded

During generation:
1. ✅ Tracks actual costs in real-time
2. ✅ Stops generation if budget exceeded
3. ✅ Returns error with cost details

## Rate Limiting

### OpenAI Rate Limits
- **60 requests per minute**
- **5,000 requests per hour**

### Replicate Rate Limits
- **10 requests per minute**
- **500 requests per hour**

### Rate Limit Behavior

When rate limit is exceeded:
- Returns HTTP 429 (Too Many Requests)
- Includes `retryAfter` seconds in response
- Blocks request until limit resets

## API Endpoints

### Check Budget Status
```bash
GET /api/budget
```

Response:
```json
{
  "success": true,
  "budget": {
    "current": 0.84,
    "max": 5.00,
    "remaining": 4.16,
    "percentage": 16.8
  },
  "rateLimits": {
    "openai": {
      "perMinute": 60,
      "perHour": 5000
    },
    "replicate": {
      "perMinute": 10,
      "perHour": 500
    }
  }
}
```

### Create Video (with Budget Check)
```bash
POST /api/create-video
```

The API automatically:
1. Validates budget before starting
2. Checks rate limits
3. Tracks costs during generation
4. Returns budget status in response

## Error Messages

### Budget Exceeded
```json
{
  "error": "Estimated cost ($5.50) exceeds maximum budget ($5.00)",
  "estimatedCost": {
    "video": 5.40,
    "openai": 0.10,
    "total": 5.50
  },
  "maxBudget": 5.00
}
```

### Insufficient Budget
```json
{
  "error": "Insufficient budget remaining. Remaining: $0.50, Estimated: $0.84",
  "budgetStatus": {
    "current": 4.50,
    "remaining": 0.50
  }
}
```

### Rate Limit Exceeded
```json
{
  "error": "OpenAI rate limit: Rate limit exceeded: 60 requests per minute",
  "retryAfter": 45
}
```

## Implementation Details

### Budget Manager (`src/lib/budgetManager.js`)

**Key Functions:**
- `calculateEstimatedCost()` - Calculate cost before generation
- `isWithinBudget()` - Check if cost is within $5 limit
- `checkRateLimit()` - Verify rate limits before API calls
- `trackCost()` - Track actual costs during generation
- `trackOpenAICost()` - Track OpenAI API costs
- `trackReplicateCost()` - Track Replicate video generation costs
- `getBudgetStatus()` - Get current budget status

### Integration Points

1. **API Route** (`src/app/api/create-video/route.ts`)
   - Validates budget before starting
   - Checks rate limits
   - Returns budget status

2. **Video Engine** (`src/lib/videoEngine.js`)
   - Tracks OpenAI costs per script generation
   - Tracks Replicate costs per video scene
   - Stops if budget exceeded

3. **Script Generation** (`generateSceneScript()`)
   - Checks OpenAI rate limits
   - Tracks token usage and costs

4. **Video Generation** (`generateSceneVideo()`)
   - Checks Replicate rate limits
   - Validates budget before each scene
   - Tracks costs per scene

## Best Practices

1. **Check Budget Before Large Requests**
   ```javascript
   const budgetStatus = await fetch('/api/budget');
   if (budgetStatus.remaining < estimatedCost) {
     // Reduce duration or use cheaper model
   }
   ```

2. **Handle Rate Limit Errors**
   ```javascript
   if (error.status === 429) {
     const retryAfter = error.retryAfter;
     // Wait and retry
   }
   ```

3. **Monitor Costs**
   - Check budget status regularly
   - Use cheaper models for longer videos
   - Reduce scene duration to lower costs

## Cost Optimization Tips

1. **Use Cheaper Models**
   - Zeroscope ($0.007/sec) for budget-friendly generation
   - Stable Video Diffusion ($0.008/sec) for good quality

2. **Optimize Scene Duration**
   - Longer scenes = fewer API calls
   - But higher cost per scene
   - Balance: 6-8 seconds per scene is optimal

3. **Reduce Total Duration**
   - Shorter videos = lower costs
   - 30 seconds = ~$0.21 (Zeroscope)
   - 2 minutes = ~$0.84 (Zeroscope)

4. **Use GPT-4o-mini**
   - Cheapest OpenAI model
   - Good quality for script generation
   - ~$0.00015 per 1K tokens

## Testing

To test budget limits:
```javascript
// Force budget exceeded
const budgetManager = getBudgetManager();
budgetManager.trackCost('test', 6.00); // Exceeds $5 limit
```

## Notes

- Budget resets on server restart (in-memory tracking)
- For persistent tracking, integrate with database
- Rate limits are per-service, not global
- Budget tracking is per-request session

## Future Enhancements

- [ ] Persistent budget tracking in database
- [ ] Per-user budget limits
- [ ] Daily/monthly budget caps
- [ ] Budget alerts and notifications
- [ ] Cost analytics dashboard

