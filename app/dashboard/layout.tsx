"use client";

import { AutoHideDock, DockIcon } from "@/components/magicui/dock";
import { Home, Settings, User, Sun, Moon, Command } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { CommandPalette } from "@/components/ui/command-palette";
import { NoSSR } from "@/components/ui/no-ssr";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
import DockTooltip from "@/components/dashboard/DockTooltip";
import SearchDockIcon from "@/components/dashboard/SearchDockIcon";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Force light theme styles and override Dark Reader
const lightThemeStyle = `
  .dashboard-container {
    background: radial-gradient(119.83% 50% at 50% 50%, rgba(255, 255, 252, 0.00) 0%, rgba(177, 174, 223, 0.70) 100%), #FFF !important;
    box-shadow: -16px 0px 92px 0px #FFF inset !important;
  }
  .dashboard-container.dark-mode {
    background: radial-gradient(119.83% 50% at 50% 50%, rgba(15, 15, 15, 0.44) 0%, rgba(40, 37, 83, 0.87) 100%), #000 !important;
    box-shadow: -16px 0px 92px 0px #000 inset !important;
  }
  .dashboard-container * {
    color-scheme: light !important;
  }
  .dashboard-container .dark\\:bg-black\\/10 {
    background: rgba(255, 255, 255, 0.1) !important;
  }
  .dashboard-container [data-darkreader-inline-stroke] {
    stroke: currentColor !important;
  }
  .dashboard-container [data-darkreader-inline-bgcolor] {
    background: unset !important;
  }
  .dashboard-container [data-darkreader-inline-bgimage] {
    background-image: unset !important;
  }
  .dashboard-container [data-darkreader-inline-boxshadow] {
    box-shadow: unset !important;
  }
  
  /* Center align Sonner toasts */
  [data-sonner-toast] {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
  }
  [data-sonner-toast] > div {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
    width: 100% !important;
  }
  /* Fix hover issue when drawer overlay present */
  [data-sonner-toaster] {
    z-index: 100000000 !important;
    pointer-events: auto !important;
  }
  [data-sonner-toast] {
    pointer-events: auto !important;
  }
  
  /* Ensure dock is always on top of everything including toasts */
  .dock-container {
    z-index: 200000000 !important;
    pointer-events: auto !important;
  }
  
  /* Ensure dock trigger area always works */
  .dock-trigger-area {
    z-index: 200000001 !important;
    pointer-events: auto !important;
  }
`;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [, setIsClient] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  // Ref to track if 'g' was pressed for combo shortcuts
  const gPressedRef = useRef(false);
  const [triggerSearch, setTriggerSearch] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(!isDarkMode);
  }, [isDarkMode]);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  // Toast helper for dock icon clicks with custom JSX content
  const showKeyboardShortcutToast = useCallback((action: string, keys: string[]) => {
    toast((
      <div className="flex items-center justify-center gap-1 text-sm text-center w-full">
        <span>Next time, hit</span>
        <div className="flex items-center gap-1 mx-1">
          {keys.map((key, index) => (
            <div key={index} className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                {key}
              </kbd>
              {index < keys.length - 1 && <span className="text-gray-500">then</span>}
            </div>
          ))}
        </div>
        <span>{action}</span>
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
  }, []);

  // Refs for stable callbacks inside keyboard handler
  const toggleThemeRef = useRef(toggleTheme);
  const setIsCommandPaletteOpenRef = useRef(setIsCommandPaletteOpen);
  const setTriggerSearchRef = useRef(setTriggerSearch);

  useEffect(() => {
    toggleThemeRef.current = toggleTheme;
    setIsCommandPaletteOpenRef.current = setIsCommandPaletteOpen;
    setTriggerSearchRef.current = setTriggerSearch;
  }, [toggleTheme, setIsCommandPaletteOpen, setTriggerSearch]);

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);
    
    // Disable Dark Reader for this specific page more aggressively
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-darkreader-ignore', 'true');
      document.documentElement.setAttribute('data-darkreader-mode', 'disabled');
      document.body.setAttribute('data-darkreader-ignore', 'true');
      
      // Remove any existing Dark Reader attributes
      const elementsWithDarkReader = document.querySelectorAll('[data-darkreader-inline-bgcolor], [data-darkreader-inline-bgimage], [data-darkreader-inline-boxshadow]');
      elementsWithDarkReader.forEach(el => {
        el.removeAttribute('data-darkreader-inline-bgcolor');
        el.removeAttribute('data-darkreader-inline-bgimage');
        el.removeAttribute('data-darkreader-inline-boxshadow');
      });
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Cmd+K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpenRef.current(prev => !prev);
        return;
      }
      
      // Escape key - only handle command palette, let drawers handle themselves
      if (e.key === 'Escape') {
        // Only close command palette with escape, drawers will handle their own escape
        setIsCommandPaletteOpenRef.current(false);
        gPressedRef.current = false;
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
        setTriggerSearchRef.current(false);
        return;
      }

      // G key shortcuts
      if (e.key.toLowerCase() === 'g' && !gPressedRef.current) {
        e.preventDefault();
        gPressedRef.current = true;
        // Reset G key after 2 seconds
        setTimeout(() => {
          gPressedRef.current = false;
        }, 2000);
        return;
      }

      // G + [key] combinations
      if (gPressedRef.current) {
        e.preventDefault();
        gPressedRef.current = false;
        
        switch (e.key.toLowerCase()) {
          case 'h':
            // Close overlays (search drawer, command palette, etc.)
            setIsCommandPaletteOpenRef.current(false);
            setIsSearchDrawerOpen(false);
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = null;
            }
            setTriggerSearchRef.current(false);
            break;
          case 's':
            // Trigger search drawer
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            setTriggerSearchRef.current(true);
            searchTimeoutRef.current = setTimeout(() => {
              setTriggerSearchRef.current(false);
              searchTimeoutRef.current = null;
            }, 100);
            break;
          case 'u':
            // Open profile - could add routing here
            console.log('Open Profile');
            break;
          case ';':
            // Open settings - could add routing here
            console.log('Open Settings');
            break;
          case 't':
            // Toggle theme
            toggleThemeRef.current();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: lightThemeStyle }} />
      
      {/* Prevent Dark Reader */}
      <meta name="darkreader-lock" content="true" />
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      <div 
        className={`h-screen w-screen relative dashboard-container ${
          isDarkMode ? "dark-mode" : ""
        }`}
        suppressHydrationWarning={true}
        data-darkreader-ignore="true"
        style={{
          colorScheme: isDarkMode ? "dark" : "light",
          transition: "all 0.3s ease-in-out"
        }}
      >
        {/* Main Dashboard Frame */}
        <DashboardFrame isDarkMode={isDarkMode}>
          {children}
        </DashboardFrame>
        
        {/* Dock positioned at center bottom */}
        <NoSSR fallback={
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 dock-container opacity-100">
            <div className="mx-auto mt-8 flex h-[58px] w-max items-center justify-center gap-2 rounded-2xl border p-2 backdrop-blur-md bg-white/80 border-gray-200/50">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex aspect-square cursor-pointer items-center justify-center rounded-full p-2">
                  <div className="h-6 w-6 bg-gray-300 rounded" />
                </div>
              ))}
            </div>
          </div>
        }>
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 dock-container opacity-100">
            <AutoHideDock 
              triggerHeight={128}
              hideDelay={175}
              showAnimation={true}
              showOnLoad={true}
              initialShowDuration={5000}
            >
            <DockTooltip content="Home" shortcut="G then H">
              <DockIcon 
                onClick={() => showKeyboardShortcutToast("to go Home", ["G", "H"])}
                className="cursor-pointer"
              >
                <Home className={`h-6 w-6 transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`} />
              </DockIcon>
            </DockTooltip>
            <SearchDockIcon 
              isDarkMode={isDarkMode}
              onOpenChange={setIsSearchDrawerOpen}
              isKeyboardTriggered={false}
            />
            <DockTooltip content="Profile" shortcut="G then U">
              <DockIcon 
                onClick={() => showKeyboardShortcutToast("to go to Profile", ["G", "U"])}
                className="cursor-pointer"
              >
                <User className={`h-6 w-6 transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`} />
              </DockIcon>
            </DockTooltip>
            <DockTooltip content="Settings" shortcut="G then ;">
              <DockIcon 
                onClick={() => showKeyboardShortcutToast("to go to Settings", ["G", ";"])}
                className="cursor-pointer"
              >
                <Settings className={`h-6 w-6 transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`} />
              </DockIcon>
            </DockTooltip>
            <DockTooltip content="Command Palette" shortcut="⌘K">
              <DockIcon 
                onClick={() => {
                  openCommandPalette();
                  showKeyboardShortcutToast("to use Command Palette", ["⌘K"]);
                }} 
                className="cursor-pointer"
              >
                <Command className={`h-6 w-6 transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-700"
                }`} />
              </DockIcon>
            </DockTooltip>
            <DockTooltip content={isDarkMode ? "Light Mode" : "Dark Mode"} shortcut="G then T">
              <DockIcon 
                onClick={() => {
                  toggleTheme();
                  showKeyboardShortcutToast("to swap theme", ["G", "T"]);
                }} 
                className="cursor-pointer"
              >
                {isDarkMode ? (
                  <Sun className="h-6 w-6 text-yellow-400 transition-colors duration-300" />
                ) : (
                  <Moon className="h-6 w-6 text-gray-700 transition-colors duration-300" />
                )}
              </DockIcon>
            </DockTooltip>
            </AutoHideDock>
          </div>
        </NoSSR>

        {/* Invisible SearchDockIcon to listen for keyboard shortcut even when dock hidden */}
        <div className="hidden">
          <SearchDockIcon
            isDarkMode={isDarkMode}
            onOpenChange={setIsSearchDrawerOpen}
            shouldOpen={triggerSearch}
            isKeyboardTriggered={true}
          />
        </div>
      </div>
      <Toaster />
    </>
  );
} 