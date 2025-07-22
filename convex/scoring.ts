import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Circuit breaker to prevent API abuse during extended outages
class AnthropicCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 300000; // 5 minutes
  private readonly successThreshold = 2; // Success calls needed to fully close circuit

  isOpen(): boolean {
    if (this.failures >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      return timeSinceLastFailure < this.recoveryTimeout;
    }
    return false;
  }

  isHalfOpen(): boolean {
    if (this.failures >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      return timeSinceLastFailure >= this.recoveryTimeout && this.successCount < this.successThreshold;
    }
    return false;
  }

  recordSuccess(): void {
    this.successCount++;
    if (this.successCount >= this.successThreshold) {
      // Fully close the circuit
      this.failures = 0;
      this.successCount = 0;
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0; // Reset success count on any failure
  }

  getStatus(): { state: string; failures: number; successCount: number } {
    return {
      state: this.isOpen() ? 'open' : this.isHalfOpen() ? 'half-open' : 'closed',
      failures: this.failures,
      successCount: this.successCount,
    };
  }
}

// Global circuit breaker instance
const anthropicCircuitBreaker = new AnthropicCircuitBreaker();

// Main internal action to score a lead using Anthropic AI
export const scoreLead = internalAction({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args): Promise<void> => {
    const startTime = Date.now();
    console.log(`🤖 Starting AI scoring for company ${args.companyId}`);
    
    try {
      // Check circuit breaker status
      const circuitStatus = anthropicCircuitBreaker.getStatus();
      console.log(`🔌 Circuit breaker status: ${circuitStatus.state} (failures: ${circuitStatus.failures})`);

      if (anthropicCircuitBreaker.isOpen()) {
        throw new Error(`Circuit breaker is open due to ${circuitStatus.failures} consecutive failures. API calls are temporarily suspended.`);
      }

      // Get all enrichment data for this company
      const enrichmentData = await ctx.runQuery(
        internal.scoring.getEnrichmentData,
        { companyId: args.companyId }
      );

      if (enrichmentData.length === 0) {
        throw new Error("No enrichment data found for scoring");
      }

      // Get company information
      const company = await ctx.runQuery(
        internal.scoring.getCompanyInfo,
        { companyId: args.companyId }
      );

      if (!company) {
        throw new Error("Company not found");
      }

      // Prepare data for AI analysis
      const combinedData = await prepareDataForAI(enrichmentData, company);

      // Call Anthropic API for scoring
      const scoringResult = await callAnthropicForScoring(combinedData);

      // Record success in circuit breaker
      anthropicCircuitBreaker.recordSuccess();

      // Save the scoring result
      await ctx.runMutation(internal.scoring.saveScore, {
        companyId: args.companyId,
        leadScore: scoringResult.lead_score,
        arpuBand: scoringResult.arpu_band,
        keySignals: scoringResult.key_signals,
        scoreRationale: scoringResult.score_rationale,
        scoreFactors: scoringResult.score_factors,
      });

      // Log performance metrics
      const duration = Date.now() - startTime;
      await ctx.runMutation(internal.scoring.logScoringPerformance, {
        companyId: args.companyId,
        duration,
        success: true,
        circuitBreakerState: anthropicCircuitBreaker.getStatus().state,
      });

      console.log(`✅ AI scoring completed for company ${args.companyId} - Score: ${scoringResult.lead_score} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ AI scoring failed for company ${args.companyId}:`, error);
      
      // Record failure in circuit breaker for API-related errors
      if (error instanceof Error && error.message.includes('Anthropic API')) {
        anthropicCircuitBreaker.recordFailure();
      }

      // Log performance metrics for failures
      await ctx.runMutation(internal.scoring.logScoringPerformance, {
        companyId: args.companyId,
        duration,
        success: false,
        circuitBreakerState: anthropicCircuitBreaker.getStatus().state,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      
      // Log the error
      await ctx.runMutation(internal.scoring.logScoringError, {
        companyId: args.companyId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  },
});

// Internal query to get enrichment data
export const getEnrichmentData = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("raw_enrichment")
      .withIndex("by_company", (q) => q.eq("company_id", args.companyId))
      .collect();
  },
});

// Internal query to get company information
export const getCompanyInfo = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.companyId);
  },
});

