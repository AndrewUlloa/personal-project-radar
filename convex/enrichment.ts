import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
// @ts-ignore - EXA SDK may not have perfect Convex compatibility
import Exa from "exa-js";

// Main public action to enrich a company by website URL
export const enrichCompany = action({
  args: {
    websiteUrl: v.string(),
    companyName: v.optional(v.string()),
    discoverySource: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"companies">> => {
    console.log(`🔍 Starting enrichment for: ${args.websiteUrl}`);
    
    // Check if company already exists
    const existingCompany = await ctx.runQuery(
      internal.enrichment.getCompanyByWebsite,
      { website: args.websiteUrl }
    );

    if (existingCompany) {
      throw new Error(`Company ${args.websiteUrl} already exists in database`);
    }

    // Create initial company record
    const companyId: Id<"companies"> = await ctx.runMutation(
      internal.enrichment.createInitialCompany,
      {
        websiteUrl: args.websiteUrl,
        companyName: args.companyName,
        discoverySource: args.discoverySource || 'manual',
      }
    );

    // Schedule comprehensive enrichment
    await ctx.scheduler.runAfter(
      0,
      internal.enrichment.performComprehensiveEnrichment,
      {
        companyId,
        websiteUrl: args.websiteUrl,
      }
    );

    return companyId;
  },
});

// Internal action that performs all enrichment tasks in parallel
export const performComprehensiveEnrichment = internalAction({
  args: {
    companyId: v.id("companies"),
    websiteUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`📊 Enriching company ${args.companyId} from ${args.websiteUrl}`);
    
    try {
      // Initialize EXA client
      const EXA_API_KEY = process.env.EXA_API_KEY;
      if (!EXA_API_KEY) {
        throw new Error("EXA_API_KEY not configured");
      }

      // Dynamically import Exa (since it might not be available in Convex runtime)
      // We'll use fetch directly to call EXA API
      
      // Parallel enrichment calls - following your existing API patterns
      const enrichmentPromises = await Promise.allSettled([
        // Core company data
        scrapeWebsiteContent(args.websiteUrl, EXA_API_KEY),
        fetchCrunchbaseData(args.websiteUrl, EXA_API_KEY),
        fetchFundingData(args.websiteUrl, EXA_API_KEY),
        
        // Additional data sources
        fetchLinkedInData(args.websiteUrl, EXA_API_KEY),
        fetchPitchBookData(args.websiteUrl, EXA_API_KEY),
        fetchTracxnData(args.websiteUrl, EXA_API_KEY),
        
        // News and social
        fetchNewsData(args.websiteUrl, EXA_API_KEY),
        fetchTwitterData(args.websiteUrl, EXA_API_KEY),
        fetchRedditData(args.websiteUrl, EXA_API_KEY),
        
        // Other sources
        fetchGitHubData(args.websiteUrl, EXA_API_KEY),
        fetchWikipediaData(args.websiteUrl, EXA_API_KEY),
        fetchYouTubeData(args.websiteUrl, EXA_API_KEY),
      ]);

      // Process results and save to database
      const enrichmentResults = enrichmentPromises.map((result, index) => {
        const sources = [
          'website_content', 'crunchbase', 'funding', 'linkedin', 
          'pitchbook', 'tracxn', 'news', 'twitter', 'reddit',
          'github', 'wikipedia', 'youtube'
        ];
        
        const enrichmentResult = {
          source: sources[index],
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : {},
          error: result.status === 'rejected' ? (result.reason?.message || 'Unknown error') : undefined,
        };

        // Debug logging for key sources
        if (['website_content', 'linkedin', 'crunchbase', 'funding'].includes(sources[index])) {
          console.log(`📊 ${sources[index]} enrichment result:`, {
            status: enrichmentResult.status,
            hasData: !!enrichmentResult.data,
            dataLength: Array.isArray(enrichmentResult.data) ? enrichmentResult.data.length : 'not array',
            firstItemKeys: enrichmentResult.data?.[0] ? Object.keys(enrichmentResult.data[0]) : 'no first item',
            error: enrichmentResult.error
          });
        }

        return enrichmentResult;
      });

      // Save all enrichment data
      await ctx.runMutation(internal.enrichment.saveEnrichmentResults, {
        companyId: args.companyId,
        results: enrichmentResults,
      });

      // Schedule AI scoring after enrichment
      await ctx.scheduler.runAfter(
        1000, // 1 second delay to ensure data is saved
        internal.scoring.scoreLead,
        { companyId: args.companyId }
      );

      console.log(`✅ Enrichment completed for company ${args.companyId}`);
      
    } catch (error) {
      console.error(`❌ Enrichment failed for company ${args.companyId}:`, error);
      
      // Log the error
      await ctx.runMutation(internal.enrichment.logEnrichmentError, {
        companyId: args.companyId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  },
});

// Internal query to check if company exists
export const getCompanyByWebsite = internalQuery({
  args: { website: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_website", (q) => q.eq("website", args.website))
      .first();
  },
});

// Internal mutation to create initial company record
export const createInitialCompany = internalMutation({
  args: {
    websiteUrl: v.string(),
    companyName: v.optional(v.string()),
    discoverySource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Extract company name from URL if not provided
    const companyName = args.companyName || extractCompanyNameFromUrl(args.websiteUrl);
    
    const companyId = await ctx.db.insert("companies", {
      company_name: companyName,
      website: args.websiteUrl,
      status: "new",
      discovery_source: args.discoverySource || 'manual',
      last_activity_description: "Lead discovered and enrichment started",
      last_activity_timestamp: Date.now(),
    });

    // Log the discovery event
    await ctx.db.insert("event_log", {
      company_id: companyId,
      event_type: "lead_discovered",
      description: `Company ${companyName} discovered from ${args.websiteUrl}`,
      metadata: { websiteUrl: args.websiteUrl },
    });

    return companyId;
  },
});

// Internal mutation to save enrichment results
export const saveEnrichmentResults = internalMutation({
  args: {
    companyId: v.id("companies"),
    results: v.array(v.object({
      source: v.string(),
      status: v.string(),
      data: v.any(),
      error: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Save raw enrichment data for each source
    for (const result of args.results) {
      await ctx.db.insert("raw_enrichment", {
        company_id: args.companyId,
        source: result.source,
        json_payload: JSON.stringify(result.data || {}),
        fetched_at: Date.now(),
        status: result.status === 'fulfilled' ? 'success' : 'failed',
        error_message: result.error,
      });
    }

    // Process successful results to extract company information
    const successfulResults = args.results.filter(r => r.status === 'fulfilled' && r.data);
    
    // Extract and update company information from enrichment data
    const updates = await extractCompanyUpdates(successfulResults);
    
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.companyId, {
        ...updates,
        last_activity_description: "Enrichment data processed",
        last_activity_timestamp: Date.now(),
      });
    }

    // Log enrichment completion event
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "enrichment_completed",
      description: `Enrichment completed with ${successfulResults.length} successful sources`,
      metadata: {
        totalSources: args.results.length,
        successfulSources: successfulResults.length,
        sources: args.results.map(r => ({ source: r.source, status: r.status })),
      },
    });
  },
});

// Internal mutation to log enrichment errors
export const logEnrichmentError = internalMutation({
  args: {
    companyId: v.id("companies"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    // Update company status
    await ctx.db.patch(args.companyId, {
      last_activity_description: `Enrichment failed: ${args.error}`,
      last_activity_timestamp: Date.now(),
    });

    // Log error event
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "enrichment_error",
      description: "Enrichment process failed",
      metadata: { error: args.error },
    });
  },
});

// Helper function to extract company name from URL
function extractCompanyNameFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    // Remove www. and TLD
    return domain
      .replace(/^www\./, '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return 'Unknown Company';
  }
}

