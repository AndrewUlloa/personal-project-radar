"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DockTooltipProps {
  children: React.ReactNode;
  content: string;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export default function DockTooltip({ 
  children, 
  content, 
  shortcut, 
  side = "top" 
}: DockTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger 
          asChild
          onClick={(e) => {
            // Don't prevent default or stop propagation 
            // Let the click event bubble up to parent components
          }}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={8}
          className="bg-white/30 supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 border border-gray-200/50 backdrop-blur-md rounded-xl px-3 py-2 text-sm font-medium text-gray-900 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span>{content}</span>
            {shortcut && (
              <span className="text-xs text-gray-600 bg-gray-100/60 px-1.5 py-0.5 rounded border border-gray-200/60">
                {shortcut}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 