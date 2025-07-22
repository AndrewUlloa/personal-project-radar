"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Get Convex URL with proper fallback for build environments
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Create ConvexReactClient with proper error handling
const convex = convexUrl 
  ? new ConvexReactClient(convexUrl)
  : new ConvexReactClient("https://placeholder.convex.cloud"); // Fallback for build time

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // If no Convex URL is provided in production, show a helpful error
  if (!convexUrl && typeof window !== "undefined") {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable is missing. Please set it in your deployment environment.");
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-red-200">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-700 mb-2">Missing Convex configuration.</p>
          <p className="text-sm text-gray-500">Please set NEXT_PUBLIC_CONVEX_URL environment variable.</p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
} 