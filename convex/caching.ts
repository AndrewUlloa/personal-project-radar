import { internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Cache management utilities
export const setCacheItem = internalMutation({
  args: {
    key: v.string(),
    data: v.any(),
    ttlSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ttl = args.ttlSeconds || 300; // Default 5 minutes
    const expires = Date.now() + (ttl * 1000);
    
    // Delete existing cache entry
    const existing = await ctx.db
      .query("cache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    
    // Insert new cache entry
    await ctx.db.insert("cache", {
      key: args.key,
      data: args.data,
      expires,
      created_at: Date.now(),
    });
  },
});

export const getCacheItem = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("cache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    if (!item) return null;
    
    // Check if expired
    if (item.expires < Date.now()) {
      // Delete expired item
      await ctx.db.delete(item._id);
      return null;
    }
    
    return item.data;
  },
});

// Cache cleanup job
export const cleanupExpiredCache = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredItems = await ctx.db
      .query("cache")
      .withIndex("by_expires", (q) => q.lt("expires", now))
      .collect();
    
    for (const item of expiredItems) {
      await ctx.db.delete(item._id);
    }
    
    return { deletedCount: expiredItems.length };
  },
});

// Optimized dashboard queries with caching
export const getCachedDashboardData = query({
  args: {
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const cacheKey = "dashboard_overview";
    
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(internal.caching.getCacheItem, { key: cacheKey });
      if (cached) return cached;
    }
    
    // Compute fresh data
    const [companies, events, queueItems] = await Promise.all([
      ctx.db.query("companies").collect(),
      ctx.db.query("event_log").collect(),
      ctx.db.query("discovery_queue").collect(),
    ]);
    
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const data = {
      totalCompanies: companies.length,
      companiesLast24h: companies.filter(c => c._creationTime > dayAgo).length,
      companiesLastWeek: companies.filter(c => c._creationTime > weekAgo).length,
      avgLeadScore: companies.length > 0 
        ? companies.reduce((sum, c) => sum + (c.lead_score || 0), 0) / companies.length 
        : 0,
      highPriorityLeads: companies.filter(c => (c.lead_score || 0) >= 80).length,
      pendingQueue: queueItems.filter(q => q.status === 'pending').length,
      recentEvents: events.slice(-10),
      scoreDistribution: {
        high: companies.filter(c => (c.lead_score || 0) >= 80).length,
        medium: companies.filter(c => (c.lead_score || 0) >= 50 && (c.lead_score || 0) < 80).length,
        low: companies.filter(c => (c.lead_score || 0) < 50).length,
      },
      generatedAt: now,
    };
    
    // Cache for 5 minutes
    await ctx.runMutation(internal.caching.setCacheItem, {
      key: cacheKey,
      data,
      ttlSeconds: 300,
    });
    
    return data;
  },
});

