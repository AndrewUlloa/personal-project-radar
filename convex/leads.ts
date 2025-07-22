import { query } from "./_generated/server";
import { v } from "convex/values";

// Main query for the LeadRadar component - returns companies in TanStack Table format
export const list = query({
  args: {
    // Optional filters
    minScore: v.optional(v.number()),
    geoMarket: v.optional(v.string()),
    arpuBand: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let companiesQuery = ctx.db.query("companies");

    // Apply filters if provided
    if (args.minScore !== undefined) {
      companiesQuery = companiesQuery.filter((q) =>
        q.gte(q.field("lead_score"), args.minScore!)
      );
    }

    const companies = await companiesQuery.order("desc").collect();

    // Transform to LeadItem format for the frontend
    return companies.map((company) => ({
      // Core required fields
      id: company._id,
      companyName: company.company_name,
      website: company.website,
      logoUrl: null, // TODO: Add logo support later
      geoMarket: company.geo_market || "Unknown",
      leadScore: company.lead_score || 0,
      arpuBand: mapToARPUBand(company.arpu_band),
      keySignals: company.key_signals || [],
      sizeFTE: company.employee_range || "Unknown",
      lastActivity: {
        type: getActivityType(company.last_activity_description),
        description: company.last_activity_description || "No activity",
        timeAgo: formatTimeAgo(company.last_activity_timestamp),
      },
      status: "new" as const,
      assignedTo: null,
      estimatedARPU: company.estimated_arpu || 0,
      addedAt: company._creationTime,

      // Rich context data
      overview: {
        address: company.address || "Unknown",
        industry: company.industry || "Unknown",
        founded: company.founded || null,
        description: company.description || "No description available",
      },

      // Timeline - empty for now, will be populated by detailed view
      timeline: [],

      // AI scoring rationale
      rationale: {
        explanation: company.score_rationale || "",
        factors: company.score_factors || [],
      },

      // Raw data for debugging - populated by detailed query
      rawData: {
        enrichment: {},
        scoreFeatures: {},
      },
    }));
  },
});

// Detailed query for individual company with enrichment data
export const getDetails = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;

    // Get enrichment data from raw_enrichment table
    const enrichmentRecords = await ctx.db
      .query("raw_enrichment")
      .withIndex("by_company", (q) => q.eq("company_id", args.companyId))
      .collect();

    // Get event timeline
    const events = await ctx.db
      .query("event_log")
      .withIndex("by_company_and_time", (q) => q.eq("company_id", args.companyId))
      .order("desc")
      .take(20);

    // Organize enrichment data by source
    const enrichmentData: Record<string, any> = {};
    for (const record of enrichmentRecords) {
      try {
        enrichmentData[record.source] = JSON.parse(record.json_payload);
      } catch (error) {
        console.warn(`Failed to parse enrichment data for source ${record.source}`);
        enrichmentData[record.source] = { error: "Invalid JSON data" };
      }
    }

    // Transform company to LeadItem format with full enrichment data
    return {
      id: company._id,
      companyName: company.company_name,
      website: company.website,
      logoUrl: null,
      geoMarket: company.geo_market || "Unknown",
      leadScore: company.lead_score || 0,
      arpuBand: mapToARPUBand(company.arpu_band),
      keySignals: company.key_signals || [],
      sizeFTE: company.employee_range || "Unknown",
      lastActivity: {
        type: getActivityType(company.last_activity_description),
        description: company.last_activity_description || "No activity",
        timeAgo: formatTimeAgo(company.last_activity_timestamp),
      },
      status: company.status || "new",
      assignedTo: company.assigned_to || null,
      estimatedARPU: company.estimated_arpu || 0,
      addedAt: company._creationTime,

      // Rich context data
      overview: {
        address: company.address || "Unknown",
        industry: company.industry || "Unknown",
        founded: company.founded || null,
        description: company.description || "No description available",
      },

      // Timeline from events
      timeline: events.map((event) => ({
        id: event._id,
        type: event.event_type as any,
        description: event.description || event.event_type,
        timestamp: new Date(event._creationTime),
        metadata: event.metadata,
      })),

      // AI scoring rationale
      rationale: {
        explanation: company.score_rationale || "No scoring rationale available",
        factors: company.score_factors || [],
      },

      // REAL enrichment data from database
      rawData: {
        enrichment: enrichmentData,
        scoreFeatures: {
          leadScore: company.lead_score,
          arpuBand: company.arpu_band,
          keySignals: company.key_signals,
          scoreRationale: company.score_rationale,
        },
      },
    };
  },
});

// Simple count query
export const count = query({
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    return {
      total: companies.length,
      scored: companies.filter(c => c.lead_score !== undefined).length,
      highScore: companies.filter(c => (c.lead_score || 0) >= 80).length,
    };
  },
});

// Helper functions
function mapToARPUBand(band?: string): "High" | "Mid" | "Low" {
  if (!band) return "Low";
  // Check for exact matches first, then fallbacks
  if (band === "$100K+") return "High";
  if (band === "$50-100K") return "High";  // $50-100K is still high value
  if (band === "$10-50K") return "Mid";
  if (band === "$0-10K") return "Low";
  
  // Fallback to string matching for any other formats
  if (band.includes("100K+")) return "High";
  if (band.includes("50K") || band.includes("50-100K")) return "High";
  if (band.includes("10K")) return "Mid";
  return "Low";
}

function getActivityType(description?: string): "enrichment" | "scoring" | "discovery" | "other" {
  if (!description) return "other";
  if (description.includes("enrichment") || description.includes("Enrichment")) return "enrichment";
  if (description.includes("scored") || description.includes("AI")) return "scoring";
  if (description.includes("discovered") || description.includes("Lead discovered")) return "discovery";
  return "other";
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