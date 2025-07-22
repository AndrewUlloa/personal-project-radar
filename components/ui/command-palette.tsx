"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Search, Home, User, Settings, Sun, Moon, X } from "lucide-react";
import { BookmarkCheckIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useCallback } from "react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSearch?: () => void;
  onOpenLeadRadar?: () => void;
  onCloseAllDrawers?: () => void;
}

export function CommandPalette({ 
  isOpen, 
  onClose, 
  isDarkMode, 
  onToggleTheme, 
  onOpenSearch,
  onOpenLeadRadar,
  onCloseAllDrawers 
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard events when command palette is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Cmd+K to close command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      
      // Handle Escape to close command palette
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Handle Command shortcuts within command palette
      if ((e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        
        switch (e.key) {
          case '1':
            // Close all overlays including command palette
            onCloseAllDrawers?.();
            onClose();
            break;
          case '2':
            // Open Search
            handleSearchCommand();
            break;
          case '3':
            // Open Lead Radar
            handleLeadRadarCommand();
            break;
          case '\\':
            // Toggle theme
            onToggleTheme();
            onClose();
            break;
        }
        return;
      }
      
      // Block dock shortcuts when command palette is open to prevent interference
      const isDockShortcut = (
        (e.key === '1' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '2' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '3' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '\\' && (e.metaKey || e.ctrlKey))
      );
      
      if (isDockShortcut) {
        e.stopPropagation();
        // Don't prevent default to allow normal typing in input
      }
    };

    // Use capture phase to intercept events before they reach dashboard layout
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, onToggleTheme, onCloseAllDrawers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus the input when the command palette opens
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        // Focus immediately when modal opens
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleSearchCommand = useCallback(() => {
    // Close any open drawers first
    onCloseAllDrawers?.();
    // Delay to ensure smooth ease-out transition completes before opening new drawer
    setTimeout(() => {
      onOpenSearch?.();
    }, 150);
    onClose();
  }, [onCloseAllDrawers, onOpenSearch, onClose]);

  const handleLeadRadarCommand = useCallback(() => {
    // Close any open drawers first
    onCloseAllDrawers?.();
    // Delay to ensure smooth ease-out transition completes before opening new drawer
    setTimeout(() => {
      onOpenLeadRadar?.();
    }, 150);
    onClose();
  }, [onCloseAllDrawers, onOpenLeadRadar, onClose]);

  const handleHomeCommand = () => {
    // Close all drawers and command palette
    onCloseAllDrawers?.();
    onClose();
  };

  const handleSettingsCommand = () => {
    // For now just close the palette, in future could add routing
    onClose();
    console.log('Open Settings');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ 
              willChange: 'opacity', 
              zIndex: 200000002,
              pointerEvents: 'auto'
            }}
            onClick={onClose}
          />

          {/* Command Palette */}
          <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ 
              zIndex: 200000003,
              pointerEvents: 'auto'
            }}
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-lg"
              style={{ willChange: 'transform, opacity' }}
            >
            <Command
              className={cn(
                "overflow-hidden rounded-2xl border backdrop-blur-md shadow-2xl",
                isDarkMode 
                  ? "bg-black/20 border-white/10" 
                  : "bg-white/80 border-gray-200/50"
              )}
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
              shouldFilter={true}
              filter={(value, search, keywords) => {
                const extendValue = value + " " + (keywords?.join(" ") || "");
                return extendValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
              }}
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-gray-200/20 px-4">
                <Search className={cn(
                  "mr-2 h-4 w-4 shrink-0",
                  isDarkMode ? "text-gray-300" : "text-gray-500"
                )} />
                <Command.Input
                  ref={inputRef}
                  placeholder="Search commands..."
                  className={cn(
                    "flex h-12 w-full bg-transparent py-3 text-base outline-none placeholder:text-gray-500",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}
                />
                <button
                  onClick={onClose}
                  title="Close command palette"
                  className={cn(
                    "ml-2 rounded-lg p-1 transition-colors",
                    isDarkMode 
                      ? "hover:bg-white/10 text-gray-300" 
                      : "hover:bg-gray-100 text-gray-500"
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Commands List */}
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className={cn(
                  "py-6 text-center text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  No results found.
                </Command.Empty>

                <Command.Group 
                  heading="Quick Actions" 
                  className={cn(
                    "mb-2 px-2 py-1.5 text-xs font-medium",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  <Command.Item 
                    keywords={["search", "find", "discover", "research", "company"]}
                    onSelect={handleSearchCommand}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isDarkMode 
                        ? "hover:bg-white/10 text-gray-200 data-[selected=true]:bg-white/10" 
                        : "hover:bg-gray-100/80 text-gray-800 data-[selected=true]:bg-gray-100/80"
                    )}
                  >
                    <Search className="h-4 w-4" />
                    <span>Open Search</span>
                    <div className="ml-auto flex items-center gap-1">
                      <kbd className={cn(
                        "px-1.5 py-0.5 text-xs font-mono rounded border",
                        isDarkMode 
                          ? "bg-gray-800 border-gray-600 text-gray-300" 
                          : "bg-gray-100 border-gray-300 text-gray-600"
                      )}>
                        ⌘2
                      </kbd>
                    </div>
                  </Command.Item>

                  <Command.Item 
                    keywords={["lead", "radar", "leads", "pipeline", "tracking", "watch", "watcher"]}
                    onSelect={handleLeadRadarCommand}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isDarkMode 
                        ? "hover:bg-white/10 text-gray-200 data-[selected=true]:bg-white/10" 
                        : "hover:bg-gray-100/80 text-gray-800 data-[selected=true]:bg-gray-100/80"
                    )}
                  >
                    <BookmarkCheckIcon className="h-4 w-4" />
                    <span>Open Lead Radar</span>
                    <div className="ml-auto flex items-center gap-1">
                      <kbd className={cn(
                        "px-1.5 py-0.5 text-xs font-mono rounded border",
                        isDarkMode 
                          ? "bg-gray-800 border-gray-600 text-gray-300" 
                          : "bg-gray-100 border-gray-300 text-gray-600"
                      )}>
                        ⌘3
                      </kbd>
                    </div>
                  </Command.Item>
                </Command.Group>

                <Command.Group 
                  heading="Navigation" 
                  className={cn(
                    "mb-2 px-2 py-1.5 text-xs font-medium",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  <Command.Item 
                    keywords={["home", "dashboard", "main", "close", "overlays"]}
                    onSelect={handleHomeCommand}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isDarkMode 
                        ? "hover:bg-white/10 text-gray-200 data-[selected=true]:bg-white/10" 
                        : "hover:bg-gray-100/80 text-gray-800 data-[selected=true]:bg-gray-100/80"
                    )}
                  >
                    <Home className="h-4 w-4" />
                    <span>Go to Home</span>
                    <div className="ml-auto flex items-center gap-1">
                      <kbd className={cn(
                        "px-1.5 py-0.5 text-xs font-mono rounded border",
                        isDarkMode 
                          ? "bg-gray-800 border-gray-600 text-gray-300" 
                          : "bg-gray-100 border-gray-300 text-gray-600"
                      )}>
                        ⌘1
                      </kbd>
                    </div>
                  </Command.Item>

                  <Command.Item 
                    keywords={["settings", "preferences", "config", "configuration"]}
                    onSelect={handleSettingsCommand}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isDarkMode 
                        ? "hover:bg-white/10 text-gray-200 data-[selected=true]:bg-white/10" 
                        : "hover:bg-gray-100/80 text-gray-800 data-[selected=true]:bg-gray-100/80"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                    <div className="ml-auto flex items-center gap-1">
                      <kbd className={cn(
                        "px-1.5 py-0.5 text-xs font-mono rounded border",
                        isDarkMode 
                          ? "bg-gray-800 border-gray-600 text-gray-300" 
                          : "bg-gray-100 border-gray-300 text-gray-600"
                      )}>
                        ⌘;
                      </kbd>
                    </div>
                  </Command.Item>
                </Command.Group>

                <Command.Group 
                  heading="Theme" 
                  className={cn(
                    "mb-2 px-2 py-1.5 text-xs font-medium",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  <Command.Item 
                    keywords={["theme", "dark", "light", "mode", "appearance", "toggle"]}
                    onSelect={() => {
                      onToggleTheme();
                      onClose();
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isDarkMode 
                        ? "hover:bg-white/10 text-gray-200 data-[selected=true]:bg-white/10" 
                        : "hover:bg-gray-100/80 text-gray-800 data-[selected=true]:bg-gray-100/80"
                    )}
                  >
                    {isDarkMode ? (
                      <>
                        <Sun className="h-4 w-4 text-yellow-400" />
                        <span>Switch to Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        <span>Switch to Dark Mode</span>
                      </>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <kbd className={cn(
                        "px-1.5 py-0.5 text-xs font-mono rounded border",
                        isDarkMode 
                          ? "bg-gray-800 border-gray-600 text-gray-300" 
                          : "bg-gray-100 border-gray-300 text-gray-600"
                      )}>
                        ⌘\
                      </kbd>
                    </div>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
} 