"use client";

import * as React from "react";
import { useEffect } from "react";
import { Telescope } from "lucide-react";
import { toast } from "sonner";
import CompanyResearcher from "../CompanyResearchHome";
import { DockIcon } from "@/components/magicui/dock";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface SearchDockIconProps {
  isDarkMode: boolean;
  onOpenChange?: (open: boolean) => void;
  shouldOpen?: boolean;
  isKeyboardTriggered?: boolean;
  forceCloseSignal?: number; // New prop to trigger external close
}

export default function SearchDockIcon({ isDarkMode, onOpenChange, shouldOpen, isKeyboardTriggered = false, forceCloseSignal }: SearchDockIconProps) {
  const [open, setOpen] = React.useState(shouldOpen ?? false);

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
              G
            </kbd>
            <span className="text-gray-500">then</span>
            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded-md shadow-sm">
              S
            </kbd>
          </div>
          <span>to use Search</span>
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

  // No custom suggestions; we will embed CompanyResearcher instead

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
                <Telescope className={`h-6 w-6 transition-colors duration-300 ${
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
              <span>Search</span>
              <span className="text-xs text-gray-600 bg-gray-100/60 px-1.5 py-0.5 rounded border border-gray-200/60">
                G then S
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
            <div className="relative z-10 p-8 select-text">
              <DrawerHeader className="text-center pb-6">
                <DrawerTitle className="text-2xl font-semibold text-gray-900">
                  Research Search
                </DrawerTitle>
                <DrawerDescription className="text-gray-600">
                  Search through companies, markets, and insights
                </DrawerDescription>
              </DrawerHeader>

               {/* Embedded CompanyResearcher content */}
               <div className="max-h-[calc(100vh-16rem)] overflow-y-auto scrollbar-thin">
                 <div className="w-full [&>div]:!max-w-none [&>div]:!w-full [&>div]:!p-0 [&>div]:!mt-0 [&>div]:!mb-8 [&>div]:!z-auto">
                   <CompanyResearcher />
                 </div>
               </div>

            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </TooltipProvider>
  );
} 