"use client";

import { ChartLineInteractive } from "@/components/dashboard/ChartLineInteractive";
import { ChartAreaGradient } from "@/components/dashboard/ChartAreaGradient";
import { ChartBarLabel } from "@/components/dashboard/ChartBarLabel";
import { ChartRadialShape } from "@/components/dashboard/ChartRadialShape";
import { ChartRadialText } from "@/components/dashboard/ChartRadialText";
import { ChartRadarGridCustom } from "@/components/dashboard/ChartRadarGridCustom";
import { ChartBarStacked } from "@/components/dashboard/ChartBarStacked";
import { ConvexTestDashboard } from "@/components/dashboard/ConvexTestDashboard";
import { Phase6TestDashboard } from "@/components/dashboard/Phase6TestDashboard";
import { Phase7AutomationDashboard } from "@/components/dashboard/Phase7AutomationDashboard";
import { NoSSR } from "@/components/ui/no-ssr";
import { useState, useEffect } from "react";
import { Monitor } from "lucide-react";

export default function Dashboard() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [showConvexTest, setShowConvexTest] = useState(false);
  const [showPhase6Test, setShowPhase6Test] = useState(false);
  const [showPhase7Test, setShowPhase7Test] = useState(true); // Show Phase 7 test by default

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1280);
    };

    // Check initial screen size
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Desktop-only message component
  const DesktopOnlyMessage = () => (
    <div className="flex items-center justify-center h-full">
      <div 
        className="flex flex-col items-center text-center space-y-6 opacity-0"
        style={{ animation: 'fadeUp 600ms ease-out 2400ms forwards' }}
      >
        <div className="p-4 rounded-full bg-gray-100/60 backdrop-blur-sm">
          <Monitor className="h-12 w-12 text-gray-600" />
        </div>
        <div className="space-y-3 max-w-md">
          <h2 className="text-2xl font-medium text-gray-900">
            Desktop Experience Required
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Personal Project Radar is optimized for desktop environments. 
            Please access this dashboard from a device with a screen width of at least 1280px 
            for the best experience.
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200/60">
          Current width: <span className="font-mono">{typeof window !== 'undefined' ? window.innerWidth : 0}px</span>
        </div>
      </div>
    </div>
  );

  // Show desktop-only message for screens smaller than 1280px
  if (!isDesktop) {
    return <DesktopOnlyMessage />;
  }

  // Show Phase 7 test dashboard if enabled
  if (showPhase7Test) {
    return (
      <div className="relative">
        {/* Toggle Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => { setShowPhase6Test(true); setShowPhase7Test(false); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Phase 6 Search
          </button>
          <button
            onClick={() => { setShowConvexTest(true); setShowPhase7Test(false); }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Phase 5 Dashboard
          </button>
          <button
            onClick={() => setShowPhase7Test(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        <Phase7AutomationDashboard />
      </div>
    );
  }

  // Show Phase 6 test dashboard if enabled
  if (showPhase6Test) {
    return (
      <div className="relative">
        {/* Toggle Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => { setShowPhase7Test(true); setShowPhase6Test(false); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Phase 7 Automation
          </button>
          <button
            onClick={() => { setShowConvexTest(true); setShowPhase6Test(false); }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Phase 5 Dashboard
          </button>
          <button
            onClick={() => setShowPhase6Test(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        <Phase6TestDashboard />
      </div>
    );
  }

  // Show Convex test dashboard if enabled
  if (showConvexTest) {
    return (
      <div className="relative">
        {/* Toggle Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setShowPhase6Test(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Phase 6 Search
          </button>
          <button
            onClick={() => setShowConvexTest(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        <ConvexTestDashboard />
      </div>
    );
  }

  // Regular dashboard widgets for desktop screens
  return (
    <div className="relative">
      {/* Toggle Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setShowPhase7Test(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          View Phase 7: Automation
        </button>
        <button
          onClick={() => setShowPhase6Test(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          View Phase 6: Search Integration
        </button>
        <button
          onClick={() => setShowConvexTest(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          View Phase 5: Dashboard
        </button>
      </div>
    <div className="grid grid-rows-3 gap-6 h-[calc(100vh-9rem)]">
      {/* Chart Widget - takes exactly 1/3 of available height (same as each row in 3x2 grid) */}
      <div className="h-full widget-animate" style={{ animation: 'fadeUp 600ms ease-out 2400ms forwards' }}>
        <NoSSR fallback={
          <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
            <div className="p-6 h-full flex flex-col gap-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="flex-1 bg-gray-100 rounded" />
            </div>
          </div>
        }>
          <ChartLineInteractive />
        </NoSSR>
      </div>
      
      {/* Grid of 6 widgets - takes exactly 2/3 of available height (2 rows in grid-rows-3) */}
      <div className="row-span-2 h-full">
        <div className="grid grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2 gap-6 h-full">
          {/* Widget 2: New Leads Discovered Today */}
          <div className="h-full widget-animate" style={{ animation: 'fadeUp 600ms ease-out 2600ms forwards' }}>
            <NoSSR fallback={
              <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
                <div className="p-6 h-full flex flex-col gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="flex-1 bg-gray-100 rounded" />
                </div>
              </div>
            }>
              <ChartBarLabel />
            </NoSSR>
          </div>
          {/* Widget 3: High-Priority Leads (Score ≥ 80) */}
          <div className="h-full widget-animate" style={{ animation: 'fadeUp 600ms ease-out 2800ms forwards' }}>
            <NoSSR fallback={
              <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
                <div className="p-6 h-full flex flex-col gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="flex-1 bg-gray-100 rounded" />
                </div>
              </div>
            }>
              <ChartRadialShape />
            </NoSSR>
          </div>
          {/* Widget 4: Average Lead Score */}
          <div className="h-full widget-animate" style={{ animation: 'fadeUp 600ms ease-out 3000ms forwards' }}>
            <NoSSR fallback={
              <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
                <div className="p-6 h-full flex flex-col gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="flex-1 bg-gray-100 rounded" />
                </div>
              </div>
            }>
              <ChartRadialText />
            </NoSSR>
          </div>
          {/* Widget 5: Score Distribution (Low/Mid/High) */}
          <div className="h-full widget-animate" style={{ animation: 'fadeUp 600ms ease-out 3200ms forwards' }}>
            <NoSSR fallback={
              <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
                <div className="p-6 h-full flex flex-col gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="flex-1 bg-gray-100 rounded" />
                </div>
              </div>
            }>
              <ChartBarStacked />
            </NoSSR>
          </div>
          {/* Widget 6: ARPU Forecast (rolling 30d) */}
          <div className="h-full widget-animate" style={{ animation: 'fadeUp 600ms ease-out 3400ms forwards' }}>
            <NoSSR fallback={
              <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
                <div className="p-6 h-full flex flex-col gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="flex-1 bg-gray-100 rounded" />
                </div>
              </div>
            }>
              <ChartAreaGradient />
            </NoSSR>
          </div>
          {/* Widget 7: Relevant News Alerts (24h) */}
          <div className="h-full widget-animate" style={{ animation: 'fadeUp 600ms ease-out 3600ms forwards' }}>
            <NoSSR fallback={
              <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
                <div className="p-6 h-full flex flex-col gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="flex-1 bg-gray-100 rounded" />
                </div>
              </div>
            }>
              <ChartRadarGridCustom />
            </NoSSR>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
} 