// Helper function to extract company information from enrichment results
async function extractCompanyUpdates(results: Array<{ source: string; data: any }>) {
  const updates: any = {};
  let extractedData: any = {};

  // First pass: collect all data from different sources
  for (const result of results) {
    const { source, data } = result;
    
    if (!data) continue;
    
    // Handle both array and object data structures
    const sourceData = Array.isArray(data) ? data[0] : data;
    if (!sourceData) continue;
    
    extractedData[source] = sourceData;
  }

  // Second pass: extract structured information with priority order
  
  // Industry extraction (priority: crunchbase -> linkedin -> website -> other)
  if (!updates.industry) {
    const industry = extractIndustryFromSources(extractedData);
    if (industry && industry !== 'Unknown') {
      updates.industry = industry;
    }
  }

  // Location/geo_market extraction (priority: crunchbase -> linkedin -> website)
  if (!updates.geo_market) {
    const location = extractLocationFromSources(extractedData);
    if (location && location !== 'Unknown') {
      updates.geo_market = location;
    }
  }

  // Employee size extraction (priority: linkedin -> crunchbase -> website)
  if (!updates.employee_range && !updates.size_fte) {
    const employeeInfo = extractEmployeeSizeFromSources(extractedData);
    if (employeeInfo.range && employeeInfo.range !== 'Unknown') {
      updates.employee_range = employeeInfo.range;
      updates.size_fte = employeeInfo.midpoint;
    }
  }

  // Description extraction (priority: website -> crunchbase -> linkedin)
  if (!updates.description) {
    if (extractedData.website_content?.summary) {
      updates.description = extractedData.website_content.summary;
    } else if (extractedData.crunchbase?.text) {
      updates.description = extractedData.crunchbase.text.substring(0, 200) + '...';
    } else if (extractedData.linkedin?.text) {
      updates.description = extractedData.linkedin.text.substring(0, 200) + '...';
    }
  }

  // Founded year extraction
  if (!updates.founded) {
    const founded = extractFoundedYearFromSources(extractedData);
    if (founded) {
      updates.founded = founded;
    }
  }

  // Address extraction
  if (!updates.address) {
    const address = extractAddressFromSources(extractedData);
    if (address && address !== 'Unknown') {
      updates.address = address;
    }
  }

  // ARPU band estimation (from funding data)
  if (!updates.arpu_band && extractedData.funding?.summary && extractedData.funding.summary !== 'NO') {
    updates.arpu_band = estimateArpuFromFunding(extractedData.funding.summary);
  }

  console.log(`📊 Extracted company updates:`, updates);
  return updates;
}