// Internal mutation to save the AI scoring result
export const saveScore = internalMutation({
  args: {
    companyId: v.id("companies"),
    leadScore: v.number(),
    arpuBand: v.string(),
    keySignals: v.array(v.string()),
    scoreRationale: v.string(),
    scoreFactors: v.array(v.object({
      factor: v.string(),
      impact: v.string(),
      weight: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<void> => {
    // Calculate estimated ARPU based on band
    const estimatedArpu = calculateEstimatedArpu(args.arpuBand);
    
    // Update company record with scoring results
    await ctx.db.patch(args.companyId, {
      lead_score: args.leadScore,
      arpu_band: args.arpuBand,
      key_signals: args.keySignals,
      score_rationale: args.scoreRationale,
      score_factors: args.scoreFactors,
      estimated_arpu: estimatedArpu,
      last_activity_description: `AI scored lead: ${args.leadScore}/100`,
      last_activity_timestamp: Date.now(),
    });

    // Log scoring event
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "score_updated",
      description: `AI scoring completed with score ${args.leadScore}`,
      metadata: {
        lead_score: args.leadScore,
        arpu_band: args.arpuBand,
        key_signals: args.keySignals,
      },
    });
  },
});

// Internal mutation to log scoring errors
export const logScoringError = internalMutation({
  args: {
    companyId: v.id("companies"),
    error: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Update company with error status
    await ctx.db.patch(args.companyId, {
      last_activity_description: `AI scoring failed: ${args.error}`,
      last_activity_timestamp: Date.now(),
    });

    // Log error event
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "scoring_error",
      description: "AI scoring process failed",
      metadata: { error: args.error },
    });
  },
});

// Internal mutation to log scoring performance metrics
export const logScoringPerformance = internalMutation({
  args: {
    companyId: v.id("companies"),
    duration: v.number(),
    success: v.boolean(),
    circuitBreakerState: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "scoring_performance",
      description: `AI scoring ${args.success ? 'completed' : 'failed'} in ${args.duration}ms`,
      metadata: {
        duration: args.duration,
        success: args.success,
        circuit_breaker_state: args.circuitBreakerState,
        error_message: args.errorMessage,
        timestamp: Date.now(),
      },
    });
  },
});

// Helper function to prepare data for AI analysis
async function prepareDataForAI(enrichmentData: any[], company: any) {
  const dataBySource: Record<string, any> = {};
  
  // Organize enrichment data by source
  for (const record of enrichmentData) {
    if (record.status === 'success' && record.json_payload) {
      try {
        dataBySource[record.source] = JSON.parse(record.json_payload);
      } catch (error) {
        console.warn(`Failed to parse JSON for source ${record.source}`);
      }
    }
  }

  return {
    company: {
      name: company.company_name,
      website: company.website,
      industry: company.industry,
      description: company.description,
    },
    enrichment: dataBySource,
    metadata: {
      totalSources: enrichmentData.length,
      successfulSources: Object.keys(dataBySource).length,
      sources: Object.keys(dataBySource),
    },
  };
}

