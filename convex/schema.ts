import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Main companies table - matches LeadItem interface from frontend
  companies: defineTable({
    // Core fields for TanStack Table and LeadItem interface
    company_name: v.string(),
    website: v.string(),
    logo_url: v.optional(v.string()),
    geo_market: v.optional(v.string()),
    lead_score: v.optional(v.number()),
    arpu_band: v.optional(v.string()), // "$0-10K", "$10-50K", "$50-100K", "$100K+"
    size_fte: v.optional(v.number()),
    employee_range: v.optional(v.string()), // "1-10", "11-50", "51-200", etc.
    key_signals: v.optional(v.array(v.string())),
    last_activity_description: v.optional(v.string()),
    last_activity_timestamp: v.optional(v.number()),
    
    // Status and assignment fields
    status: v.optional(v.string()), // "new", "contacted", "qualified", "converted"
    assigned_to: v.optional(v.string()),
    estimated_arpu: v.optional(v.number()),
    
    // Overview/company info
    address: v.optional(v.string()),
    industry: v.optional(v.string()),
    founded: v.optional(v.number()),
    description: v.optional(v.string()),
    
    // AI scoring rationale
    score_rationale: v.optional(v.string()),
    score_factors: v.optional(v.array(v.object({
      factor: v.string(),
      impact: v.string(), // "positive", "negative", "neutral"
      weight: v.number(), // 0.01 to 0.40 representing percentage contribution
    }))),
    
    // Discovery tracking
    discovery_source: v.optional(v.string()), // 'web_crawler', 'linkedin', 'manual', 'api'
  })
    .index("by_lead_score", ["lead_score"])
    .index("by_website", ["website"])
    .index("by_status", ["status"]),

  // Raw enrichment data from external APIs
  raw_enrichment: defineTable({
    company_id: v.id("companies"),
    source: v.string(), // 'exa_website', 'exa_linkedin', 'exa_funding', 'crunchbase', 'pitchbook', etc.
    json_payload: v.string(), // Stringified JSON from API
    fetched_at: v.number(), // Unix timestamp
    status: v.optional(v.string()), // 'success', 'failed', 'partial'
    error_message: v.optional(v.string()),
  })
    .index("by_company", ["company_id"])
    .index("by_source", ["company_id", "source"])
    .index("by_status", ["status"]),

  // Event log for tracking all activities and changes
  event_log: defineTable({
    company_id: v.id("companies"),
    event_type: v.string(), // 'lead_discovered', 'score_updated', 'enrichment_completed', 'status_changed'
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    user_id: v.optional(v.string()),
  })
    .index("by_company_and_time", ["company_id"])
    .index("by_event_type", ["event_type"]),

  // News and social media content
  news_content: defineTable({
    company_id: v.id("companies"),
    source: v.string(), // 'news', 'twitter', 'reddit', 'tiktok', 'youtube'
    title: v.string(),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    author: v.optional(v.string()),
    published_at: v.optional(v.number()),
    sentiment: v.optional(v.string()), // 'positive', 'neutral', 'negative'
    relevance_score: v.optional(v.number()),
  })
    .index("by_company", ["company_id"])
    .index("by_source", ["source"])
    .index("by_published", ["published_at"]),

  // Batch processing and automation queue
  discovery_queue: defineTable({
    domain: v.string(),
    company_name: v.optional(v.string()),
    status: v.string(), // 'pending', 'processing', 'completed', 'failed'
    scheduled_for: v.number(),
    attempts: v.number(),
    last_error: v.optional(v.string()),
    priority: v.optional(v.number()), // Higher number = higher priority
    source: v.optional(v.string()), // 'manual', 'cron', 'api'
  })
    .index("by_status_and_time", ["status", "scheduled_for"])
    .index("by_domain", ["domain"])
    .index("by_priority", ["priority"]),

  // Performance monitoring and caching
  performance_logs: defineTable({
    operation: v.string(),
    duration: v.number(), // milliseconds
    success: v.boolean(),
    error_message: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_operation", ["operation"])
    .index("by_success", ["success"]),

  // Cache table for expensive queries
  cache: defineTable({
    key: v.string(),
    data: v.any(),
    expires: v.number(),
    created_at: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expires", ["expires"]),

  // Dashboard metrics for charts
  dashboard_metrics: defineTable({
    metric_type: v.string(), // 'daily_leads', 'score_distribution', 'arpu_forecast'
    date: v.string(), // YYYY-MM-DD format
    value: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_type_and_date", ["metric_type", "date"])
    .index("by_date", ["date"]),
}); 