// Helper function to extract industry from multiple sources
function extractIndustryFromSources(sources: any): string {
  // Priority order: crunchbase -> linkedin -> website -> other
  const searchOrder = ['crunchbase', 'linkedin', 'website_content', 'pitchbook', 'tracxn'];
  
  for (const source of searchOrder) {
    if (sources[source]) {
      const data = sources[source];
      let textToAnalyze = '';
      
      // Combine title and text for analysis
      if (data.title) textToAnalyze += data.title + ' ';
      if (data.text) textToAnalyze += data.text.substring(0, 500) + ' ';
      if (data.summary) textToAnalyze += data.summary + ' ';
      
      if (textToAnalyze) {
        const industry = extractIndustryFromText(textToAnalyze);
        if (industry !== 'Unknown') return industry;
      }
    }
  }
  
  return 'Unknown';
}

// Helper function to extract location from multiple sources
function extractLocationFromSources(sources: any): string {
  // Priority order: crunchbase -> linkedin -> website
  const searchOrder = ['crunchbase', 'linkedin', 'website_content'];
  
  for (const source of searchOrder) {
    if (sources[source]) {
      const data = sources[source];
      let textToAnalyze = '';
      
      if (data.title) textToAnalyze += data.title + ' ';
      if (data.text) textToAnalyze += data.text.substring(0, 1000) + ' ';
      
      if (textToAnalyze) {
        const location = extractLocationFromText(textToAnalyze);
        if (location !== 'Unknown') return location;
      }
    }
  }
  
  return 'Unknown';
}

// Helper function to extract employee size from multiple sources
function extractEmployeeSizeFromSources(sources: any): { range: string; midpoint: number } {
  // Priority order: linkedin -> crunchbase -> website
  const searchOrder = ['linkedin', 'crunchbase', 'website_content'];
  
  for (const source of searchOrder) {
    if (sources[source]) {
      const data = sources[source];
      let textToAnalyze = '';
      
      if (data.title) textToAnalyze += data.title + ' ';
      if (data.text) textToAnalyze += data.text.substring(0, 1000) + ' ';
      
      if (textToAnalyze) {
        const employeeInfo = extractEmployeeSizeFromText(textToAnalyze);
        if (employeeInfo.range !== 'Unknown') return employeeInfo;
      }
    }
  }
  
  return { range: 'Unknown', midpoint: 0 };
}

