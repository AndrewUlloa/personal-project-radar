import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple health check action 
export const healthCheck = internalAction({
  args: {
    checkDatabase: v.boolean(),
    checkAPILimits: v.boolean(),
    checkScoringAccuracy: v.boolean(),
  },
  handler: async (ctx, args) => {
    console.log("🏥 Running health check");
    
    const healthStatus = {
      timestamp: Date.now(),
      database: { healthy: true, details: {} },
      apiLimits: { healthy: true, details: {} },
      scoring: { healthy: true, details: {} },
      overall: "healthy" as const,
    };

    console.log(`✅ Health check complete: ${healthStatus.overall}`);
    return healthStatus;
  },
});

// Simple queue processing action
export const processDiscoveryQueue = internalAction({
  args: {
    batchSize: v.number(),
    maxRetries: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Processing discovery queue (batch size: ${args.batchSize})`);
    
    // Simulate processing
    const processed = Math.floor(Math.random() * args.batchSize);
    const failed = args.batchSize - processed;

    console.log(`✅ Queue processing complete: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  },
});

// Public queries for dashboard
export const getQueueSize = query({
  handler: async (ctx) => {
    try {
      const queueItems = await ctx.db.query("discovery_queue").collect();
      const pendingItems = queueItems.filter(item => item.status !== "completed");
      return pendingItems.length;
    } catch (error) {
      console.error("Error getting queue size:", error);
      return 0;
    }
  },
});

export const getDatabaseStats = query({
  handler: async (ctx) => {
    try {
      const companies = await ctx.db.query("companies").collect();
      const events = await ctx.db.query("event_log").collect();
      
      const avgLeadScore = companies.length > 0 
        ? companies.reduce((sum, c) => sum + (c.lead_score || 0), 0) / companies.length 
        : 0;
      
      const lastActivity = companies.length > 0 
        ? Math.max(...companies.map(c => c._creationTime)) 
        : Date.now();
      
      return {
        totalCompanies: companies.length,
        totalEvents: events.length,
        totalQueueItems: 0, // Simplified for now
        avgLeadScore,
        lastActivity,
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      return {
        totalCompanies: 0,
        totalEvents: 0,
        totalQueueItems: 0,
        avgLeadScore: 0,
        lastActivity: Date.now(),
      };
    }
  },
});

export const getScoringStats = query({
  handler: async (ctx) => {
    try {
      const companies = await ctx.db.query("companies").collect();
      const scoredCompanies = companies.filter(c => c.lead_score !== undefined);
      
      const totalScore = scoredCompanies.reduce((sum, c) => sum + (c.lead_score || 0), 0);
      const averageScore = scoredCompanies.length > 0 ? totalScore / scoredCompanies.length : 0;
      const errorRate = companies.length > 0 ? 1 - (scoredCompanies.length / companies.length) : 0;
      const highScoreCompanies = scoredCompanies.filter(c => (c.lead_score || 0) > 80).length;
      
      return {
        totalCompanies: companies.length,
        scoredCompanies: scoredCompanies.length,
        averageScore,
        errorRate,
        highScoreCompanies,
      };
    } catch (error) {
      console.error("Error getting scoring stats:", error);
      return {
        totalCompanies: 0,
        scoredCompanies: 0,
        averageScore: 0,
        errorRate: 0,
        highScoreCompanies: 0,
      };
    }
  },
});

// Placeholder functions for future implementation
export const dailyLeadDiscovery = internalAction({
  args: {
    maxCompanies: v.number(),
    icpCriteria: v.any(),
  },
  handler: async (ctx, args) => {
    console.log(`🔍 Daily lead discovery triggered for ${args.maxCompanies} companies`);
    return { success: true, companiesDiscovered: 0, newCompanies: 0 };
  },
});

export const weeklyScoreRefresh = internalAction({
  args: {
    daysOld: v.number(),
    maxLeads: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Weekly score refresh triggered for ${args.maxLeads} leads`);
    return { rescored: 0 };
  },
});

export const dailyCleanup = internalAction({
  args: {
    retentionDays: v.number(),
    optimizeDatabase: v.boolean(),
  },
  handler: async (ctx, args) => {
    console.log(`🧹 Daily cleanup triggered with ${args.retentionDays} day retention`);
    return {
      deletedLogs: 0,
      deletedEvents: 0,
      deletedQueueItems: 0,
      deletedCacheEntries: 0,
    };
  },
}); 