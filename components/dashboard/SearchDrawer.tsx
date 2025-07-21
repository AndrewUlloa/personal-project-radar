"use client";

import * as React from "react";
import { useEffect } from "react";
import { Search, Command, History, TrendingUp, Users, FileText } from "lucide-react";
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

interface SearchDrawerProps {
  isDarkMode: boolean;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export default function SearchDrawer({ isDarkMode, children, onOpenChange }: SearchDrawerProps) {
  const [searchValue, setSearchValue] = React.useState("");
  const [open, setOpen] = React.useState(false);

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

  const searchSuggestions = [
    { icon: TrendingUp, label: "Market Trends", description: "Latest industry insights" },
    { icon: Users, label: "Company Profiles", description: "Search company information" },
    { icon: FileText, label: "Research Reports", description: "Access detailed reports" },
    { icon: Command, label: "Quick Actions", description: "Perform common tasks" }
  ];

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
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search for companies, markets, or insights..."
                className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border border-gray-200/60 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all duration-200"
                autoFocus
              />
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
              {searchSuggestions.map((suggestion) => {
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
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!searchValue}
              >
                Search
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