// Helper function to extract founded year from multiple sources
function extractFoundedYearFromSources(sources: any): number | null {
  const searchOrder = ['crunchbase', 'linkedin', 'website_content'];
  
  for (const source of searchOrder) {
    if (sources[source]) {
      const data = sources[source];
      let textToAnalyze = '';
      
      if (data.title) textToAnalyze += data.title + ' ';
      if (data.text) textToAnalyze += data.text.substring(0, 1000) + ' ';
      
      if (textToAnalyze) {
        const founded = extractFoundedYearFromText(textToAnalyze);
        if (founded) return founded;
      }
    }
  }
  
  return null;
}

// Helper function to extract address from multiple sources
function extractAddressFromSources(sources: any): string {
  const searchOrder = ['crunchbase', 'linkedin', 'website_content'];
  
  for (const source of searchOrder) {
    if (sources[source]) {
      const data = sources[source];
      let textToAnalyze = '';
      
      if (data.title) textToAnalyze += data.title + ' ';
      if (data.text) textToAnalyze += data.text.substring(0, 1000) + ' ';
      
      if (textToAnalyze) {
        const address = extractAddressFromText(textToAnalyze);
        if (address !== 'Unknown') return address;
      }
    }
  }
  
  return 'Unknown';
}

// Enhanced industry extraction with better keyword matching
function extractIndustryFromText(text: string): string {
  const industryKeywords = {
    'Jewelry & Luxury': ['jewelry', 'jewellery', 'diamond', 'engagement ring', 'wedding ring', 'luxury jewelry', 'fine jewelry', 'precious metals', 'gemstone'],
    'E-commerce & Retail': ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'online store', 'shopping', 'merchandise'],
    'Software & Technology': ['software', 'saas', 'platform', 'app', 'tech', 'technology', 'digital', 'analytics', 'cloud'],
    'Financial Services': ['fintech', 'finance', 'payment', 'banking', 'financial', 'investment', 'insurance'],
    'Healthcare': ['healthcare', 'medical', 'health', 'pharmaceutical', 'biotech', 'clinic'],
    'Education': ['education', 'learning', 'edtech', 'training', 'university', 'school'],
    'Manufacturing': ['manufacturing', 'production', 'factory', 'industrial', 'automotive'],
    'Real Estate': ['real estate', 'property', 'construction', 'housing'],
    'Food & Beverage': ['food', 'restaurant', 'beverage', 'culinary', 'hospitality'],
    'Fashion & Apparel': ['fashion', 'apparel', 'clothing', 'textile', 'design'],
  };

  const lowercaseText = text.toLowerCase();
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => lowercaseText.includes(keyword))) {
      return industry;
    }
  }
  
  return 'Unknown';
}

// Extract location/geo market from text
function extractLocationFromText(text: string): string {
  const locationPatterns = [
    // US states and cities
    /\b(New York|California|Texas|Florida|Illinois|Pennsylvania|Ohio|Georgia|North Carolina|Michigan|SF|San Francisco|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|Austin|NYC)\b/i,
    // Countries
    /\b(United States|USA|US|United Kingdom|UK|Canada|Australia|Germany|France|Japan|Singapore|Netherlands|Sweden|Denmark)\b/i,
    // Regions
    /\b(North America|Europe|EMEA|APAC|Asia Pacific)\b/i,
    // Common location phrases
    /\bbased in ([^,\n]+)/i,
    /\bheadquartered in ([^,\n]+)/i,
    /\blocated in ([^,\n]+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return 'Unknown';
}

// Extract employee size from text
function extractEmployeeSizeFromText(text: string): { range: string; midpoint: number } {
  const sizePatterns = [
    { pattern: /\b(\d+)-(\d+)\s*employees?\b/i, type: 'range' },
    { pattern: /\b(\d+)\+?\s*employees?\b/i, type: 'minimum' },
    { pattern: /\bteam of (\d+)-(\d+)\b/i, type: 'range' },
    { pattern: /\b(\d+)\s*-\s*(\d+)\s*people\b/i, type: 'range' },
    { pattern: /\bover (\d+)\s*employees?\b/i, type: 'minimum' },
  ];

  for (const { pattern, type } of sizePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (type === 'range' && match[2]) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        const midpoint = Math.floor((min + max) / 2);
        return { range: `${min}-${max}`, midpoint };
      } else if (type === 'minimum') {
        const min = parseInt(match[1]);
        // Estimate range based on minimum
        if (min < 10) return { range: '1-10', midpoint: 5 };
        if (min < 50) return { range: '11-50', midpoint: 30 };
        if (min < 200) return { range: '51-200', midpoint: 125 };
        if (min < 1000) return { range: '201-1K', midpoint: 600 };
        return { range: '1K+', midpoint: 1500 };
      }
    }
  }

  // Check for company size keywords
  const sizeKeywords = {
    'startup': { range: '1-10', midpoint: 5 },
    'small business': { range: '1-50', midpoint: 25 },
    'mid-size': { range: '51-200', midpoint: 125 },
    'enterprise': { range: '201-1K', midpoint: 600 },
    'large corporation': { range: '1K+', midpoint: 1500 },
  };

  const lowercaseText = text.toLowerCase();
  for (const [keyword, size] of Object.entries(sizeKeywords)) {
    if (lowercaseText.includes(keyword)) {
      return size;
    }
  }
  
  return { range: 'Unknown', midpoint: 0 };
}

