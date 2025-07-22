"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Search, Command, History, TrendingUp, Users, FileText, Plus, Check, AlertCircle } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { buttonVariants } from "@/components/ui/button";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface SearchDrawerProps {
  isDarkMode: boolean;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export default function SearchDrawer({ isDarkMode, children, onOpenChange }: SearchDrawerProps) {
  const [searchValue, setSearchValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Convex hooks
  // const searchAndAddCompany = useAction(api.search.searchAndAddCompany);

  // Disable text selection on the page while drawer is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("select-none");
    } else {
      document.body.classList.remove("select-none");
    }
    return () => {
      document.body.classList.remove("select-none");
    };
  }, [open]);

  // Handle escape key for this drawer specifically
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          // Clear selection and prevent event from bubbling
          selection.removeAllRanges();
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // No selection: close drawer
        setOpen(false);
        onOpenChange?.(false);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onOpenChange]);
  
  // Custom frame background style matching DashboardFrame
  const frameBackgroundStyle = {
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.50)',
    boxShadow: '0px 0px 16px 0px rgba(159, 159, 159, 0.34), 0px 0px 40px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 12px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 24px 0px rgba(204, 186, 255, 0.80) inset',
    filter: 'blur(6px)',
    backdropFilter: 'blur(13.5px)',
    transition: 'all 0.3s ease-in-out'
  };

  const recentSearches = [
    "OpenAI funding",
    "AI startup trends", 
    "SaaS metrics",
    "Y Combinator companies"
  ];

  const suggestionItems = [
    { icon: TrendingUp, label: "Market Trends", description: "Latest industry insights" },
    { icon: Users, label: "Company Profiles", description: "Search company information" },
    { icon: FileText, label: "Research Reports", description: "Access detailed reports" },
    { icon: Command, label: "Quick Actions", description: "Perform common tasks" }
  ];

  // Handle adding company to Lead Radar
  const handleAddCompany = async () => {
    if (!companyName.trim() || !website.trim()) {
      toast.error("Please enter both company name and website");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement search functionality
      // const result = await searchAndAddCompany({
      //   companyName: companyName.trim(),
      //   website: website.trim(),
      //   source: "search_drawer",
      // });

      // Temporary success message
      toast.success(`🎉 ${companyName} search completed! (Feature will be re-enabled soon...)`);

      // if (result.isNew) {
      //   toast.success(`🎉 ${companyName} added to Lead Radar! Enrichment in progress...`);
      // } else {
      //   toast.info(`${companyName} is already in your Lead Radar`);
      // }

      // Clear form and close drawer
      setCompanyName("");
      setWebsite("");
      setSearchValue("");
      setOpen(false);
      onOpenChange?.(false);
      
    } catch (error) {
      console.error("Failed to add company:", error);
      toast.error(`Failed to add ${companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse search input to extract company name and website
  const parseSearchInput = (input: string) => {
    // Simple parsing - users can type "Company Name - website.com" or just "website.com"
    if (input.includes(" - ")) {
      const [name, url] = input.split(" - ");
      setCompanyName(name.trim());
      setWebsite(url.trim());
    } else if (input.includes(".")) {
      // Looks like a website
      setWebsite(input.trim());
      setCompanyName("");
    } else {
      // Just a company name
      setCompanyName(input.trim());
      setWebsite("");
    }
  };

  // Update parsing when search value changes
  React.useEffect(() => {
    if (searchValue) {
      parseSearchInput(searchValue);
    }
  }, [searchValue]);

  return (
    <Drawer 
      shouldScaleBackground={false}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
    >
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="border-none bg-transparent shadow-none fixed inset-12 z-50 focus:outline-none !mt-0 !rounded-none">
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
          <div className="relative z-10 p-8 select-text">
            <DrawerHeader className="text-center pb-6">
              <DrawerTitle className="text-2xl font-semibold text-gray-900">
                Research Search
              </DrawerTitle>
              <DrawerDescription className="text-gray-600">
                Search through companies, markets, and insights
              </DrawerDescription>
            </DrawerHeader>

            {/* Search Input */}
            <div className="space-y-4 mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Type: Company Name - website.com (or just website.com)"
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border border-gray-200/60 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all duration-200"
                  autoFocus
                />
              </div>
              
              {/* Parsed fields preview */}
              {(companyName || website) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company Name"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200/60 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all duration-200"
                    />
                  </div>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="website.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200/60 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all duration-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recent Searches */}
            {!searchValue && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => setSearchValue(search)}
                      className="px-3 py-2 text-sm rounded-lg bg-white/60 border border-gray-200/60 hover:bg-purple-50/60 hover:border-purple-200/60 transition-all duration-200"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {suggestionItems.map((suggestion) => {
                const IconComponent = suggestion.icon;
                return (
                  <button
                    key={suggestion.label}
                    className="p-4 rounded-xl bg-white/60 border border-gray-200/60 hover:bg-purple-50/60 hover:border-purple-200/60 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-100/60 group-hover:bg-purple-200/60 transition-colors duration-200">
                        <IconComponent className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">{suggestion.label}</h4>
                        <p className="text-sm text-gray-600">{suggestion.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <DrawerFooter className="flex flex-row gap-3 pt-0">
              <button
                onClick={handleAddCompany}
                disabled={!companyName.trim() || !website.trim() || isSubmitting}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add to Lead Radar
                  </>
                )}
              </button>
              <DrawerClose asChild>
                <button className="px-6 py-3 bg-white/60 border border-gray-200/60 hover:bg-gray-50/60 rounded-lg font-medium transition-colors duration-200">
                  Cancel
                </button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 