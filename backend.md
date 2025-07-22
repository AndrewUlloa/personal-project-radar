# Lead-Radar Backend Reference Guide

This document serves as a comprehensive reference for setting up and maintaining the Lead-Radar backend using Convex and Anthropic. It incorporates the latest documentation and best practices for all technologies involved.

## Table of Contents

1. [Tech Stack Overview](#tech-stack-overview)
2. [Dependencies & Installation](#dependencies--installation)
3. [Convex Setup & Schema](#convex-setup--schema)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Implementation Guide](#implementation-guide)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Tech Stack Overview

### Core Technologies

- **Convex**: Backend-as-a-Service for real-time data, serverless functions, and file storage
- **Anthropic SDK**: AI/LLM integration for intelligent scoring and analysis
- **Zod**: TypeScript-first schema validation with static type inference
- **TanStack Table**: Frontend table requirements driving our data structure
- **Exa API**: Data enrichment service for company information

### Key Concepts

1. **Convex Functions**:

   - `queries`: Read-only operations that fetch data
   - `mutations`: Write operations that modify database state
   - `actions`: Side-effect operations (API calls, AI processing)
   - `internalMutations/internalActions`: Private functions not exposed to clients

2. **Data Flow**:
   - Client → Mutation → Internal Action → External APIs → Internal Mutation → Database
   - This pattern ensures data consistency and proper error handling

## Dependencies & Installation

```bash
# Install core dependencies
npm install convex @anthropic-ai/sdk zod

# Initialize Convex in your project
npx convex init

# Start Convex development server
npx convex dev
```

### Package Versions (Latest as of documentation)

```json
{
  "convex": "latest",
  "@anthropic-ai/sdk": "latest",
  "zod": "^3.x"
}
```

## Convex Setup & Schema

### Schema Definition (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  companies: defineTable({
    // Core fields for TanStack Table
    company_name: v.string(),
    geo_market: v.optional(v.string()),
    lead_score: v.optional(v.number()),
    arpu_band: v.optional(v.string()),
    size_fte: v.optional(v.number()),
    key_signals: v.optional(v.array(v.string())),
    last_activity_description: v.optional(v.string()),
    last_activity_timestamp: v.optional(v.number()),

    // Additional backend fields
    website: v.string(),
    score_rationale: v.optional(v.string()),
    employee_range: v.optional(v.string()),
  })
    .index("by_lead_score", ["lead_score"])
    .index("by_creation_time", ["_creationTime"]),

  raw_enrichment: defineTable({
    company_id: v.id("companies"),
    source: v.string(), // 'exa_website', 'exa_linkedin', 'exa_funding', etc.
    json_payload: v.string(), // Stringified JSON from API
    fetched_at: v.number(), // Unix timestamp
  })
    .index("by_company", ["company_id"])
    .index("by_source", ["company_id", "source"]),

  event_log: defineTable({
    company_id: v.id("companies"),
    event_type: v.string(), // 'lead_discovered', 'score_updated', 'enrichment_completed'
    metadata: v.optional(v.any()),
  }).index("by_company_and_time", ["company_id", "_creationTime"]),

  // For batch processing and automation
  discovery_queue: defineTable({
    domain: v.string(),
    status: v.string(), // 'pending', 'processing', 'completed', 'failed'
    scheduled_for: v.number(),
    attempts: v.number(),
    last_error: v.optional(v.string()),
  }).index("by_status_and_time", ["status", "scheduled_for"]),
});
```

## Data Flow Architecture

### 1. Lead Discovery Flow

```
Cron Job → discoveryAction → Exa Search API → For each domain:
  └→ ingestAndEnrich Action → Multiple Exa APIs → saveEnrichmentData Mutation
```

### 2. AI Scoring Flow

```
saveEnrichmentData → Schedule scoreLead Action →
  └→ Anthropic generateObject → saveScore Mutation → Update companies table
```

### 3. Client Query Flow

```
Frontend DataTable → list Query →
  └→ Transform & return data in TanStack Table format
