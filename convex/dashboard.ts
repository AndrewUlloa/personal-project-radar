import { query } from "./_generated/server";
import { v } from "convex/values";

// For ChartLineInteractive - Total Leads in Database with flexible time periods
export const getTotalLeadsTrend = query({
  args: {
    period: v.optional(v.string()), // "1D", "7D", "30D", "90D", "1Y", "ALL"
  },
  handler: async (ctx, args) => {
    const period = args.period || "30D";
    
    // Calculate time range based on period
    let timeRange: number;
    let fillMissingDays = true;
    
    switch (period) {
      case "1D":
        timeRange = 24 * 60 * 60 * 1000; // 1 day
        fillMissingDays = false; // Don't fill for single day
        break;
      case "7D":
        timeRange = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case "30D":
        timeRange = 30 * 24 * 60 * 60 * 1000; // 30 days
        break;
      case "90D":
        timeRange = 90 * 24 * 60 * 60 * 1000; // 90 days
        break;
      case "1Y":
        timeRange = 365 * 24 * 60 * 60 * 1000; // 1 year
        break;
      case "ALL":
        timeRange = Date.now(); // All time
        break;
      default:
        timeRange = 30 * 24 * 60 * 60 * 1000; // Default 30 days
    }
    
    const startTime = period === "ALL" ? 0 : Date.now() - timeRange;
    
    // Get companies from the specified time range
    const companies = await ctx.db
      .query("companies")
      .filter((q) => q.gte(q.field("_creationTime"), startTime))
      .collect();

    // Group by appropriate time unit based on period
    let trendData;
    if (period === "1D") {
      trendData = groupCompaniesByHour(companies);
    } else {
      trendData = groupCompaniesByDay(companies, period, fillMissingDays);
    }
    
    return {
      data: trendData,
      period,
      totals: {
        total: companies.length,
        webCrawler: companies.filter(c => isWebCrawlerSource(c)).length,
        linkedin: companies.filter(c => isLinkedInSource(c)).length,
      },
      dateRange: {
        start: new Date(startTime).toISOString(),
        end: new Date().toISOString(),
      },
    };
  },
});

// For ChartBarLabel - New Leads Discovered Today (hourly)
export const getNewLeadsToday = query({
  args: {},
  handler: async (ctx) => {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    const todaysLeads = await ctx.db
      .query("companies")
      .filter((q) => q.gte(q.field("_creationTime"), todayStart))
      .collect();

    // Group by hour (0-23)
    return groupCompaniesByHour(todaysLeads);
  },
});

// For ChartRadialShape - High-Priority Leads (Score ≥ 80)
export const getHighPriorityLeads = query({
  args: {},
  handler: async (ctx) => {
    const allCompanies = await ctx.db.query("companies").collect();
    const highPriorityLeads = allCompanies.filter(c => (c.lead_score || 0) >= 80);

    const totalLeads = allCompanies.length;
    const highPriorityCount = highPriorityLeads.length;
    
    return {
      count: highPriorityCount,
      total: totalLeads,
      percentage: totalLeads > 0 ? Math.round((highPriorityCount / totalLeads) * 100) : 0,
    };
  },
});

// For ChartRadialText - Average Lead Score with 30-day change
export const getAverageLeadScore = query({
  args: {},
  handler: async (ctx) => {
    const allCompanies = await ctx.db.query("companies").collect();
    const scoredCompanies = allCompanies.filter(c => c.lead_score !== undefined);
    
    if (scoredCompanies.length === 0) {
      return { current: 0, change: 0, trend: "neutral" as const };
    }

    // Calculate current average
    const currentAvg = scoredCompanies.reduce((sum, c) => sum + (c.lead_score || 0), 0) / scoredCompanies.length;

    // Calculate 30-day change
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldCompanies = scoredCompanies.filter(c => c._creationTime < thirtyDaysAgo);
    
    let change = 0;
    let trend: "up" | "down" | "neutral" = "neutral";
    
    if (oldCompanies.length > 0) {
      const oldAvg = oldCompanies.reduce((sum, c) => sum + (c.lead_score || 0), 0) / oldCompanies.length;
      change = currentAvg - oldAvg;
      trend = change > 0 ? "up" : change < 0 ? "down" : "neutral";
    }

    return {
      current: Math.round(currentAvg * 10) / 10,
      change: Math.round(change * 10) / 10,
      trend,
    };
  },
});