// Optimized company search with pagination
export const searchCompaniesOptimized = query({
  args: {
    query: v.optional(v.string()),
    minScore: v.optional(v.number()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 100); // Max 100 items
    const offset = args.offset || 0;
    
    // Build cache key for this query
    const cacheKey = `search_${JSON.stringify(args)}`;
    
    // Try cache first
    const cached = await ctx.runQuery(internal.caching.getCacheItem, { key: cacheKey });
    if (cached) return cached;
    
    // Build optimized query
    let query = ctx.db.query("companies");
    
    // Apply filters efficiently
    if (args.minScore !== undefined) {
      query = query.withIndex("by_lead_score", (q) => q.gte("lead_score", args.minScore!));
    }
    
    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    }
    
    let companies = await query.collect();
    
    // Apply text search if needed (post-filter for now)
    if (args.query) {
      const searchTerm = args.query.toLowerCase();
      companies = companies.filter(c => 
        c.company_name.toLowerCase().includes(searchTerm) ||
        (c.website && c.website.toLowerCase().includes(searchTerm)) ||
        (c.industry && c.industry.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply pagination
    const total = companies.length;
    const paginatedCompanies = companies.slice(offset, offset + limit);
    
    const result = {
      companies: paginatedCompanies,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
    };
    
    // Cache for 2 minutes
    await ctx.runMutation(internal.caching.setCacheItem, {
      key: cacheKey,
      data: result,
      ttlSeconds: 120,
    });
    
    return result;
  },
});

// Performance-optimized analytics
export const getAnalytics = query({
  args: {
    period: v.optional(v.string()), // 'day', 'week', 'month'
  },
  handler: async (ctx, args) => {
    const period = args.period || 'week';
    const cacheKey = `analytics_${period}`;
    
    // Try cache first (cache analytics for longer since they're expensive)
    const cached = await ctx.runQuery(internal.caching.getCacheItem, { key: cacheKey });
    if (cached) return cached;
    
    const now = Date.now();
    let periodStart: number;
    
    switch (period) {
      case 'day':
        periodStart = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        periodStart = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = now - (7 * 24 * 60 * 60 * 1000);
    }
    
    // Fetch all data in parallel
    const [companies, events, performanceLogs] = await Promise.all([
      ctx.db.query("companies").collect(),
      ctx.db.query("event_log").collect(),
      ctx.db.query("performance_logs").collect(),
    ]);
    
    // Filter by period
    const periodCompanies = companies.filter(c => c._creationTime >= periodStart);
    const periodEvents = events.filter(e => e._creationTime >= periodStart);
    const periodLogs = performanceLogs.filter(l => l._creationTime >= periodStart);
    
    // Calculate metrics
    const analytics = {
      period,
      periodStart,
      companies: {
        total: periodCompanies.length,
        bySource: periodCompanies.reduce((acc, c) => {
          const source = c.discovery_source || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        avgScore: periodCompanies.length > 0 
          ? periodCompanies.reduce((sum, c) => sum + (c.lead_score || 0), 0) / periodCompanies.length 
          : 0,
      },
      events: {
        total: periodEvents.length,
        byType: periodEvents.reduce((acc, e) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      performance: {
        totalOperations: periodLogs.length,
        successRate: periodLogs.length > 0 
          ? (periodLogs.filter(l => l.success).length / periodLogs.length) * 100 
          : 100,
        avgDuration: periodLogs.length > 0 
          ? periodLogs.reduce((sum, l) => sum + l.duration, 0) / periodLogs.length 
          : 0,
      },
      generatedAt: now,
    };
    
    // Cache for 10 minutes for analytics
    await ctx.runMutation(internal.caching.setCacheItem, {
      key: cacheKey,
      data: analytics,
      ttlSeconds: 600,
    });
    
    return analytics;
  },
});

// Database optimization utilities
export const getTableStats = query({
  handler: async (ctx) => {
    const [companies, events, enrichment, queue, perfLogs, cache] = await Promise.all([
      ctx.db.query("companies").collect(),
      ctx.db.query("event_log").collect(),
      ctx.db.query("raw_enrichment").collect(),
      ctx.db.query("discovery_queue").collect(),
      ctx.db.query("performance_logs").collect(),
      ctx.db.query("cache").collect(),
    ]);
    
    return {
      companies: {
        count: companies.length,
        avgSize: companies.length > 0 ? JSON.stringify(companies[0]).length : 0,
        withScores: companies.filter(c => c.lead_score !== undefined).length,
      },
      events: {
        count: events.length,
        avgSize: events.length > 0 ? JSON.stringify(events[0]).length : 0,
      },
      enrichment: {
        count: enrichment.length,
        avgSize: enrichment.length > 0 ? enrichment[0].json_payload.length : 0,
        totalSize: enrichment.reduce((sum, e) => sum + e.json_payload.length, 0),
      },
      queue: {
        count: queue.length,
        pending: queue.filter(q => q.status === 'pending').length,
        failed: queue.filter(q => q.status === 'failed').length,
      },
      performance: {
        count: perfLogs.length,
        last24h: perfLogs.filter(l => l._creationTime > Date.now() - 24 * 60 * 60 * 1000).length,
      },
      cache: {
        count: cache.length,
        expired: cache.filter(c => c.expires < Date.now()).length,
        totalSize: cache.reduce((sum, c) => sum + JSON.stringify(c.data).length, 0),
      },
    };
  },
}); 