```

## Implementation Guide

### Phase 1: Data Ingestion (`convex/leads.ts`)

```typescript
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Main ingestion action
export const ingestAndEnrich = action({
  args: {
    websiteUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Parallel Exa API calls
    const [websiteData, linkedinData, fundingData] = await Promise.all([
      fetchWebsiteData(args.websiteUrl),
      fetchLinkedInData(args.websiteUrl),
      fetchFundingData(args.websiteUrl),
    ]);

    // Save to database
    const companyId = await ctx.runMutation(internal.leads.saveEnrichmentData, {
      websiteUrl: args.websiteUrl,
      websiteData,
      linkedinData,
      fundingData,
    });

    // Schedule AI scoring
    await ctx.scheduler.runAfter(0, internal.scoring.scoreLead, { companyId });

    return companyId;
  },
});

// Internal mutation to save enrichment data
export const saveEnrichmentData = internalMutation({
  args: {
    websiteUrl: v.string(),
    websiteData: v.any(),
    linkedinData: v.any(),
    fundingData: v.any(),
  },
  handler: async (ctx, args) => {
    // Parse and extract company info
    const companyName = extractCompanyName(args.websiteData);
    const geoMarket = extractGeoMarket(args.linkedinData);
    const employeeRange = extractEmployeeRange(args.linkedinData);
    const sizeFte = calculateMidpoint(employeeRange);

    // Create company record
    const companyId = await ctx.db.insert("companies", {
      company_name: companyName,
      website: args.websiteUrl,
      geo_market: geoMarket,
      employee_range: employeeRange,
      size_fte: sizeFte,
      last_activity_description: "Lead discovered",
      last_activity_timestamp: Date.now(),
    });

    // Store raw enrichment data
    const enrichmentData = [
      { source: "exa_website", data: args.websiteData },
      { source: "exa_linkedin", data: args.linkedinData },
      { source: "exa_funding", data: args.fundingData },
    ];

    for (const { source, data } of enrichmentData) {
      await ctx.db.insert("raw_enrichment", {
        company_id: companyId,
        source,
        json_payload: JSON.stringify(data),
        fetched_at: Date.now(),
      });
    }

    // Log event
    await ctx.db.insert("event_log", {
      company_id: companyId,
      event_type: "lead_discovered",
      metadata: { websiteUrl: args.websiteUrl },
    });

    return companyId;
  },
});

// Helper functions
function calculateMidpoint(range: string): number {
  // "11-50" → 30
  const match = range.match(/(\d+)-(\d+)/);
  if (!match) return 0;
  return Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2);
}
```

### Phase 2: AI Scoring (`convex/scoring.ts`)

```typescript
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Zod schema for AI response
const scoringSchema = z.object({
  lead_score: z.number().min(0).max(100),
  arpu_band: z.enum(["$0-10K", "$10-50K", "$50-100K", "$100K+"]),
  key_signals: z.array(z.string()).max(5),
  score_rationale: z.string().max(500),
});

