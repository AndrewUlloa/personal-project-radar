import { mutation, internalMutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Public mutation to update lead status
export const updateLeadStatus = mutation({
  args: {
    companyId: v.id("companies"),
    status: v.string(),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Update the company status
    await ctx.db.patch(args.companyId, {
      status: args.status,
      assigned_to: args.assignedTo,
      last_activity_description: `Status updated to ${args.status}${args.assignedTo ? ` (assigned to ${args.assignedTo})` : ''}`,
      last_activity_timestamp: Date.now(),
    });

    // Log the status change
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "status_updated",
      metadata: {
        status: args.status,
        assignedTo: args.assignedTo,
      },
    });

    return args.companyId;
  },
});

// Public mutation to delete a lead
export const deleteLead = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Get company info for logging
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Delete related data first
    const enrichmentRecords = await ctx.db
      .query("raw_enrichment")
      .withIndex("by_company", (q) => q.eq("company_id", args.companyId))
      .collect();

    for (const record of enrichmentRecords) {
      await ctx.db.delete(record._id);
    }

    const eventLogs = await ctx.db
      .query("event_log")
      .withIndex("by_company_and_time", (q) => q.eq("company_id", args.companyId))
      .collect();

    for (const log of eventLogs) {
      await ctx.db.delete(log._id);
    }

    // Delete the company
    await ctx.db.delete(args.companyId);

    // Log the deletion
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "lead_deleted",
      metadata: {
        companyName: company.company_name,
        website: company.website,
        deletedAt: Date.now(),
      },
    });

    return { success: true, companyName: company.company_name };
  },
});

// Public mutation to update lead notes/description
export const updateLeadNotes = mutation({
  args: {
    companyId: v.id("companies"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.companyId, {
      description: args.notes,
      last_activity_description: "Notes updated",
      last_activity_timestamp: Date.now(),
    });

    // Log the notes update
    await ctx.db.insert("event_log", {
      company_id: args.companyId,
      event_type: "notes_updated",
      metadata: {
        notesLength: args.notes.length,
      },
    });

    return args.companyId;
  },
});

// Public mutation to bulk update lead statuses
export const bulkUpdateStatus = mutation({
  args: {
    companyIds: v.array(v.id("companies")),
    status: v.string(),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const companyId of args.companyIds) {
      try {
        await ctx.db.patch(companyId, {
          status: args.status,
          assigned_to: args.assignedTo,
          last_activity_description: `Bulk status update to ${args.status}`,
          last_activity_timestamp: Date.now(),
        });

        // Log each update
        await ctx.db.insert("event_log", {
          company_id: companyId,
          event_type: "bulk_status_updated",
          metadata: {
            status: args.status,
            assignedTo: args.assignedTo,
            batchSize: args.companyIds.length,
          },
        });

        results.push({ companyId, success: true });
      } catch (error) {
        results.push({ companyId, success: false, error: String(error) });
      }
    }

    return {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  },
});

// Public mutation to bulk delete leads
export const bulkDeleteLeads = mutation({
  args: {
    companyIds: v.array(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const companyId of args.companyIds) {
      try {
        const company = await ctx.db.get(companyId);
        if (!company) {
          results.push({ companyId, success: false, error: "Company not found" });
          continue;
        }

        // Delete related enrichment data
        const enrichmentRecords = await ctx.db
          .query("raw_enrichment")
          .withIndex("by_company", (q) => q.eq("company_id", companyId))
          .collect();

        for (const record of enrichmentRecords) {
          await ctx.db.delete(record._id);
        }

        // Delete event logs (except deletion log)
        const eventLogs = await ctx.db
          .query("event_log")
          .withIndex("by_company_and_time", (q) => q.eq("company_id", companyId))
          .collect();

        for (const log of eventLogs) {
          await ctx.db.delete(log._id);
        }

        // Delete the company
        await ctx.db.delete(companyId);

        // Log the deletion
        await ctx.db.insert("event_log", {
          company_id: companyId,
          event_type: "bulk_lead_deleted",
          metadata: {
            companyName: company.company_name,
            website: company.website,
            batchSize: args.companyIds.length,
          },
        });

        results.push({ companyId, success: true, companyName: company.company_name });
      } catch (error) {
        results.push({ companyId, success: false, error: String(error) });
      }
    }

    return {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  },
});

// Query to get lead details for editing
export const getLeadDetails = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Get recent events
    const events = await ctx.db
      .query("event_log")
      .withIndex("by_company_and_time", (q) => q.eq("company_id", args.companyId))
      .order("desc")
      .take(50);

    // Get enrichment sources
    const enrichmentData = await ctx.db
      .query("raw_enrichment")
      .withIndex("by_company", (q) => q.eq("company_id", args.companyId))
      .collect();

    return {
      company,
      events,
      enrichmentSources: enrichmentData.map(e => ({
        source: e.source,
        status: e.status,
        fetchedAt: e.fetched_at,
      })),
      enrichedDataCount: enrichmentData.length,
    };
  },
});

// Query to search leads by various criteria
export const searchLeads = query({
  args: {
    searchTerm: v.optional(v.string()),
    status: v.optional(v.string()),
    minScore: v.optional(v.number()),
    assignedTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("companies");

    // Apply filters
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.minScore !== undefined) {
      query = query.filter((q) => q.gte(q.field("lead_score"), args.minScore!));
    }

    if (args.assignedTo) {
      query = query.filter((q) => q.eq(q.field("assigned_to"), args.assignedTo));
    }

    let companies = await query.collect();

    // Text search filter (basic implementation)
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      companies = companies.filter(company => 
        company.company_name.toLowerCase().includes(searchLower) ||
        company.website.toLowerCase().includes(searchLower) ||
        (company.description && company.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply limit
    if (args.limit) {
      companies = companies.slice(0, args.limit);
    }

    return companies.map(company => ({
      id: company._id,
      companyName: company.company_name,
      website: company.website,
      leadScore: company.lead_score || 0,
      status: company.status || "new",
      assignedTo: company.assigned_to,
      addedAt: company._creationTime,
    }));
  },
});

// Internal mutation for testing purposes
export const _resetDemoData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // WARNING: This deletes ALL data - only for demo/testing
    const companies = await ctx.db.query("companies").collect();
    const events = await ctx.db.query("event_log").collect();
    const enrichment = await ctx.db.query("raw_enrichment").collect();

    for (const company of companies) {
      await ctx.db.delete(company._id);
    }
    for (const event of events) {
      await ctx.db.delete(event._id);
    }
    for (const record of enrichment) {
      await ctx.db.delete(record._id);
    }

    return { message: "All demo data reset", deletedCount: companies.length };
  },
}); 