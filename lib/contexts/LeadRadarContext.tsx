"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LeadItem, sampleLeadData } from '@/lib/types';
import { toast } from 'sonner';

interface LeadRadarContextType {
  leads: LeadItem[];
  addLead: (item: Omit<LeadItem, 'id' | 'addedAt'>) => void;
  removeLead: (id: string) => void;
  clearAllLeads: () => void;
  updateLeadStatus: (id: string, status: LeadItem['status'], assignedTo?: string) => void;
  getLeadById: (id: string) => LeadItem | undefined;
  getNewLeadsLast24h: () => number;
  getAverageLeadScore: () => number;
  getEstimatedPipelineValue: () => number;
  getHighPriorityLeadsCount: () => number;
}

const LeadRadarContext = createContext<LeadRadarContextType | undefined>(undefined);

export function LeadRadarProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<LeadItem[]>(sampleLeadData);

  const addLead = (newLead: Omit<LeadItem, 'id' | 'addedAt'>) => {
    // Check if lead already exists
    if (leads.some(lead => lead.website === newLead.website)) {
      toast.error(`${newLead.companyName} is already in your lead radar`);
      return;
    }

    const leadItem: LeadItem = {
      ...newLead,
      id: Math.random().toString(36).substr(2, 9),
      addedAt: new Date(),
      status: 'new',
    };

    setLeads(prev => [...prev, leadItem]);
    
    toast.success(
      <div className="flex items-center gap-2">
        <span>Added {newLead.companyName} to lead radar</span>
      </div>,
      {
        duration: 3000,
        position: "top-center",
      }
    );
  };

  const removeLead = (id: string) => {
    const lead = leads.find(lead => lead.id === id);
    setLeads(prev => prev.filter(lead => lead.id !== id));
    
    if (lead) {
      toast.success(`Removed ${lead.companyName} from lead radar`);
    }
  };

  const clearAllLeads = () => {
    setLeads([]);
    toast.success('All leads cleared from radar');
  };

  const updateLeadStatus = (id: string, status: LeadItem['status'], assignedTo?: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id 
        ? { ...lead, status, assignedTo } 
        : lead
    ));
    
    const lead = leads.find(l => l.id === id);
    if (lead) {
      toast.success(`${lead.companyName} status updated to ${status}`);
    }
  };

  const getLeadById = (id: string) => {
    return leads.find(lead => lead.id === id);
  };

  const getNewLeadsLast24h = () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return leads.filter(lead => lead.addedAt > yesterday).length;
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