export const scoreLead = action({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Fetch all enrichment data
    const enrichmentRecords = await ctx.runQuery(
      internal.scoring.getEnrichmentData,
      { companyId: args.companyId }
    );

    // Combine all data for AI analysis
    const combinedData = enrichmentRecords.reduce((acc, record) => {
      acc[record.source] = JSON.parse(record.json_payload);
      return acc;
    }, {} as Record<string, any>);

    // Call Anthropic with structured output
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this company data and provide a lead score (0-100), ARPU band estimate, key signals (max 5), and a brief rationale:
          
          ${JSON.stringify(combinedData, null, 2)}
          
          Focus on:
          - Company size and growth indicators
          - Technology stack and digital maturity
          - Market position and competitive landscape
          - Funding status and financial health
          - Recent activities and momentum
          
          Return a JSON object with these exact fields:
          - lead_score: number (0-100)
          - arpu_band: string (one of: "$0-10K", "$10-50K", "$50-100K", "$100K+")
          - key_signals: array of strings (max 5 short phrases)
          - score_rationale: string (max 500 chars explaining the score)`,
        },
      ],
      // Using response_format for structured output (if available)
      // Otherwise, we'll parse the JSON from the response
    });

    // Parse and validate the response
    const aiOutput = JSON.parse(response.content[0].text);
    const validatedOutput = scoringSchema.parse(aiOutput);

    // Save the score
    await ctx.runMutation(internal.scoring.saveScore, {
      companyId: args.companyId,
      ...validatedOutput,
    });

    return validatedOutput;
  },
});

export const saveScore = internalMutation({
  args: {
    companyId: v.id("companies"),
    lead_score: v.number(),
    arpu_band: v.string(),
    key_signals: v.array(v.string()),
    score_rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId, ...scoreData } = args;

    // Update company record
    await ctx.db.patch(companyId, {
      ...scoreData,
      last_activity_description: `Lead score updated to ${scoreData.lead_score}`,
      last_activity_timestamp: Date.now(),
    });

    // Log scoring event
    await ctx.db.insert("event_log", {
      company_id: companyId,
      event_type: "score_updated",
      metadata: {
        lead_score: scoreData.lead_score,
        arpu_band: scoreData.arpu_band,
      },
    });
  },
});

// Internal query for fetching enrichment data
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
```

### Phase 3: Frontend Queries (`convex/leads.ts` continued)

```typescript
import { query } from "./_generated/server";

// Main query for TanStack Table
export const list = query({
  args: {
    // Optional filters
    minScore: v.optional(v.number()),
    geoMarket: v.optional(v.string()),
    arpuBand: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let companiesQuery = ctx.db.query("companies").order("desc", "lead_score");

    // Apply filters if provided
    if (args.minScore !== undefined) {
      companiesQuery = companiesQuery.filter((q) =>
        q.gte(q.field("lead_score"), args.minScore!)
      );
    }

    const companies = await companiesQuery.collect();

    // Transform to TanStack Table format
    return companies.map((c) => ({
      // Required fields
      companyName: c.company_name,
      geoMarket: c.geo_market ?? "Unknown",
      leadScore: c.lead_score ?? 0,
      arpuBand: c.arpu_band ?? "Unknown",
      sizeFTE: c.size_fte ?? 0,
      keySignals: c.key_signals ?? [],
      lastActivity: {
        description: c.last_activity_description ?? "No activity",
        timestamp: c.last_activity_timestamp ?? Date.now(),
      },
      // Metadata
      id: c._id,
      website: c.website,
    }));
  },
});

// Detailed view query
export const getDetails = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const events = await ctx.db
      .query("event_log")
      .withIndex("by_company_and_time", (q) =>
        q.eq("company_id", args.companyId)
      )
      .order("desc")
      .take(50);

    const enrichmentData = await ctx.db
      .query("raw_enrichment")
      .withIndex("by_company", (q) => q.eq("company_id", args.companyId))
      .collect();

    return {
      company,
      events,
      enrichmentSources: enrichmentData.map((e) => ({
        source: e.source,
        fetchedAt: e.fetched_at,
      })),
    };
  },
});
```

### Phase 4: Automation (`convex/crons.ts`)

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly discovery job
crons.interval(
  "discover-new-leads",
  { hours: 1 },
  internal.discovery.discoverNewCompanies
);

// Daily scoring update
crons.daily(
  "update-scores",
  { hourUTC: 2, minuteUTC: 0 },
  internal.discovery.updateExistingScores
);

export default crons;
```

## API Reference

### Convex Functions

#### Queries

- `leads.list(args?)` - Returns companies in TanStack Table format
- `leads.getDetails(companyId)` - Returns detailed company information

#### Mutations

- None exposed publicly (all writes go through actions)

#### Actions

- `leads.ingestAndEnrich(websiteUrl)` - Discovers and enriches a new lead
- `scoring.scoreLead(companyId)` - Generates AI score for a company

#### Internal Functions

- `internal.leads.saveEnrichmentData` - Saves raw API data
- `internal.scoring.saveScore` - Updates company scores
- `internal.discovery.discoverNewCompanies` - Cron job for finding leads

### Anthropic Integration

Using the latest Anthropic SDK patterns:

```typescript
// Best practice: Use structured generation
const response = await anthropic.messages.create({
  model: "claude-3-sonnet-20241022",
  messages: [{ role: "user", content: prompt }],
  max_tokens: 1024,
});

// For structured output (when available)
// Consider using AI SDK generateObject pattern:
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const { object } = await generateObject({
  model: anthropic("claude-3-sonnet-20241022"),
  schema: scoringSchema,
  prompt: "Analyze company data...",
});
```

## Best Practices

### 1. Convex Patterns

```typescript
// ✅ Good: Use internal mutations from actions
export const publicAction = action({
  handler: async (ctx) => {
    await ctx.runMutation(internal.module.internalMutation, args);
  },
});

// ❌ Bad: Multiple sequential queries/mutations
const result1 = await ctx.runQuery(...);
const result2 = await ctx.runQuery(...);

// ✅ Good: Single combined query
const results = await ctx.runQuery(internal.module.getCombinedData);
```

### 2. Error Handling

```typescript
// Wrap external API calls in try-catch
try {
  const data = await fetchExternalAPI();
} catch (error) {
  // Log to event_log for debugging
  await ctx.db.insert("event_log", {
    company_id,
    event_type: "error",
    metadata: { error: error.message },
  });

  // Re-throw or handle gracefully
  throw new Error(`Enrichment failed: ${error.message}`);
}
```

### 3. Schema Validation

```typescript
// Always validate external data
const validatedData = enrichmentSchema.safeParse(apiResponse);
if (!validatedData.success) {
  console.error("Validation failed:", validatedData.error);
  // Handle invalid data
}
```

### 4. Performance Optimization

```typescript
// Use indexes for queries
.withIndex("by_lead_score", (q) => q.gte("lead_score", 80))

// Batch operations when possible
const updates = items.map(item => ctx.db.patch(item.id, data));
await Promise.all(updates);

// Limit result sets
.take(100) // Prevent large payloads
```

## Troubleshooting

### Common Issues

1. **Convex Function Timeouts**

   - Actions have a 120-second timeout
   - Break long operations into smaller chunks
   - Use background jobs for heavy processing

2. **AI Response Parsing**

   - Always validate AI output with Zod
   - Provide clear, structured prompts
   - Have fallback values for missing data

3. **Rate Limiting**

   - Implement exponential backoff
   - Use Convex's built-in retry mechanisms
   - Track API usage in event_log

4. **Data Consistency**
   - Use transactions when updating multiple tables
   - Implement idempotency for actions
   - Log all state changes

### Debug Commands

```bash
# View Convex logs
npx convex logs

# Run a function manually
npx convex run leads:list

# Check schema status
npx convex dev
```

## Security Considerations

1. **API Keys**: Store in environment variables

   ```bash
   npx convex env set ANTHROPIC_API_KEY "your-key"
   npx convex env set EXA_API_KEY "your-key"
   ```

2. **Access Control**: Use internal functions for sensitive operations

3. **Data Validation**: Always validate external inputs

4. **Rate Limiting**: Implement per-company or per-user limits

## Next Steps

1. Set up monitoring and alerting
2. Implement data retention policies
3. Add webhook support for real-time updates
4. Create admin dashboard for manual interventions
5. Optimize AI prompts based on scoring accuracy

## References

- [Convex Documentation](https://docs.convex.dev)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Zod Documentation](https://zod.dev)
- [TanStack Table](https://tanstack.com/table)

## Step-by-Step Implementation Plan

Now that the UI is complete, here's a detailed action plan to connect everything to the backend:

### Phase 1: Environment Setup (Day 1)

#### 1.1 Initialize Convex

```bash
# In your project root
npx convex init
npm install @anthropic-ai/sdk zod

# Set up environment variables
npx convex env set ANTHROPIC_API_KEY "your-anthropic-key"
npx convex env set EXA_API_KEY "your-exa-api-key"
```

#### 1.2 Create Initial Schema

Create `convex/schema.ts` with the schema from [Phase 3](#convex-setup--schema) above, ensuring it matches the `LeadItem` type structure from your frontend.

#### 1.3 Deploy Schema

```bash
npx convex dev
# Keep this running in a separate terminal
```

### Phase 2: Migrate Existing API Routes (Day 2-3)

Your existing API routes need to be consolidated into Convex actions. Here's the mapping:

#### 2.1 Create Enrichment Actions (`convex/enrichment.ts`)

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

// Consolidate these existing API routes:
// - /api/scrapewebsiteurl
// - /api/scrapelinkedin
// - /api/fetchfunding
// - /api/fetchcrunchbase
// - /api/fetchpitchbook
// - /api/fetchtracxn

export const enrichCompany = action({
  args: { websiteUrl: v.string() },
  handler: async (ctx, args) => {
    // Migrate logic from your existing API routes
    // Run all enrichment calls in parallel
    const [website, linkedin, funding, crunchbase] = await Promise.all([
      // Your existing fetch logic here
    ]);

    // Save to Convex
    return await ctx.runMutation(internal.enrichment.saveData, {
      websiteUrl: args.websiteUrl,
      enrichmentData: { website, linkedin, funding, crunchbase },
    });
  },
});
```

#### 2.2 Create News & Social Actions (`convex/newsAndSocial.ts`)

Migrate these routes:

- `/api/findnews`
- `/api/scraperecenttweets`
- `/api/scrapereddit`
- `/api/fetchtiktok`

### Phase 3: Connect Dashboard Widgets (Day 4-5)

Each chart widget needs a specific query. Create `convex/dashboard.ts`:

#### 3.1 Chart Data Queries

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// For ChartLineInteractive - Total Leads in Database (90-day trend)
export const getTotalLeadsTrend = query({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const companies = await ctx.db
      .query("companies")
      .filter((q) => q.gte(q.field("_creationTime"), ninetyDaysAgo))
      .collect();

    // Group by day and source (web crawler vs LinkedIn)
    // Return format matching ChartLineInteractive data structure
    return {
      data: groupByDayAndSource(companies),
      totals: {
        desktop: companies.filter((c) => c.source === "web").length,
        mobile: companies.filter((c) => c.source === "linkedin").length,
      },
    };
  },
});

// For ChartBarLabel - New Leads Discovered Today (hourly)
export const getNewLeadsToday = query({
  handler: async (ctx) => {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const leads = await ctx.db
      .query("companies")
      .filter((q) => q.gte(q.field("_creationTime"), todayStart))
      .collect();

    // Group by hour
    return groupLeadsByHour(leads);
  },
});

// For ChartRadialShape - High-Priority Leads (Score ≥ 80)
export const getHighPriorityLeads = query({
  handler: async (ctx) => {
    const highPriority = await ctx.db
      .query("companies")
      .filter((q) => q.gte(q.field("lead_score"), 80))
      .collect();

    const total = await ctx.db.query("companies").collect();

    return {
      count: highPriority.length,
      percentage: Math.round((highPriority.length / total.length) * 100),
    };
  },
});

// For ChartRadialText - Average Lead Score
export const getAverageLeadScore = query({
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    const avgScore =
      companies.reduce((sum, c) => sum + (c.lead_score || 0), 0) /
      companies.length;

    // Calculate 30-day change
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldCompanies = companies.filter(
      (c) => c._creationTime < thirtyDaysAgo
    );
    const oldAvg =
      oldCompanies.reduce((sum, c) => sum + (c.lead_score || 0), 0) /
      oldCompanies.length;

    return {
      current: Math.round(avgScore * 10) / 10,
      change: Math.round((avgScore - oldAvg) * 10) / 10,
    };
  },
});

