import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Main internal action to score a lead using Anthropic AI
export const scoreLead = internalAction({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args): Promise<void> => {
    console.log(`🤖 Starting AI scoring for company ${args.companyId}`);
    
    try {
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

      // Save the scoring result
      await ctx.runMutation(internal.scoring.saveScore, {
        companyId: args.companyId,
        leadScore: scoringResult.lead_score,
        arpuBand: scoringResult.arpu_band,
        keySignals: scoringResult.key_signals,
        scoreRationale: scoringResult.score_rationale,
        scoreFactors: scoringResult.score_factors,
      });

      console.log(`✅ AI scoring completed for company ${args.companyId} - Score: ${scoringResult.lead_score}`);
      
    } catch (error) {
      console.error(`❌ AI scoring failed for company ${args.companyId}:`, error);
      
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
  });

  if (!response.ok) {
    throw new Error(`Anthropic API call failed: ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.content[0]?.text;
  
  if (!content) {
    throw new Error("No content received from Anthropic API");
  }

  // Extract JSON from the response
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