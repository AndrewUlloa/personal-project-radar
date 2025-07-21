import { ChartLineInteractive } from "@/components/dashboard/ChartLineInteractive"
import { NoSSR } from "@/components/ui/no-ssr"

export default function Dashboard() {
  return (
    <div className="grid gap-6">
      {/* Dashboard page content */}
      <h1 className="text-4xl font-bold">Lead Researcher Dashboard</h1>
      <p className="text-lg">Comprehensive research and analytics platform</p>
      
      {/* Chart Widget - wrapped in NoSSR to prevent hydration issues */}
      <div className="grid gap-4">
        <NoSSR fallback={
          <div className="w-full h-[350px] rounded-lg border bg-card text-card-foreground shadow-sm animate-pulse">
            <div className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-[250px] bg-gray-100 rounded"></div>
            </div>
          </div>
        }>
          <ChartLineInteractive />
        </NoSSR>
      </div>
      
      {/* Additional dashboard components will be added here */}
    </div>
  );
} 