// For ChartBarStacked - Score Distribution
export const getScoreDistribution = query({
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();

    return {
      low: companies.filter((c) => (c.lead_score || 0) < 40).length,
      mid: companies.filter(
        (c) => (c.lead_score || 0) >= 40 && (c.lead_score || 0) < 80
      ).length,
      high: companies.filter((c) => (c.lead_score || 0) >= 80).length,
    };
  },
});

// For ChartAreaGradient - ARPU Forecast (30d rolling)
export const getARPUForecast = query({
  handler: async (ctx) => {
    // Calculate rolling 30-day ARPU trends
    const companies = await ctx.db.query("companies").collect();
    return calculateRollingARPU(companies);
  },
});

// For ChartRadarGridCustom - News Alerts (24h)
export const getNewsAlerts = query({
  handler: async (ctx) => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const events = await ctx.db
      .query("event_log")
      .filter((q) =>
        q.and(
          q.eq(q.field("event_type"), "news_alert"),
          q.gte(q.field("_creationTime"), yesterday)
        )
      )
      .collect();

    // Categorize by type
    return categorizeNewsAlerts(events);
  },
});
```

### Phase 4: Connect LeadRadar Component (Day 6)

The LeadRadar component is the core of your application. Update `convex/leads.ts`:

#### 4.1 Update List Query for LeadRadar

```typescript
// This query powers the LeadTable component
export const list = query({
  handler: async (ctx) => {
    const companies = await ctx.db
      .query("companies")
      .order("desc", "lead_score")
      .collect();

    // Transform to match LeadItem interface exactly
    return companies.map((company) => ({
      // Core fields from LeadItem
      id: company._id,
      companyName: company.company_name,
      website: company.website,
      logoUrl: undefined, // Add logo support later
      geoMarket: company.geo_market || "Unknown",
      leadScore: company.lead_score || 0,
      arpuBand: mapToARPUBand(company.arpu_band),
      keySignals: company.key_signals || [],
      sizeFTE: formatEmployeeRange(company.size_fte),
      lastActivity: {
        type: getActivityType(company.last_activity_description),
        description: company.last_activity_description || "No activity",
        timeAgo: formatTimeAgo(company.last_activity_timestamp),
      },
      status: "new" as const,
      assignedTo: undefined,
      estimatedARPU: calculateEstimatedARPU(company.arpu_band),
      addedAt: new Date(company._creationTime),

      // Rich context data - fetch from raw_enrichment
      overview: {
        address: extractAddress(company),
        industry: extractIndustry(company),
        founded: extractFoundedYear(company),
        description: extractDescription(company),
      },

      // Timeline - fetch from event_log
      timeline: [], // Will be populated by getDetails query

      // Rationale from AI scoring
      rationale: {
        explanation: company.score_rationale || "",
        factors: parseScoreFactors(company.score_rationale),
      },

      // Raw data for debugging
      rawData: {
        enrichment: {},
        scoreFeatures: {},
      },
    }));
  },
});
```

#### 4.2 Create Helper Functions

```typescript
// Helper functions to transform backend data to frontend format
function mapToARPUBand(band?: string): "High" | "Mid" | "Low" {
  if (!band) return "Low";
  if (band.includes("100K")) return "High";
  if (band.includes("50K")) return "Mid";
  return "Low";
}

