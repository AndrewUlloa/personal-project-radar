"use client";

import { Command } from "cmdk";
import { Search, Home, User, Settings, Sun, Moon, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function CommandPalette({ isOpen, onClose, isDarkMode, onToggleTheme }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard events when command palette is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // Auto-focus the input when the command palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus immediately when modal opens
      inputRef.current.focus();
    }
  }, [isOpen]);
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            style={{ willChange: 'opacity' }}
            onClick={onClose}
          />

          {/* Command Palette */}
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
              onClick={(e) => e.stopPropagation()}
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
                  heading="Navigation" 
                  className={cn(
                    "mb-2 px-2 py-1.5 text-xs font-medium",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  <Command.Item className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isDarkMode 
                      ? "hover:bg-white/10 text-gray-200" 
                      : "hover:bg-gray-100/80 text-gray-800"
                  )}>
                    <Home className="h-4 w-4" />
                    <span>Go to Home</span>
                  </Command.Item>

                  <Command.Item className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isDarkMode 
                      ? "hover:bg-white/10 text-gray-200" 
                      : "hover:bg-gray-100/80 text-gray-800"
                  )}>
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Command.Item>

                  <Command.Item className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isDarkMode 
                      ? "hover:bg-white/10 text-gray-200" 
                      : "hover:bg-gray-100/80 text-gray-800"
                  )}>
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
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
                    onSelect={onToggleTheme}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isDarkMode 
                        ? "hover:bg-white/10 text-gray-200" 
                        : "hover:bg-gray-100/80 text-gray-800"
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