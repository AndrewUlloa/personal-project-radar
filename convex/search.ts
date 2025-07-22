import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Main search action that integrates with the SearchDockIcon component
export const searchAndAddCompany: any = action({
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

    // Create initial company record
    const companyId = await ctx.runMutation(internal.enrichment.createInitialCompany, {
      companyName: args.companyName,
      websiteUrl: args.website,
      discoverySource: args.source || 'search',
    });

    // Trigger enrichment in background
    try {
      await ctx.runAction(internal.enrichment.performComprehensiveEnrichment, {
        websiteUrl: args.website,
        companyId: companyId,
      });
    } catch (error) {
      console.error("Enrichment failed:", error);
    }

    return {
      companyId: companyId,
      isNew: true,
    };
  },
});

// Search suggestions based on partial input
export const getSearchSuggestions: any = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    // Simple suggestions for now
    const suggestions = [
      { type: "company", value: args.query + " company", description: "Search for companies" },
      { type: "industry", value: args.query + " industry", description: "Industry analysis" },
      { type: "market", value: args.query + " market", description: "Market research" },
    ];

    return suggestions.slice(0, limit);
  },
});

// Internal helpers
export const checkExisting = internalQuery({
  args: { website: v.string() },
  handler: async (ctx, args) => {
    const normalized = normalizeWebsite(args.website);
    return await ctx.db
      .query("companies")
      .withIndex("by_website", (q) => q.eq("website", normalized))
      .first();
  },
});

export const searchExistingCompanies = internalQuery({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const query = args.query.toLowerCase();
    
    const companies = await ctx.db.query("companies").collect();
    
    return companies
      .filter(company => 
        company.company_name.toLowerCase().includes(query) ||
        (company.website && company.website.toLowerCase().includes(query))
      )
      .slice(0, limit);
  },
});

// Analytics for search performance
export const getSearchAnalytics: any = action({
  args: {
    period: v.optional(v.string()), // "1D", "7D", "30D"
  },
  handler: async (ctx, args) => {
    // Simple analytics return for now
    return {
      totalSearches: 0,
      successfulAdds: 0,
      duplicateAttempts: 0,
      period: args.period || "7D",
    };
  },
});

// Utility functions
function normalizeWebsite(website: string): string {
  // Remove protocol, www, and trailing slashes
  return website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .toLowerCase();
} 