import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily lead discovery - discover new companies matching our ICP
crons.daily("daily-lead-discovery", { hourUTC: 9, minuteUTC: 0 }, internal.automation.dailyLeadDiscovery, {
  maxCompanies: 50,
  icpCriteria: {
    industries: ["jewelry", "fashion", "accessories", "retail", "e-commerce"],
    minEmployees: 10,
    maxEmployees: 500,
    geoMarkets: ["US", "UK", "CA", "AU", "EU"],
  }
});

// Hourly queue processing - process pending companies in discovery queue
crons.hourly("process-discovery-queue", { minuteUTC: 15 }, internal.automation.processDiscoveryQueue, {
  batchSize: 10,
  maxRetries: 3,
});

// Weekly lead scoring refresh - re-score existing leads with updated AI models
crons.weekly("weekly-scoring-refresh", { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 0 }, internal.automation.weeklyScoreRefresh, {
  daysOld: 7,
  maxLeads: 100,
});

// Daily performance cleanup - clean old logs and optimize database
crons.daily("daily-cleanup", { hourUTC: 2, minuteUTC: 0 }, internal.automation.dailyCleanup, {
  retentionDays: 30,
  optimizeDatabase: true,
});

// Bi-hourly health check - monitor system performance and alert on issues
crons.interval("health-check", { minutes: 120 }, internal.automation.healthCheck, {
  checkDatabase: true,
  checkAPILimits: true,
  checkScoringAccuracy: true,
});

export default crons; 