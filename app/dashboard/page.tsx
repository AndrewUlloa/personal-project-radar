"use client";

import { AutoHideDock, DockIcon } from "@/components/magicui/dock";
import { Home, Search, Settings, User, Sun, Moon, Command } from "lucide-react";
import { useState, useEffect } from "react";
import { CommandPalette } from "@/components/ui/command-palette";
import { NoSSR } from "@/components/ui/no-ssr";

// Force light theme styles and override Dark Reader
const lightThemeStyle = `
  .dashboard-container {
    background: radial-gradient(119.83% 50% at 50% 50%, rgba(255, 255, 255, 0.44) 0%, rgba(177, 174, 223, 0.87) 100%), #FFF !important;
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
`;

export default function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    // Disable Dark Reader for this specific page
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-darkreader-ignore', 'true');
    }

    // Keyboard shortcut for command palette (Cmd+K / Ctrl+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const openCommandPalette = () => {
    setIsCommandPaletteOpen(true);
  };

  const closeCommandPalette = () => {
    setIsCommandPaletteOpen(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: lightThemeStyle }} />
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      <div 
        className={`min-h-screen relative dashboard-container ${
          isDarkMode ? "dark-mode" : ""
        }`}
        suppressHydrationWarning={true}
        style={{
          colorScheme: isDarkMode ? "dark" : "light",
          transition: "all 0.3s ease-in-out"
        }}
      >
      <div className="container mx-auto px-4 py-8">
                  <div className="mb-8">
            <h1 className={`text-4xl font-bold mb-2 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>
              Lead Researcher Dashboard
            </h1>
            <p className={`text-lg transition-colors duration-300 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}>
              Comprehensive research and analytics platform
            </p>
          </div>
        
        {/* Main dashboard content area - ready for components */}
        <div className="grid gap-6">
          {/* Components will be added here */}
        </div>
      </div>
      
            {/* Dock positioned at center bottom */}
      <NoSSR fallback={
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="mx-auto mt-8 flex h-[58px] w-max items-center justify-center gap-2 rounded-2xl border p-2 backdrop-blur-md bg-white/80 border-gray-200/50">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex aspect-square cursor-pointer items-center justify-center rounded-full p-2">
                <div className="h-6 w-6 bg-gray-300 rounded" />
              </div>
            ))}
          </div>
        </div>
      }>
        <AutoHideDock 
          triggerHeight={30}
          hideDelay={1500}
          showAnimation={true}
        >
          <DockIcon>
            <Home className={`h-6 w-6 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`} />
          </DockIcon>
          <DockIcon>
            <Search className={`h-6 w-6 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`} />
          </DockIcon>
          <DockIcon>
            <User className={`h-6 w-6 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`} />
          </DockIcon>
          <DockIcon>
            <Settings className={`h-6 w-6 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`} />
          </DockIcon>
          <DockIcon onClick={openCommandPalette} className="cursor-pointer">
            <Command className={`h-6 w-6 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`} />
          </DockIcon>
          <DockIcon onClick={toggleTheme} className="cursor-pointer">
            {isDarkMode ? (
              <Sun className="h-6 w-6 text-yellow-400 transition-colors duration-300" />
            ) : (
              <Moon className="h-6 w-6 text-gray-700 transition-colors duration-300" />
            )}
          </DockIcon>
        </AutoHideDock>
      </NoSSR>
      </div>
    </>
  );
} 