// For ChartBarStacked - Score Distribution (Low/Mid/High)
export const getScoreDistribution = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    const scoredCompanies = companies.filter(c => c.lead_score !== undefined);

    return {
      low: scoredCompanies.filter(c => (c.lead_score || 0) < 40).length,
      mid: scoredCompanies.filter(c => (c.lead_score || 0) >= 40 && (c.lead_score || 0) < 80).length,
      high: scoredCompanies.filter(c => (c.lead_score || 0) >= 80).length,
      total: scoredCompanies.length,
    };
  },
});

// For ChartAreaGradient - ARPU Forecast (30-day rolling trends)
export const getARPUForecast = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const recentCompanies = await ctx.db
      .query("companies")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();

    // Calculate rolling 7-day ARPU averages
    const rollingData = calculateRollingARPU(recentCompanies);
    
    return {
      data: rollingData,
      summary: {
        totalEstimatedARPU: recentCompanies.reduce((sum, c) => sum + (c.estimated_arpu || 0), 0),
        averageARPU: recentCompanies.length > 0 
          ? recentCompanies.reduce((sum, c) => sum + (c.estimated_arpu || 0), 0) / recentCompanies.length 
          : 0,
        companiesCount: recentCompanies.length,
      },
    };
  },
});

// For ChartRadarGridCustom - News Alerts (24h activity)
export const getNewsAlerts = query({
  args: {},
  handler: async (ctx) => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    
    // Get recent events
    const events = await ctx.db
      .query("event_log")
      .filter((q) => q.gte(q.field("_creationTime"), yesterday))
      .collect();

    // Get recent news content
    const newsContent = await ctx.db
      .query("news_content")
      .filter((q) => q.gte(q.field("_creationTime"), yesterday))
      .collect();

    return {
      alerts: categorizeNewsAlerts(events, newsContent),
      summary: {
        totalEvents: events.length,
        newsArticles: newsContent.length,
        lastUpdated: Date.now(),
      },
    };
  },
});

// Additional utility query for real-time metrics
export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    const todaysLeads = companies.filter(c => c._creationTime >= todayStart);
    const scoredLeads = companies.filter(c => c.lead_score !== undefined);
    const highValueLeads = companies.filter(c => (c.estimated_arpu || 0) >= 50000);

    return {
      totals: {
        allLeads: companies.length,
        todaysLeads: todaysLeads.length,
        scoredLeads: scoredLeads.length,
        highValueLeads: highValueLeads.length,
      },
      averages: {
        leadScore: scoredLeads.length > 0 
          ? scoredLeads.reduce((sum, c) => sum + (c.lead_score || 0), 0) / scoredLeads.length 
          : 0,
        estimatedARPU: companies.length > 0 
          ? companies.reduce((sum, c) => sum + (c.estimated_arpu || 0), 0) / companies.length 
          : 0,
      },
    };
  },
});

// Helper functions for data processing

function groupCompaniesByDay(companies: any[], period: string, fillMissingDays: boolean) {
  const dayGroups: Record<string, { date: string; webCrawler: number; linkedin: number; total: number }> = {};
  
  companies.forEach(company => {
    const date = new Date(company._creationTime).toISOString().split('T')[0];
    
    if (!dayGroups[date]) {
      dayGroups[date] = { date, webCrawler: 0, linkedin: 0, total: 0 };
    }
    
    dayGroups[date].total += 1;
    
    if (isWebCrawlerSource(company)) {
      dayGroups[date].webCrawler += 1;
    } else if (isLinkedInSource(company)) {
      dayGroups[date].linkedin += 1;
    }
  });

  // Convert to array and sort by date
  const result = Object.values(dayGroups).sort((a, b) => a.date.localeCompare(b.date));
  
  // For periods longer than 1 day, fill missing days if needed
  if (fillMissingDays && result.length > 0) {
    return fillMissingDaysInRange(result, period);
  }
  
  return result;
}

function groupCompaniesByHour(companies: any[]) {
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: hour.toString().padStart(2, '0') + ':00',
    count: 0,
    webCrawler: 0,
    linkedin: 0,
  }));

  companies.forEach(company => {
    const hour = new Date(company._creationTime).getHours();
    const isLinkedIn = isLinkedInSource(company);
    const isWebCrawler = isWebCrawlerSource(company);
    
    hourlyData[hour].count += 1;
    
    if (isLinkedIn) {
      hourlyData[hour].linkedin += 1;
    }
    if (isWebCrawler) {
      hourlyData[hour].webCrawler += 1;
    }
  });

  return hourlyData;
}