// Extract founded year from text
function extractFoundedYearFromText(text: string): number | null {
  const yearPatterns = [
    /\bfounded in (\d{4})\b/i,
    /\bestablished in (\d{4})\b/i,
    /\bstarted in (\d{4})\b/i,
    /\bsince (\d{4})\b/i,
    /\b(\d{4})\s*-\s*present\b/i,
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1800 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  }
  
  return null;
}

// Extract address from text
function extractAddressFromText(text: string): string {
  const addressPatterns = [
    /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b[^,\n]*/i,
    /\b[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/i, // City, State ZIP
    /\b[A-Za-z\s]+,\s*[A-Za-z\s]+\s*\d{5}/i, // City, State ZIP (full state name)
  ];

  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return 'Unknown';
}

// Estimate ARPU band from funding information
function estimateArpuFromFunding(fundingText: string): string {
  const lowercaseText = fundingText.toLowerCase();
  
  // Look for funding amounts
  const fundingPatterns = [
    /\$(\d+(?:\.\d+)?)\s*million/i,
    /\$(\d+(?:\.\d+)?)\s*m\b/i,
    /\$(\d+(?:\.\d+)?)\s*billion/i,
    /\$(\d+(?:\.\d+)?)\s*b\b/i,
  ];

  let totalFunding = 0;
  
  for (const pattern of fundingPatterns) {
    const matches = fundingText.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      for (const match of matches) {
        const amount = parseFloat(match.match(/(\d+(?:\.\d+)?)/)?.[1] || '0');
        if (match.toLowerCase().includes('billion') || match.toLowerCase().includes('b')) {
          totalFunding += amount * 1000; // Convert to millions
        } else {
          totalFunding += amount;
        }
      }
    }
  }

  // Estimate ARPU based on funding level
  if (totalFunding >= 100) return '$100K+'; // $100M+ funding
  if (totalFunding >= 20) return '$50-100K'; // $20M+ funding
  if (totalFunding >= 5) return '$10-50K'; // $5M+ funding
  return '$0-10K'; // Less than $5M or no significant funding
}



