"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { LeadItem } from '@/lib/types';
import { toast } from 'sonner';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface LeadRadarContextType {
  leads: LeadItem[];
  addLead: (item: Omit<LeadItem, 'id' | 'addedAt'>) => Promise<void>;
  removeLead: (id: string) => Promise<void>;
  clearAllLeads: () => Promise<void>;
  updateLeadStatus: (id: string, status: LeadItem['status'], assignedTo?: string) => Promise<void>;
  getLeadById: (id: string) => LeadItem | undefined;
  getNewLeadsLast24h: () => number;
  getAverageLeadScore: () => number;
  getEstimatedPipelineValue: () => number;
  getHighPriorityLeadsCount: () => number;
}

const LeadRadarContext = createContext<LeadRadarContextType | undefined>(undefined);

export function LeadRadarProvider({ children }: { children: ReactNode }) {
  // Use Convex queries for real-time data
  const convexLeads = useQuery(api.leads.list, {}) || [];
  // Temporary type assertions until Convex types stabilize 
  const enrichCompanyAction = useAction((api as any).enrichment.enrichCompany);

  // Transform Convex data to LeadItem format with proper type mapping
  const leads: LeadItem[] = convexLeads.map((lead: any) => ({
    id: lead.id,
    companyName: lead.companyName,
    website: lead.website,
    logoUrl: lead.logoUrl || undefined,
    geoMarket: lead.geoMarket,
    leadScore: lead.leadScore,
    arpuBand: lead.arpuBand,
    keySignals: lead.keySignals,
    sizeFTE: lead.sizeFTE,
    lastActivity: lead.lastActivity,
    status: lead.status as LeadItem['status'],
    assignedTo: lead.assignedTo || undefined,
    estimatedARPU: lead.estimatedARPU,
    addedAt: new Date(lead.addedAt),
    overview: {
      address: lead.overview.address,
      industry: lead.overview.industry,
      founded: lead.overview.founded || undefined,
      description: lead.overview.description,
    },
    timeline: lead.timeline,
    rationale: {
      explanation: lead.rationale.explanation,
      factors: lead.rationale.factors || [], // Use the structured factors directly from Convex
    },
    rawData: lead.rawData,
  }));

  const addLead = async (newLead: Omit<LeadItem, 'id' | 'addedAt'>) => {
    try {
      // Check if lead already exists
      if (leads.some(lead => lead.website === newLead.website)) {
        toast.error(`${newLead.companyName} is already in your lead radar`);
        return;
      }

      // Use Convex mutation to enrich and add the company
      await enrichCompanyAction({ 
        websiteUrl: newLead.website,
        companyName: newLead.companyName 
      });
      
      toast.success(`Added ${newLead.companyName} to lead radar`);
    } catch (error) {
      toast.error(`Failed to add ${newLead.companyName}: ${error}`);
    }
  };

  const deleteLeadMutation = useMutation((api as any).leadsCrud.deleteLead);
  const updateStatusMutation = useMutation((api as any).leadsCrud.updateLeadStatus);
  const bulkDeleteMutation = useMutation((api as any).leadsCrud.bulkDeleteLeads);

  const removeLead = async (id: string) => {
    try {
      const lead = leads.find(lead => lead.id === id);
      if (!lead) return;

      const result = await deleteLeadMutation({ companyId: id as any });
      toast.success(`Removed ${result.companyName} from lead radar`);
    } catch (error) {
      toast.error(`Failed to remove lead: ${error}`);
    }
  };

  const clearAllLeads = async () => {
    try {
      const companyIds = leads.map(lead => lead.id as any);
      if (companyIds.length === 0) return;

      const result = await bulkDeleteMutation({ companyIds });
      toast.success(`Removed ${result.successful} leads from radar`);
    } catch (error) {
      toast.error(`Failed to clear leads: ${error}`);
    }
  };

  const updateLeadStatus = async (id: string, status: LeadItem['status'], assignedTo?: string) => {
    try {
      await updateStatusMutation({ 
        companyId: id as any, 
        status, 
        assignedTo 
      });
      
      const lead = leads.find(l => l.id === id);
      toast.success(`Updated ${lead?.companyName} status to ${status}`);
    } catch (error) {
      toast.error(`Failed to update status: ${error}`);
    }
  };

  const getLeadById = (id: string) => {
    return leads.find(lead => lead.id === id);
  };

  const getNewLeadsLast24h = () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    return leads.filter(lead => new Date(lead.addedAt).getTime() > yesterday).length;
  };

  const getAverageLeadScore = () => {
    if (leads.length === 0) return 0;
    return Math.round(leads.reduce((sum, lead) => sum + lead.leadScore, 0) / leads.length);
  };

  const getEstimatedPipelineValue = () => {
    return leads
      .filter(lead => lead.leadScore > 70)
      .reduce((sum, lead) => sum + lead.estimatedARPU, 0);
  };

  const getHighPriorityLeadsCount = () => {
    return leads.filter(lead => lead.leadScore > 80).length;
  };

  return (
    <LeadRadarContext.Provider value={{
      leads,
      addLead,
      removeLead,
      clearAllLeads,
      updateLeadStatus,
      getLeadById,
      getNewLeadsLast24h,
      getAverageLeadScore,
      getEstimatedPipelineValue,
      getHighPriorityLeadsCount,
    }}>
      {children}
    </LeadRadarContext.Provider>
  );
}

export function useLeadRadar() {
  const context = useContext(LeadRadarContext);
  if (context === undefined) {
    throw new Error('useLeadRadar must be used within a LeadRadarProvider');
  }
  return context;
} 