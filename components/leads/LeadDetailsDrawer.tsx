"use client";

import * as React from "react";
import { useEffect } from "react";
import { X, Building2, Globe, Users, Calendar, TrendingUp, FileText, Code, Clock, Tag } from "lucide-react";
import { LeadItem } from "@/lib/types";
import { useLeadRadar } from "@/lib/contexts/LeadRadarContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadDetailsDrawerProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadDetailsDrawer({ leadId, open, onOpenChange }: LeadDetailsDrawerProps) {
  const { updateLeadStatus } = useLeadRadar();
  
  // Use detailed query to get enrichment data when drawer is open
  const detailedLead = useQuery(
    api.leads.getDetails, 
    leadId && open ? { companyId: leadId as any } : "skip"
  );
  
  const lead = detailedLead || null;

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onOpenChange]);

  if (!lead) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'opportunity': return 'bg-purple-100 text-purple-800';
      case 'dead': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: number | Date) => {
    const now = Date.now();
    const timestampMs = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
    const diffMs = now - timestampMs;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Custom frame background style matching DashboardFrame
  const frameBackgroundStyle = {
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.50)',
    boxShadow: '0px 0px 16px 0px rgba(159, 159, 159, 0.34), 0px 0px 40px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 12px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 24px 0px rgba(204, 186, 255, 0.80) inset',
    filter: 'blur(6px)',
    backdropFilter: 'blur(13.5px)',
    transition: 'all 0.3s ease-in-out'
  };

  return (
    <Drawer 
      shouldScaleBackground={false}
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="border-none bg-transparent shadow-none fixed inset-20 z-50 focus:outline-none !mt-0 !rounded-none">
        {/* Custom background with DashboardFrame styling */}
        <div className="w-full relative h-full pointer-events-auto">
          {/* Blurred background layer */}
          <div 
            className="absolute inset-0 rounded-t-3xl"
            style={frameBackgroundStyle}
            suppressHydrationWarning={true}
            data-darkreader-ignore="true"
          />
          
          {/* Content layer */}
          <div className="relative z-10 flex flex-col h-full select-text">
            <DrawerHeader className="border-b border-gray-200/30 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DrawerTitle className="text-xl font-semibold text-gray-900 mb-2">
                    {lead.companyName}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-gray-600 mb-3">
                    Complete lead details and scoring information
                  </DrawerDescription>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a href={`https://${lead.website}`} target="_blank" rel="noopener noreferrer" 
                         className="hover:underline text-gray-600">{lead.website}</a>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(lead.leadScore)}`}>
                        Health Score: {lead.leadScore}
                      </div>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      <Badge variant="outline">
                        {lead.geoMarket}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="rationale" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Rationale
                  </TabsTrigger>
                  <TabsTrigger value="rawdata" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Raw Data
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Company Details</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="text-gray-500">Industry:</span> {lead.overview.industry}</div>
                            <div><span className="text-gray-500">Location:</span> {lead.overview.address}</div>
                            {lead.overview.founded && (
                              <div><span className="text-gray-500">Founded:</span> {lead.overview.founded}</div>
                            )}
                            <div><span className="text-gray-500">Size:</span> {lead.sizeFTE} employees</div>
                            <div><span className="text-gray-500">ARPU Band:</span> 
                              <Badge variant="outline" className="ml-2">{lead.arpuBand}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Commission Potential</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="text-gray-500">Est. Annual GMV:</span> {formatCurrency(lead.estimatedARPU * 12)}</div>
                            <div><span className="text-gray-500">Health Score:</span> {lead.leadScore}/100</div>
                            {lead.assignedTo && (
                              <div><span className="text-gray-500">Assigned to:</span> {lead.assignedTo}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{lead.overview.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key Signals</h4>
                      <div className="flex flex-wrap gap-2">
                        {lead.keySignals.map((signal, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Last Activity</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{lead.lastActivity.description}</span>
                        <span className="text-gray-500">• {lead.lastActivity.timeAgo}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-4 space-y-4">
                    <div className="space-y-4">
                      {lead.timeline.map((event) => (
                        <div key={event.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            {event.type === 'score_change' && <TrendingUp className="h-4 w-4 text-blue-600" />}
                            {event.type === 'news_hit' && <FileText className="h-4 w-4 text-green-600" />}
                            {event.type === 'activity' && <Building2 className="h-4 w-4 text-purple-600" />}
                            {event.type === 'note' && <Users className="h-4 w-4 text-orange-600" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{event.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(event.timestamp)}</p>
                            {event.metadata && (
                              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                {JSON.stringify(event.metadata, null, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="rationale" className="mt-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">AI Explanation</h4>
                      <p className="text-sm text-gray-600 mb-4">{lead.rationale.explanation}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Scoring Factors</h4>
                      <div className="space-y-3">
                        {lead.rationale.factors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                factor.impact === 'positive' ? 'bg-green-500' : 
                                factor.impact === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                              }`} />
                              <span className="text-sm font-medium">{factor.factor}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Weight: {(factor.weight * 100).toFixed(0)}%</div>
                              <div className={`text-xs capitalize ${
                                factor.impact === 'positive' ? 'text-green-600' : 
                                factor.impact === 'negative' ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {factor.impact}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="rawdata" className="mt-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Enrichment Data</h4>
                      <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(lead.rawData.enrichment, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Score Features</h4>
                      <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(lead.rawData.scoreFeatures, null, 2)}
                      </pre>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <DrawerFooter className="border-t border-gray-200/30 p-6">
              <div className="flex gap-3">
                <Button 
                  className="flex-1"
                  onClick={() => updateLeadStatus(lead.id, 'contacted' as any)}
                  disabled={lead.status === 'contacted'}
                >
                  Initiate Partnership
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => updateLeadStatus(lead.id, 'qualified' as any)}
                  disabled={lead.status === 'qualified'}
                >
                  Mark as Activated
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // You can replace "System" with actual rep name when user management is implemented
                    updateLeadStatus(lead.id, lead.status as any, "System");
                  }}
                >
                  Assign to Rep
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 