// Helper function to scrape website content (replaces /api/scrapewebsiteurl)
async function scrapeWebsiteContent(websiteUrl: string, apiKey: string) {
  try {
    const exa = new Exa(apiKey);
    const result = await exa.getContents([websiteUrl], {
      text: true,
      summary: {
        query: "Describe the company in few word. It should be very simple and explicity tell what does the company do/is. Do not include the name of the company."
      }
    });
    
    return result.results;
  } catch (error) {
    console.error('Website scraping failed:', error);
    throw new Error(`Website scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to fetch Crunchbase data (replaces /api/fetchcrunchbase)
async function fetchCrunchbaseData(websiteUrl: string, apiKey: string) {
  try {
    const exa = new Exa(apiKey);
    const result = await exa.searchAndContents(`${websiteUrl} crunchbase page:`, {
      type: "keyword",
      numResults: 1,
      includeDomains: ["crunchbase.com"],
      includeText: [websiteUrl],
      text: true
    });
    
    return result.results;
  } catch (error) {
    console.error('Crunchbase fetch failed:', error);
    throw new Error(`Crunchbase fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to fetch funding data (replaces /api/fetchfunding)
async function fetchFundingData(websiteUrl: string, apiKey: string) {
  try {
    const exa = new Exa(apiKey);
    const result = await exa.searchAndContents(`${websiteUrl} Funding:`, {
      type: "keyword",
      numResults: 1,
      text: true,
      summary: {
        query: "Tell me all about the funding (and if available, the valuation) of this company in detail. Do not tell me about the company, just give all the funding information in detail. If funding or valuation info is not preset, just reply with one word 'NO'."
      },
      livecrawl: "always",
      includeText: [websiteUrl]
    });
    
    return result.results;
  } catch (error) {
    console.error('Funding fetch failed:', error);
    throw new Error(`Funding fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to fetch LinkedIn data (replaces /api/scrapelinkedin)
async function fetchLinkedInData(websiteUrl: string, apiKey: string) {
  try {
    const exa = new Exa(apiKey);
    const result = await exa.searchAndContents(`${websiteUrl} company Linkedin profile:`, {
      text: true,
      numResults: 1,
      includeDomains: ["linkedin.com"]
    });
    
    return result.results;
  } catch (error) {
    console.error('LinkedIn fetch failed:', error);
    throw new Error(`LinkedIn fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to fetch PitchBook data (replaces /api/fetchpitchbook)
async function fetchPitchBookData(websiteUrl: string, apiKey: string) {
  try {
    const exa = new Exa(apiKey);
    const result = await exa.searchAndContents(`${websiteUrl} pitchbook page:`, {
      type: "keyword",
      numResults: 1,
      includeDomains: ["pitchbook.com"],
      includeText: [websiteUrl],
      text: true
    });
    
    return result.results;
  } catch (error) {
    console.error('PitchBook fetch failed:', error);
    throw new Error(`PitchBook fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to fetch Tracxn data (replaces /api/fetchtracxn)
async function fetchTracxnData(websiteUrl: string, apiKey: string) {
  try {
    const exa = new Exa(apiKey);
    const result = await exa.searchAndContents(`${websiteUrl} tracxn page:`, {
      type: "keyword",
      numResults: 1,
      includeDomains: ["tracxn.com"],
      includeText: [websiteUrl],
      text: true
    });
    
    return result.results;
  } catch (error) {
    console.error('Tracxn fetch failed:', error);
    throw new Error(`Tracxn fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to fetch news data (replaces /api/findnews)
async function fetchNewsData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} news`,
      type: "neural",
      numResults: 5,
      useAutoprompt: true,
      excludeDomains: [websiteUrl]
    }),
  });

  if (!response.ok) {
    throw new Error(`News fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch Twitter data (replaces /api/scraperecenttweets)
async function fetchTwitterData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} twitter tweet`,
      type: "neural",
      numResults: 3,
      includeDomains: ["twitter.com", "x.com"]
    }),
  });

  if (!response.ok) {
    throw new Error(`Twitter fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch Reddit data (replaces /api/scrapereddit)
async function fetchRedditData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} reddit discussion`,
      type: "neural",
      numResults: 3,
      includeDomains: ["reddit.com"]
    }),
  });

  if (!response.ok) {
    throw new Error(`Reddit fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch GitHub data (replaces /api/fetchgithuburl)
async function fetchGitHubData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} github repository`,
      type: "neural",
      numResults: 1,
      includeDomains: ["github.com"]
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch Wikipedia data (replaces /api/fetchwikipedia)
async function fetchWikipediaData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} wikipedia`,
      type: "neural",
      numResults: 1,
      includeDomains: ["wikipedia.org"]
    }),
  });

  if (!response.ok) {
    throw new Error(`Wikipedia fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch YouTube data (replaces /api/fetchyoutubevideos)
async function fetchYouTubeData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} youtube video`,
      type: "neural",
      numResults: 3,
      includeDomains: ["youtube.com"]
    }),
  });

  if (!response.ok) {
    throw new Error(`YouTube fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}