import { action, internalQuery, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to normalize website URLs for storage
function normalizeWebsite(website: string): string {
  return website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

// Helper function to format website URLs for Exa API calls
function formatWebsiteForExa(website: string): string {
  // Remove any existing protocol and www
  let cleanUrl = website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  
  // Add https://www. for optimal Exa results
  return `https://www.${cleanUrl}`;
}

// Internal mutation to create a company
export const createCompany = internalMutation({
  args: {
    companyName: v.string(),
    website: v.string(),
    discoverySource: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedWebsite = normalizeWebsite(args.website);
    
    // Check if already exists
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_website", (q) => q.eq("website", normalizedWebsite))
      .first();
    
    if (existing) {
      return { companyId: existing._id, isNew: false };
    }
    
    // Create new company
    const companyId = await ctx.db.insert("companies", {
      company_name: args.companyName,
      website: normalizedWebsite,
      lead_score: 0,
      status: "new",
      discovery_source: args.discoverySource,
    });
    
    // Log the event
    await ctx.db.insert("event_log", {
      company_id: companyId,
      event_type: "company_created",
      description: `Company created from ${args.discoverySource}`,
      metadata: {
        source: args.discoverySource,
        company_name: args.companyName,
        website: normalizedWebsite,
      },
    });
    
    return { companyId, isNew: true };
  },
});

// Internal mutation to add company to discovery queue
export const addToDiscoveryQueue = internalMutation({
  args: {
    companyId: v.id("companies"),
    companyName: v.string(),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already in queue by domain
    const normalizedWebsite = normalizeWebsite(args.website);
    const existing = await ctx.db
      .query("discovery_queue")
      .withIndex("by_domain", (q) => q.eq("domain", normalizedWebsite))
      .first();
    
    if (!existing) {
      await ctx.db.insert("discovery_queue", {
        domain: normalizedWebsite,
        company_name: args.companyName,
        status: "pending",
        scheduled_for: Date.now(),
        attempts: 0,
        priority: 1,
        source: "search",
      });
    }
  },
});

// Internal query to search existing companies
export const searchExistingCompaniesInternal = internalQuery({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const searchQuery = args.query.toLowerCase();
    
    const companies = await ctx.db.query("companies").collect();
    
    return companies
      .filter((company: any) => 
        company.company_name.toLowerCase().includes(searchQuery) ||
        (company.website && company.website.toLowerCase().includes(searchQuery))
      )
      .slice(0, limit)
      .map((company: any) => ({
        _id: company._id,
        company_name: company.company_name,
        website: company.website,
        lead_score: company.lead_score,
        status: company.status,
      }));
  },
});

// Main search action that integrates with the SearchDockIcon component
export const searchAndAddCompany = action({
  args: {
    companyName: v.string(),
    website: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ companyId: Id<"companies">; isNew: boolean }> => {
    console.log(`🔍 Search request: ${args.companyName} (${args.website})`);
    
    // First check if company already exists using createCompany mutation
    const result = await ctx.runMutation(internal.search.createCompany, {
      companyName: args.companyName,
      website: args.website,
      discoverySource: args.source || 'search',
    });
    
    if (!result.isNew) {
      console.log(`Company ${args.companyName} already exists`);
      return result;
    }
    
    // For new companies, trigger immediate enrichment instead of queueing
    try {
      // Format the website URL properly for Exa API calls
      const formattedWebsiteUrl = formatWebsiteForExa(args.website);
      
      await ctx.runAction(internal.enrichment.performComprehensiveEnrichment, {
        companyId: result.companyId,
        websiteUrl: formattedWebsiteUrl,
      });
      
      console.log(`✅ Company ${args.companyName} added and enrichment started immediately`);
    } catch (error) {
      console.error(`❌ Failed to start enrichment for ${args.companyName}:`, error);
      // Company was created but enrichment failed - still return success
      // The enrichment can be retried later via queue processing
    }
    
    return result;
  },
});

// Public query to search existing companies
export const searchExistingCompanies = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const searchQuery = args.query.toLowerCase();
    
    const companies = await ctx.db.query("companies").collect();
    
    return companies
      .filter(company => 
        company.company_name.toLowerCase().includes(searchQuery) ||
        (company.website && company.website.toLowerCase().includes(searchQuery))
      )
      .slice(0, limit)
      .map(company => ({
        _id: company._id,
        company_name: company.company_name,
        website: company.website,
        lead_score: company.lead_score,
        status: company.status,
      }));
  },
});

// Search suggestions action
export const getSearchSuggestions = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    type: "existing_company" | "new_search";
    value: string;
    description: string;
    data: any;
  }>> => {
    const limit = args.limit || 5;
    
    // Get existing companies that match
    const existingCompanies = await ctx.runQuery(internal.search.searchExistingCompaniesInternal, {
      query: args.query,
      limit: limit,
    });
    
    // Create suggestions from existing companies
    const suggestions: Array<{
      type: "existing_company" | "new_search";
      value: string;
      description: string;
      data: any;
    }> = existingCompanies.map((company: any) => ({
      type: "existing_company" as const,
      value: company.company_name,
      description: company.website || "Company in your Lead Radar",
      data: company,
    }));
    
    // Add generic search suggestion if space remains
    if (suggestions.length < limit && args.query.length > 2) {
      suggestions.push({
        type: "new_search" as const,
        value: args.query,
        description: "Search for new companies",
        data: null,
      });
    }
    
    return suggestions;
  },
});

// Analytics for search performance
export const getSearchAnalytics = query({
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    const recentCompanies = companies.filter(
      c => c._creationTime && c._creationTime > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    
    const searchSourced = companies.filter(c => c.discovery_source === 'search');
    const manualSourced = companies.filter(c => c.discovery_source === 'manual');
    
    return {
      totalCompanies: companies.length,
      recentAdds: recentCompanies.length,
      searchSourced: searchSourced.length,
      manualSourced: manualSourced.length,
      lastUpdated: Date.now(),
    };
  },
}); 