// Helper function to call Anthropic API for scoring
async function callAnthropicForScoring(data: any) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const prompt = `Analyze this company data and provide a comprehensive lead score and analysis:

Company: ${data.company.name}
Website: ${data.company.website}
Industry: ${data.company.industry || 'Unknown'}
Description: ${data.company.description || 'No description available'}

Enrichment Data:
${JSON.stringify(data.enrichment, null, 2)}

Please provide a JSON response with the following structure:
{
  "lead_score": number (0-100),
  "arpu_band": string ("$0-10K", "$10-50K", "$50-100K", or "$100K+"),
  "key_signals": array of 5 short strings describing key positive indicators,
  "score_rationale": string (max 500 chars explaining the score),
  "score_factors": array of objects with this structure: [
    {
      "factor": "string describing the factor",
      "impact": "positive" | "negative" | "neutral",
      "weight": number (0.01 to 0.40 representing percentage contribution)
    }
  ]
}

Use the Nivoda-style strategic value framework for scoring:

**Strategic Integration (Highest Value - 25-40% weights):**
- API/Platform integration capabilities
- Enterprise-grade technology infrastructure  
- B2B marketplace positioning

**Financial Health & Scale (High Value - 15-25% weights):**
- Revenue metrics and funding rounds
- Financial stability indicators
- Growth capital availability

**Market Position & Growth (Medium-High Value - 10-20% weights):**
- Global expansion and market presence
- Team scaling and operational growth
- Leadership expertise and industry positioning

**Customer & Product Strength (Medium Value - 5-15% weights):**
- Customer retention and market fit
- Product differentiation and competitive advantage
- Operational scale and efficiency

**Risk Factors (Negative weights -5% to -15%):**
- Market concerns or competitive threats
- Financial instability or operational weaknesses

For score_factors, provide 6-10 factors with strategic weights that sum to approximately 100%. Higher weights (20-40%) for strategic integration factors, medium weights (10-20%) for financial/market factors, lower weights (5-15%) for product factors, and negative weights for risks.

Score high (80-100) for companies with strong strategic integration potential, significant financial foundation, and clear expansion opportunities.
Score medium (40-79) for stable companies with moderate strategic value.
Score low (0-39) for early-stage companies or those with limited strategic alignment.`;

  // Retry configuration
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 second
  const MAX_DELAY = 30000; // 30 seconds
  const TIMEOUT = 120000; // 2 minutes

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🤖 Anthropic API call attempt ${attempt + 1}/${MAX_RETRIES + 1}`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different types of API responses
      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error response');
        
        // Create detailed error with status information
        const errorMessage = `Anthropic API call failed with status ${response.status} (${response.statusText}): ${errorBody}`;
        const apiError = new Error(errorMessage);
        
        // Add response details to error for debugging
        (apiError as any).status = response.status;
        (apiError as any).statusText = response.statusText;
        (apiError as any).responseBody = errorBody;

        // Determine if this is retryable
        const isRetryable = isRetryableError(response.status);
        
        console.error(`❌ API Error (attempt ${attempt + 1}): Status ${response.status}, Retryable: ${isRetryable}`);
        
        if (!isRetryable || attempt === MAX_RETRIES) {
          throw apiError;
        }
        
        lastError = apiError;
      } else {
        // Success - process the response
        const result = await response.json();
        const content = result.content[0]?.text;
        
        if (!content) {
          throw new Error("No content received from Anthropic API");
        }

        console.log(`✅ Anthropic API call successful on attempt ${attempt + 1}`);
        return parseAnthropicResponse(content);
      }
    } catch (error) {
      const currentError = error as Error;
      
      // Handle network errors, timeouts, and other exceptions
      if (currentError.name === 'AbortError') {
        currentError.message = `Anthropic API call timed out after ${TIMEOUT / 1000} seconds`;
      }

      console.error(`❌ Anthropic API Error (attempt ${attempt + 1}):`, currentError.message);
      
      lastError = currentError;
      
      // Don't retry for non-retryable errors
      if (!isRetryableNetworkError(currentError) || attempt === MAX_RETRIES) {
        throw currentError;
      }
    }

    // Calculate delay with exponential backoff and jitter
    if (attempt < MAX_RETRIES) {
      const delay = Math.min(
        BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000,
        MAX_DELAY
      );
      
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError || new Error("Max retries exceeded for Anthropic API call");
}

// Helper function to determine if an HTTP status is retryable
function isRetryableError(status: number): boolean {
  return (
    status === 429 || // Rate limited
    status === 502 || // Bad Gateway
    status === 503 || // Service Unavailable
    status === 504 || // Gateway Timeout
    status >= 520    // Cloudflare errors
  );
}

// Helper function to determine if a network error is retryable
function isRetryableNetworkError(error: Error): boolean {
  const retryableErrors = [
    'AbortError', // Timeout
    'TypeError', // Network errors
    'FetchError', // Fetch-specific network errors
  ];
  
  return retryableErrors.includes(error.name) ||
         error.message.includes('network') ||
         error.message.includes('timeout') ||
         error.message.includes('ECONNRESET') ||
         error.message.includes('ENOTFOUND');
}

// Helper function to parse Anthropic response
function parseAnthropicResponse(content: string) {
  try {
    // Look for JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Anthropic response");
    }
    
    const scoringResult = JSON.parse(jsonMatch[0]);
    
    // Validate the response structure
    if (typeof scoringResult.lead_score !== 'number' ||
        typeof scoringResult.arpu_band !== 'string' ||
        !Array.isArray(scoringResult.key_signals) ||
        typeof scoringResult.score_rationale !== 'string' ||
        !Array.isArray(scoringResult.score_factors)) {
      throw new Error("Invalid response structure from Anthropic API");
    }

    // Validate score_factors structure
    for (const factor of scoringResult.score_factors) {
      if (typeof factor !== 'object' || 
          typeof factor.factor !== 'string' ||
          typeof factor.impact !== 'string' ||
          typeof factor.weight !== 'number') {
        throw new Error("Invalid score_factors structure from Anthropic API");
      }
    }

    // Ensure score is within valid range
    scoringResult.lead_score = Math.max(0, Math.min(100, scoringResult.lead_score));
    
    // Ensure key_signals has max 5 items
    scoringResult.key_signals = scoringResult.key_signals.slice(0, 5);

    return scoringResult;
    
  } catch (error) {
    console.error("Failed to parse Anthropic response:", content);
    throw new Error(`Failed to parse AI scoring response: ${error}`);
  }
}

// Helper function to calculate estimated ARPU from band
function calculateEstimatedArpu(band: string): number {
  switch (band) {
    case '$0-10K':
      return 5000;
    case '$10-50K':
      return 30000;
    case '$50-100K':
      return 75000;
    case '$100K+':
      return 150000;
    default:
      return 5000;
  }
} 