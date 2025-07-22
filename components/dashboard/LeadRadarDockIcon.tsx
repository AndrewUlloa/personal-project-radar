"use client";

import * as React from "react";
import { useEffect } from "react";
import { BookmarkCheckIcon } from "@/components/ui/icons";
import { TrendingUp, Building2, DollarSign, Target, Clock, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DockIcon } from "@/components/magicui/dock";
import { LeadTable } from "@/components/leads/LeadTable";
import { useLeadRadar } from "@/lib/contexts/LeadRadarContext";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeadRadarDockIconProps {
  isDarkMode: boolean;
  onOpenChange?: (open: boolean) => void;
  shouldOpen?: boolean;
  isKeyboardTriggered?: boolean;
  forceCloseSignal?: number; // New prop to force close externally
}

export default function LeadRadarDockIcon({ 
  isDarkMode, 
  onOpenChange, 
  shouldOpen, 
  isKeyboardTriggered = false,
  forceCloseSignal
}: LeadRadarDockIconProps) {
  const [open, setOpen] = React.useState(shouldOpen ?? false);
  const { 
    leads, 
    clearAllLeads, 
    getNewLeadsLast24h, 
    getAverageLeadScore, 
    getEstimatedPipelineValue, 
    getHighPriorityLeadsCount 
  } = useLeadRadar();

  // Close drawer if forceCloseSignal changes
  React.useEffect(() => {
    if (open) {
      setOpen(false);
      onOpenChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceCloseSignal]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("select-none");
    } else {
      document.body.classList.remove("select-none");
    }
    return () => document.body.classList.remove("select-none");
  }, [open]);
  
  const handleOpenChange = React.useCallback((newOpen: boolean, fromClick = false) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    
    // Show toast only when opened via click (not keyboard)
    if (newOpen && fromClick && !isKeyboardTriggered) {
      toast((
        <div className="flex items-center justify-center gap-1 text-sm text-center w-full">
          <span>Next time, hit</span>
          <div className="flex items-center gap-1 mx-1">
            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded-md shadow-sm">
              ⌘3
            </kbd>
          </div>
          <span>to use Lead Radar</span>
        </div>
      ), {
        duration: 4000,
        position: "top-center",
        style: {
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        },
        className: "!justify-center !text-center"
      });
    }
  }, [onOpenChange, isKeyboardTriggered]);

  // Handle escape key for this drawer specifically
  useEffect(() => {
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
        handleOpenChange(false);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, handleOpenChange]);
  
  // Handle external trigger to open
  React.useEffect(() => {
    if (shouldOpen && !open) {
      handleOpenChange(true);
    }
  }, [shouldOpen, open, handleOpenChange]);

  // Custom frame background style matching DashboardFrame
  const frameBackgroundStyle = {
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.50)',
    boxShadow: '0px 0px 16px 0px rgba(159, 159, 159, 0.34), 0px 0px 40px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 12px 0px rgba(204, 186, 255, 0.20) inset, 0px 0px 24px 0px rgba(204, 186, 255, 0.80) inset',
    filter: 'blur(6px)',
    backdropFilter: 'blur(13.5px)',
    transition: 'all 0.3s ease-in-out'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate KPI metrics
  const newLeadsLast24h = getNewLeadsLast24h();
  const averageLeadScore = getAverageLeadScore();
  const estimatedPipelineValue = getEstimatedPipelineValue();
  const highPriorityLeadsCount = getHighPriorityLeadsCount();

  const leadStats = [
    { 
      icon: Clock, 
      label: "New Leads (Last 24h)", 
      value: newLeadsLast24h.toString(),
      description: "Recently discovered leads",
      change: "+12%",
      isPositive: true
    },
    { 
      icon: TrendingUp, 
      label: "Average Lead Score", 
      value: averageLeadScore.toString(),
      description: "Overall lead quality",
      change: "+5.2%", 
      isPositive: true
    },
    { 
      icon: DollarSign, 
      label: "Est. Pipeline Value", 
      value: formatCurrency(estimatedPipelineValue),
      description: "Potential revenue (Score >70)",
      change: "+18%",
      isPositive: true
    },
    { 
      icon: Target, 
      label: "High-Priority Leads", 
      value: highPriorityLeadsCount.toString(),
      description: "Score ≥ 80 (Action required)",
      change: "+3",
      isPositive: true,
      isPrimary: true
    }
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <Drawer open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DockIcon 
                className="cursor-pointer"
                onClick={() => handleOpenChange(true, true)}
              >
                <BookmarkCheckIcon className={`h-6 w-6 transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`} />
              </DockIcon>
            </div>
          </TooltipTrigger>
          
          <TooltipContent
            side="top"
            sideOffset={8}
            className="bg-white/30 supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 border border-gray-200/50 backdrop-blur-md rounded-xl px-3 py-2 text-sm font-medium text-gray-900 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span>Lead Radar</span>
              <span className="text-xs text-gray-600 bg-gray-100/60 px-1.5 py-0.5 rounded border border-gray-200/60">
                ⌘3
              </span>
            </div>
          </TooltipContent>
        </Tooltip>

        <DrawerContent className="border-none bg-transparent shadow-none fixed inset-12 z-50 focus:outline-none !mt-0 !rounded-none">
          <div className="w-full relative h-full pointer-events-auto">
            {/* Blurred background layer */}
            <div 
              className="absolute inset-0 rounded-t-3xl"
              style={frameBackgroundStyle}
              suppressHydrationWarning={true}
              data-darkreader-ignore="true"
            />
            
            {/* Content layer */}
            <div className="relative z-10 p-8 select-text h-full flex flex-col">
              <DrawerHeader className="text-center pb-6">
                <DrawerTitle className="text-2xl font-semibold text-gray-900 flex items-center justify-center gap-2">
                  <BookmarkCheckIcon className="h-6 w-6 text-purple-600" />
                  Lead-Radar Dashboard
                </DrawerTitle>
                <DrawerDescription className="text-gray-600">
                  AI-powered lead discovery and prioritization for jewelry retailers
                </DrawerDescription>
              </DrawerHeader>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {leadStats.map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className={`p-4 rounded-xl bg-white/60 border border-gray-200/60 ${
                        stat.isPrimary ? 'ring-2 ring-purple-200 bg-purple-50/60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          stat.isPrimary ? 'bg-purple-200/60' : 'bg-purple-100/60'
                        }`}>
                          <IconComponent className={`h-5 w-5 ${
                            stat.isPrimary ? 'text-purple-700' : 'text-purple-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                            {stat.change && (
                              <div className={`text-xs px-1.5 py-0.5 rounded text-white ${
                                stat.isPositive ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                                {stat.change}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-700">{stat.label}</div>
                          <div className="text-xs text-gray-500">{stat.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Alert for high-priority leads */}
              {highPriorityLeadsCount > 0 && (
                <div className="mb-4 p-3 bg-orange-50/60 border border-orange-200/60 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      {highPriorityLeadsCount} high-priority lead{highPriorityLeadsCount > 1 ? 's' : ''} requiring immediate attention
                    </span>
                  </div>
                </div>
              )}

              {/* Lead Table */}
              <div className="flex-1 overflow-hidden">
                <LeadTable />
              </div>


            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </TooltipProvider>
  );
} 