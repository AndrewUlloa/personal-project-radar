import { action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Main search action that integrates with the SearchDockIcon component
export const searchAndAddCompany = action({
  args: {
    companyName: v.string(),
    website: v.string(),
    source: v.optional(v.string()), // 'search', 'manual', 'batch'
  },
  handler: async (ctx, args): Promise<{ companyId: Id<"companies">; isNew: boolean }> => {
    console.log(`🔍 Search request: ${args.companyName} (${args.website})`);
    
    // Check if company already exists
    const existing = await ctx.runQuery(internal.search.checkExisting, {
      website: args.website,
    });

    if (existing) {
      return {
        companyId: existing._id,
        isNew: false,
      };
    }

    // Create and enrich the company using the enrichment module
    const companyId = await ctx.runAction(internal.enrichment.enrichCompany, {
      websiteUrl: args.website,
      companyName: args.companyName,
      discoverySource: args.source || 'search',
    });

    // Log the search event
    await ctx.runMutation(internal.search.logSearchEvent, {
      companyId,
      searchTerm: args.companyName,
      website: args.website,
      source: args.source || 'search',
    });

    return {
      companyId,
      isNew: true,
    };
  },
});

// Search suggestions based on partial input
export const getSearchSuggestions = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    // Search existing companies
    const existingCompanies = await ctx.runQuery(internal.search.searchExistingCompanies, {
      query: args.query,
      limit,
    });
    
    return existingCompanies;
  },
});

// Internal query to check if company exists
export const checkExisting = internalQuery({
  args: {
    website: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize website URL for comparison
    const normalizedWebsite = normalizeWebsiteUrl(args.website);
    
    const company = await ctx.db
      .query("companies")
      .withIndex("by_website", (q) => q.eq("website", normalizedWebsite))
      .first();
    
    return company;
  },
});

// Internal query to search existing companies
export const searchExistingCompanies = internalQuery({
  args: {
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const companies = await ctx.db
      .query("companies")
      .collect();
    
    // Simple text search - could be enhanced with full-text search index
    const query = args.query.toLowerCase();
    const matches = companies
      .filter(company => 
        company.company_name.toLowerCase().includes(query) ||
        company.website.toLowerCase().includes(query) ||
        (company.description && company.description.toLowerCase().includes(query))
      )
      .slice(0, args.limit)
      .map(company => ({
        id: company._id,
        companyName: company.company_name,
        website: company.website,
        description: company.description || null,
        leadScore: company.lead_score || 0,
      }));
    
    return matches;
  },
});

// Internal mutation to log search events
export const logSearchEvent = internalMutation({
  args: {
    companyId: v.id("companies"),
    searchTerm: v.string(),
    website: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "search_add",
      description: `Company added via search: "${args.searchTerm}"`,
      metadata: {
        searchTerm: args.searchTerm,
        website: args.website,
        source: args.source,
      },
    });
  },
});

// Analytics query for search performance
export const getSearchAnalytics = action({
  args: {
    period: v.optional(v.string()), // "1D", "7D", "30D"
  },
  handler: async (ctx, args) => {
    const period = args.period || "7D";
    const timeRange = getTimeRangeMs(period);
    const startTime = Date.now() - timeRange;
    
    const searchEvents = await ctx.runQuery(internal.search.getSearchEvents, {
      startTime,
    });
    
    return {
      totalSearches: searchEvents.length,
      uniqueCompanies: new Set(searchEvents.map((e: any) => e.company_id)).size,
      sourceBreakdown: groupBySource(searchEvents),
      timeline: groupSearchEventsByDay(searchEvents),
    };
  },
});

// Internal query to get search events
export const getSearchEvents = internalQuery({
  args: {
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("event_log")
      .filter((q) => 
        q.and(
          q.eq(q.field("event_type"), "search_add"),
          q.gte(q.field("_creationTime"), args.startTime)
        )
      )
      .collect();
    
    return events;
  },
});

// Utility functions
function normalizeWebsiteUrl(url: string): string {
  try {
    // Remove protocol and www
    const normalized = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, ''); // Remove trailing slash
    
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function getTimeRangeMs(period: string): number {
  switch (period) {
    case "1D": return 24 * 60 * 60 * 1000;
    case "7D": return 7 * 24 * 60 * 60 * 1000;
    case "30D": return 30 * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

function groupBySource(events: any[]): Record<string, number> {
  const groups: Record<string, number> = {};
  
  events.forEach(event => {
    const source = event.metadata?.source || 'unknown';
    groups[source] = (groups[source] || 0) + 1;
  });
  
  return groups;
}

function groupSearchEventsByDay(events: any[]): Array<{ date: string; count: number }> {
  const groups: Record<string, number> = {};
  
  events.forEach(event => {
    const date = new Date(event._creationTime).toISOString().split('T')[0];
    groups[date] = (groups[date] || 0) + 1;
  });
  
  return Object.entries(groups)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
} 