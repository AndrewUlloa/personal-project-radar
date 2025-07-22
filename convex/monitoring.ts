import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Performance monitoring utilities
export const logPerformance = internalMutation({
  args: {
    operation: v.string(),
    duration: v.number(),
    success: v.boolean(),
    metadata: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("performance_logs", {
      operation: args.operation,
      duration: args.duration,
      success: args.success,
      metadata: args.metadata,
      error_message: args.errorMessage,
    });
  },
});

// Get performance metrics for operations
export const getPerformanceMetrics = query({
  args: {
    operation: v.optional(v.string()),
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hoursBack || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    // Get all logs first, then filter in JavaScript
    const allLogs = await ctx.db.query("performance_logs").collect();
    
    // Filter by time and operation
    const logs = allLogs.filter(log => {
      const timeMatch = log._creationTime >= cutoffTime;
      const operationMatch = !args.operation || log.operation === args.operation;
      return timeMatch && operationMatch;
    });

    const successful = logs.filter(log => log.success).length;
    const failed = logs.length - successful;
    const successRate = logs.length > 0 ? (successful / logs.length) * 100 : 0;
    
    const durations = logs.map(log => log.duration);
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    return {
      operation: args.operation || 'all',
      hoursBack,
      totalRequests: logs.length,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration: Math.round(avgDuration * 100) / 100,
      recentLogs: logs.slice(0, 10).map(log => ({
        operation: log.operation,
        duration: log.duration,
        success: log.success,
        createdAt: log._creationTime,
      })),
    };
  },
});

// Get slow operations
export const getSlowOperations = query({
  args: {
    threshold: v.optional(v.number()),
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.threshold || 1000; // 1 second default
    const hoursBack = args.hoursBack || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    const allLogs = await ctx.db.query("performance_logs").collect();
    
    const slowOps = allLogs.filter(log => 
      log._creationTime >= cutoffTime && 
      log.duration >= threshold
    );

    // Group by operation
    const grouped = slowOps.reduce((acc, op) => {
      if (!acc[op.operation]) {
        acc[op.operation] = {
          operation: op.operation,
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
        };
      }
      
      acc[op.operation].count++;
      acc[op.operation].totalDuration += op.duration;
      acc[op.operation].maxDuration = Math.max(acc[op.operation].maxDuration, op.duration);
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((group: any) => ({
      operation: group.operation,
      count: group.count,
      avgDuration: Math.round(group.totalDuration / group.count * 100) / 100,
      maxDuration: group.maxDuration,
    }));
  },
});

// System health overview
export const getSystemHealth = query({
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const allLogs = await ctx.db.query("performance_logs").collect();
    const recentLogs = allLogs.filter(log => log._creationTime >= oneHourAgo);

    const recentSuccessRate = recentLogs.length > 0 
      ? (recentLogs.filter(log => log.success).length / recentLogs.length) * 100 
      : 100;

    const avgResponseTime = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length
      : 0;

    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (recentSuccessRate < 95 || avgResponseTime > 5000) {
      healthStatus = 'critical';
    } else if (recentSuccessRate < 98 || avgResponseTime > 2000) {
      healthStatus = 'warning';
    }

    return {
      status: healthStatus,
      timestamp: now,
      metrics: {
        recentSuccessRate: Math.round(recentSuccessRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        totalRequestsLastHour: recentLogs.length,
      },
    };
  },
});

// Error tracking
export const logError = internalMutation({
  args: {
    operation: v.string(),
    error: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Log to performance logs with failure
    await ctx.db.insert("performance_logs", {
      operation: args.operation,
      duration: 0,
      success: false,
      error_message: args.error,
      metadata: args.metadata,
    });
  },
});

// Get error summary
export const getErrorSummary = query({
  args: {
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hoursBack || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    const allLogs = await ctx.db.query("performance_logs").collect();
    const errorLogs = allLogs.filter(log => 
      log._creationTime >= cutoffTime && 
      !log.success
    );

    const errorsByOperation = errorLogs.reduce((acc, log) => {
      if (!acc[log.operation]) {
        acc[log.operation] = {
          operation: log.operation,
          count: 0,
          recentErrors: []
        };
      }
      acc[log.operation].count++;
      if (acc[log.operation].recentErrors.length < 3) {
        acc[log.operation].recentErrors.push({
          createdAt: log._creationTime,
          error: log.error_message || 'Unknown error',
        });
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      totalErrors: errorLogs.length,
      hoursBack,
      errorsByOperation: Object.values(errorsByOperation),
      recentErrors: errorLogs.slice(0, 10).map(log => ({
        operation: log.operation,
        createdAt: log._creationTime,
        error: log.error_message || 'Unknown error',
      })),
    };
  },
}); 