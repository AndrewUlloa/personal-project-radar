import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Main public action to enrich a company by website URL
export const enrichCompany = action({
  args: {
    websiteUrl: v.string(),
    companyName: v.optional(v.string()),
    discoverySource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
    const companyId = await ctx.runMutation(
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
        
        return {
          source: sources[index],
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : {},
          error: result.status === 'rejected' ? (result.reason?.message || 'Unknown error') : undefined,
        };
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

  for (const result of results) {
    const { source, data } = result;
    
    if (!data || !Array.isArray(data)) continue;

    switch (source) {
      case 'website_content':
        if (data[0]?.summary) {
          updates.description = data[0].summary;
        }
        break;
        
      case 'linkedin':
        // Extract employee count, industry, etc. from LinkedIn data
        if (data[0]) {
          // This would need to be enhanced based on actual LinkedIn data structure
          const linkedinData = data[0];
          if (linkedinData.title) {
            updates.industry = extractIndustry(linkedinData.title);
          }
        }
        break;
        
      case 'funding':
        // Extract funding information
        if (data[0]?.summary && data[0].summary !== 'NO') {
          updates.arpu_band = estimateArpuFromFunding(data[0].summary);
        }
        break;
        
      case 'crunchbase':
        // Extract structured company data from Crunchbase
        if (data[0]) {
          const crunchbaseData = data[0];
          if (crunchbaseData.title) {
            updates.industry = extractIndustry(crunchbaseData.title);
          }
        }
        break;
    }
  }

  return updates;
}

// Helper function to extract industry from text
function extractIndustry(text: string): string {
  const industryKeywords = {
    'software': ['software', 'saas', 'platform', 'app', 'tech'],
    'ecommerce': ['ecommerce', 'retail', 'marketplace', 'store'],
    'fintech': ['fintech', 'finance', 'payment', 'banking'],
    'healthcare': ['healthcare', 'medical', 'health'],
    'education': ['education', 'learning', 'edtech'],
  };

  const lowercaseText = text.toLowerCase();
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => lowercaseText.includes(keyword))) {
      return industry;
    }
  }
  
  return 'Unknown';
}

// Helper function to estimate ARPU band from funding information
function estimateArpuFromFunding(fundingText: string): string {
  const lowercaseText = fundingText.toLowerCase();
  
  if (lowercaseText.includes('series a') || lowercaseText.includes('seed')) {
    return '$0-10K';
  } else if (lowercaseText.includes('series b')) {
    return '$10-50K';
  } else if (lowercaseText.includes('series c') || lowercaseText.includes('growth')) {
    return '$50-100K';
  } else if (lowercaseText.includes('ipo') || lowercaseText.includes('public')) {
    return '$100K+';
  }
  
  return '$0-10K'; // Default
}

// Helper function to scrape website content (replaces /api/scrapewebsiteurl)
async function scrapeWebsiteContent(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/contents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ids: [websiteUrl],
      text: true,
      summary: {
        query: "Describe the company in few word. It should be very simple and explicity tell what does the company do/is. Do not include the name of the company."
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Website scraping failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch Crunchbase data (replaces /api/fetchcrunchbase)
async function fetchCrunchbaseData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} crunchbase page:`,
      type: "keyword",
      numResults: 1,
      includeDomains: ["crunchbase.com"],
      includeText: [websiteUrl]
    }),
  });

  if (!response.ok) {
    throw new Error(`Crunchbase fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch funding data (replaces /api/fetchfunding)
async function fetchFundingData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/searchAndContents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} Funding:`,
      type: "keyword",
      numResults: 1,
      text: true,
      summary: {
        query: "Tell me all about the funding (and if available, the valuation) of this company in detail. Do not tell me about the company, just give all the funding information in detail. If funding or valuation info is not preset, just reply with one word 'NO'."
      },
      livecrawl: "always",
      includeText: [websiteUrl]
    }),
  });

  if (!response.ok) {
    throw new Error(`Funding fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch LinkedIn data (replaces /api/scrapelinkedin)
async function fetchLinkedInData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} linkedin page:`,
      type: "keyword",
      numResults: 1,
      includeDomains: ["linkedin.com"],
      includeText: [websiteUrl]
    }),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch PitchBook data (replaces /api/fetchpitchbook)
async function fetchPitchBookData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} pitchbook page:`,
      type: "keyword",
      numResults: 1,
      includeDomains: ["pitchbook.com"],
      includeText: [websiteUrl]
    }),
  });

  if (!response.ok) {
    throw new Error(`PitchBook fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Helper function to fetch Tracxn data (replaces /api/fetchtracxn)
async function fetchTracxnData(websiteUrl: string, apiKey: string) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `${websiteUrl} tracxn page:`,
      type: "keyword",
      numResults: 1,
      includeDomains: ["tracxn.com"],
      includeText: [websiteUrl]
    }),
  });

  if (!response.ok) {
    throw new Error(`Tracxn fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
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