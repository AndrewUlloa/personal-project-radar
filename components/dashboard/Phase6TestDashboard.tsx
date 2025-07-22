"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingDisplay, ErrorDisplay } from "@/components/ui/error-boundary";
import { useState } from "react";
import { Search, Plus, TrendingUp, Users, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function Phase6TestDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [website, setWebsite] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Convex hooks for search functionality
  const searchAndAddCompany = useAction(api.search.searchAndAddCompany);
  const recentLeads = useQuery(api.leads.list, {});
  
  // Test search functionality
  const handleTestSearch = async () => {
    if (!searchTerm.trim() || !website.trim()) {
      toast.error("Please enter both company name and website");
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchAndAddCompany({
        companyName: searchTerm.trim(),
        website: website.trim(),
        source: "phase6_test",
      });

      if (result.isNew) {
        toast.success(`🎉 ${searchTerm} added to Lead Radar! Enrichment in progress...`);
      } else {
        toast.info(`${searchTerm} is already in your Lead Radar`);
      }

      // Clear form
      setSearchTerm("");
      setWebsite("");
      
    } catch (error) {
      console.error("Search test failed:", error);
      toast.error(`Failed to add ${searchTerm}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Phase 6: Search Integration</h1>
        <p className="text-gray-600">Testing search functionality and Lead Radar integration</p>
      </div>

      {/* Search Integration Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Integration Test
          </CardTitle>
          <CardDescription>
            Test the SearchDockIcon and SearchDrawer integration with Convex
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Company Name (e.g., OpenAI)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all duration-200"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Website (e.g., openai.com)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all duration-200"
                />
              </div>
            </div>
            
            <button
              onClick={handleTestSearch}
              disabled={!searchTerm.trim() || !website.trim() || isSearching}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding to Lead Radar...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Test Add to Lead Radar
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Leads in Database
          </CardTitle>
          <CardDescription>
            Companies added through search integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!recentLeads ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leads found. Try adding a company using the search test above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{lead.companyName}</div>
                      <div className="text-sm text-gray-500">{lead.website}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        lead.leadScore > 80 ? 'bg-green-500' : 
                        lead.leadScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      Score: {lead.leadScore}/100
                    </div>
                    <div className="text-xs text-gray-500">{lead.lastActivity.timeAgo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 6 Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Phase 6: Search Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-green-800">✅ Completed Features</h4>
              <div className="space-y-2 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Search Action in Convex
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  SearchDrawer Integration
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  CompanyResearchHome Integration
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Duplicate Detection
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Search Analytics
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-green-800">🚀 Integration Points</h4>
              <div className="space-y-2 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  SearchDockIcon → SearchDrawer → Convex
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Company Research → Add to Radar
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Real-time Lead Updates
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Error Handling & Toasts
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-100 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <CheckCircle className="h-5 w-5" />
              🎉 Phase 6 Complete!
            </div>
            <p className="text-sm text-green-700 mt-1">
              Search integration is fully functional with Convex backend, real-time updates, and comprehensive error handling.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Next Steps: Phase 7
          </CardTitle>
          <CardDescription>
            Upcoming automation and cron job implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">Phase 7 will include:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div>• Automated lead discovery cron jobs</div>
                <div>• Batch processing capabilities</div>
                <div>• Intelligent lead scoring</div>
              </div>
              <div className="space-y-2">
                <div>• Performance monitoring</div>
                <div>• Rate limiting and optimization</div>
                <div>• Advanced analytics dashboard</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 