function formatEmployeeRange(sizeFte?: number): string {
  if (!sizeFte) return "1-10";
  if (sizeFte <= 10) return "1-10";
  if (sizeFte <= 50) return "11-50";
  if (sizeFte <= 200) return "51-200";
  if (sizeFte <= 1000) return "201-1K";
  return "1K+";
}

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "Unknown";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function calculateEstimatedARPU(band?: string): number {
  if (!band) return 2500;
  if (band.includes("100K")) return 125000;
  if (band.includes("50K")) return 75000;
  if (band.includes("10K")) return 30000;
  return 5000;
}
```

### Phase 5: Frontend Integration (Day 7-8)

#### 5.1 Install Convex React Client

```bash
npm install convex @tanstack/react-query
```

#### 5.2 Set Up Convex Provider

Update `app/layout.tsx`:

```typescript
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexProvider client={convex}>{children}</ConvexProvider>
      </body>
    </html>
  );
}
```

#### 5.3 Update LeadRadarContext

Replace static data with Convex queries:

```typescript
// lib/contexts/LeadRadarContext.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function LeadRadarProvider({ children }: { children: ReactNode }) {
  // Replace static data with Convex query
  const leads = useQuery(api.leads.list) || [];
  const addLeadMutation = useMutation(api.leads.ingestAndEnrich);

  const addLead = async (newLead: Omit<LeadItem, "id" | "addedAt">) => {
    try {
      await addLeadMutation({ websiteUrl: newLead.website });
      toast.success(`Added ${newLead.companyName} to lead radar`);
    } catch (error) {
      toast.error(`Failed to add ${newLead.companyName}`);
    }
  };

  // Update other methods to use Convex queries
  const getNewLeadsLast24h = () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    return leads.filter((lead) => new Date(lead.addedAt).getTime() > yesterday)
      .length;
  };

  // ... rest of the methods
}
```

#### 5.4 Update Chart Components

Each chart component needs to fetch data from Convex:

```typescript
// components/dashboard/ChartLineInteractive.tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ChartLineInteractive() {
  const trendData = useQuery(api.dashboard.getTotalLeadsTrend);

  if (!trendData) return <LoadingState />;

  // Use trendData instead of hardcoded chartData
  return <Card>{/* ... existing JSX with dynamic data */}</Card>;
}
```

### Phase 6: Search Integration (Day 9)

The SearchDockIcon component needs to trigger lead discovery:

#### 6.1 Create Search Action

```typescript
// convex/search.ts
export const searchAndAddCompany = action({
  args: {
    companyName: v.string(),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.runQuery(internal.search.checkExisting, {
      website: args.website,
    });

    if (existing) {
      throw new Error("Company already in database");
    }

    // Trigger enrichment and scoring
    return await ctx.runAction(internal.leads.ingestAndEnrich, {
      websiteUrl: args.website,
    });
  },
});
```

#### 6.2 Update CompanyResearcher Component

```typescript
// components/CompanyResearchHome.tsx
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function CompanyResearcher() {
  const searchAndAdd = useAction(api.search.searchAndAddCompany);

  const handleAddToRadar = async (company: CompanyData) => {
    try {
      await searchAndAdd({
        companyName: company.name,
        website: company.website,
      });
      toast.success("Company added to Lead Radar!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ... rest of component
}
```

### Phase 7: Automation Setup (Day 10)

#### 7.1 Configure Cron Jobs

Create `convex/crons.ts` as defined in Phase 4 of the backend guide.

#### 7.2 Set Up Discovery Pipeline

```typescript
// convex/discovery.ts
export const discoverNewCompanies = internalAction({
  handler: async (ctx) => {
    // Query Exa for companies matching ICP
    const domains = await searchExaForJewelryRetailers();

    // Process in batches to avoid timeouts
    for (const batch of chunks(domains, 10)) {
      await Promise.all(
        batch.map((domain) =>
          ctx.runAction(internal.leads.ingestAndEnrich, {
            websiteUrl: domain,
          })
        )
      );
    }
  },
});
```

### Phase 8: Testing & Optimization (Day 11-12)

#### 8.1 Create Test Suite

```typescript
// convex/tests/scoring.test.ts
import { expect, test } from "@jest/globals";
import { api } from "../_generated/api";

test("scoring produces valid scores", async () => {
  const result = await scoreLead({
    companyId: "test-id",
    enrichmentData: mockEnrichmentData,
  });

  expect(result.lead_score).toBeGreaterThanOrEqual(0);
  expect(result.lead_score).toBeLessThanOrEqual(100);
  expect(result.key_signals).toHaveLength(5);
});
```

#### 8.2 Performance Monitoring

```typescript
// convex/monitoring.ts
export const logPerformance = internalMutation({
  args: {
    operation: v.string(),
    duration: v.number(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("performance_logs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

### Phase 9: Deployment (Day 13)

#### 9.1 Production Setup

```bash
# Deploy to production
npx convex deploy --prod

# Set production environment variables
npx convex env set ANTHROPIC_API_KEY "prod-key" --prod
npx convex env set EXA_API_KEY "prod-key" --prod
```

#### 9.2 Update Frontend Environment

```bash
# .env.production
NEXT_PUBLIC_CONVEX_URL=https://your-prod-url.convex.cloud
```

### Phase 10: Post-Launch Optimization

#### 10.1 Monitor AI Scoring Accuracy

```typescript
// Track scoring performance
export const trackScoringAccuracy = internalMutation({
  args: {
    companyId: v.id("companies"),
    predictedScore: v.number(),
    actualOutcome: v.string(),
  },
  handler: async (ctx, args) => {
    // Store for model improvement
  },
});
```

#### 10.2 Optimize Query Performance

```typescript
// Add caching for expensive queries
export const getCachedDashboardData = query({
  handler: async (ctx) => {
    const cacheKey = "dashboard_data";
    const cached = await ctx.db
      .query("cache")
      .filter((q) => q.eq(q.field("key"), cacheKey))
      .first();

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Compute fresh data
    const data = await computeDashboardData(ctx);

    // Cache for 5 minutes
    await ctx.db.insert("cache", {
      key: cacheKey,
      data,
      expires: Date.now() + 5 * 60 * 1000,
    });

    return data;
  },
});
```

## Success Metrics

Track these KPIs to ensure successful implementation:

1. **Data Quality**

   - Lead enrichment success rate > 95%
   - AI scoring completion rate > 98%
   - Average enrichment time < 5 seconds

2. **System Performance**

   - Dashboard load time < 2 seconds
   - Query response time < 100ms
   - Zero data inconsistencies

3. **Business Impact**
   - Daily new leads discovered
   - Lead score accuracy (validated against actual conversions)
   - Time from discovery to qualification

## Common Pitfalls to Avoid

1. **Don't skip data validation** - Always validate AI responses with Zod
2. **Avoid sequential API calls** - Use Promise.all for parallel execution
3. **Handle rate limits** - Implement exponential backoff
4. **Don't store sensitive data** - Keep API credentials in environment variables
5. **Test edge cases** - Empty results, API failures, malformed data

## Support Resources

- Convex Discord: https://discord.gg/convex
- Anthropic Support: https://support.anthropic.com
- Project Repository: [Your GitHub repo]
- Internal Slack: #lead-radar-support

This completes the full implementation guide for connecting your Lead-Radar UI to the backend infrastructure.