function fillMissingDaysInRange(existingData: any[], period: string) {
  if (existingData.length === 0) {
    // Create minimal fallback data for empty periods
    const today = new Date().toISOString().split('T')[0];
    return [{
      date: today,
      webCrawler: 0,
      linkedin: 0,
      total: 0,
    }];
  }
  
  // For single day with data, create a few surrounding days for better visualization
  if (existingData.length === 1) {
    const singleDate = new Date(existingData[0].date);
    const result = [];
    
    // Add 2 days before and 2 days after for better chart visualization
    for (let i = -2; i <= 2; i++) {
      const date = new Date(singleDate);
      date.setDate(singleDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (i === 0) {
        // Use actual data for the center day
        result.push(existingData[0]);
      } else {
        // Add empty days around it
        result.push({
          date: dateStr,
          webCrawler: 0,
          linkedin: 0,
          total: 0,
        });
      }
    }
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  const startDate = new Date(existingData[0].date);
  const endDate = new Date(existingData[existingData.length - 1].date);
  const filledData = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const existingEntry = existingData.find(entry => entry.date === dateStr);
    
    if (existingEntry) {
      filledData.push(existingEntry);
    } else {
      filledData.push({
        date: dateStr,
        webCrawler: 0,
        linkedin: 0,
        total: 0,
      });
    }
  }
  
  return filledData;
}

function calculateRollingARPU(companies: any[]) {
  // Group by day
  const dailyGroups: Record<string, any[]> = {};
  
  companies.forEach(company => {
    const date = new Date(company._creationTime).toISOString().split('T')[0];
    if (!dailyGroups[date]) {
      dailyGroups[date] = [];
    }
    dailyGroups[date].push(company);
  });

  // Calculate cumulative pipeline value over time instead of daily averages
  const sortedDates = Object.keys(dailyGroups).sort();
  const rollingData = [];
  let cumulativeCompanies: any[] = [];

  for (let i = 0; i < sortedDates.length; i++) {
    // Add companies from this day to cumulative total
    cumulativeCompanies = cumulativeCompanies.concat(dailyGroups[sortedDates[i]]);
    
    // Calculate total pipeline value (sum of all estimated ARPU)
    const totalPipeline = cumulativeCompanies.reduce((sum, c) => sum + (c.estimated_arpu || 0), 0);

    rollingData.push({
      date: sortedDates[i],
      value: Math.round(totalPipeline), // Total cumulative pipeline
      count: cumulativeCompanies.length,
    });
  }

  // If we have no daily data but have companies, show current total
  if (rollingData.length === 0 && companies.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const totalPipeline = companies.reduce((sum, c) => sum + (c.estimated_arpu || 0), 0);
    
    rollingData.push({
      date: today,
      value: Math.round(totalPipeline),
      count: companies.length,
    });
  }

  return rollingData;
}

function categorizeNewsAlerts(events: any[], newsContent: any[]) {
  const categories = {
    enrichment: events.filter(e => e.event_type === "enrichment_completed").length,
    scoring: events.filter(e => e.event_type === "score_updated").length,
    discovery: events.filter(e => e.event_type === "lead_discovered").length,
    news: newsContent.filter(n => n.source === "news").length,
    social: newsContent.filter(n => ["twitter", "reddit"].includes(n.source)).length,
    errors: events.filter(e => e.event_type.includes("error")).length,
  };

  // Ensure minimum values for proper radar chart shape (hexagon)
  // This prevents segments from collapsing to center when there's no data
  const minValue = 1;
  
  // Convert to radar chart format with minimum values to maintain shape
  return [
    { category: "Enrichment", value: Math.max(categories.enrichment, minValue) },
    { category: "AI Scoring", value: Math.max(categories.scoring, minValue) },
    { category: "Discovery", value: Math.max(categories.discovery, minValue) },
    { category: "News", value: Math.max(categories.news, minValue) },
    { category: "Social", value: Math.max(categories.social, minValue) },
    { category: "Errors", value: Math.max(categories.errors, minValue) },
  ];
}

function isWebCrawlerSource(company: any): boolean {
  // Check discovery source field or default to web crawler
  return company.discovery_source === 'web_crawler' || 
         company.discovery_source === 'manual' ||
         !company.discovery_source || // Default for existing data
         (company.discovery_source !== 'linkedin' && company.discovery_source !== 'api');
}

function isLinkedInSource(company: any): boolean {
  // Check if company was discovered via LinkedIn enrichment
  return company.discovery_source === 'linkedin';
} 