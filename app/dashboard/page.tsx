import { ChartLineInteractive } from "@/components/dashboard/ChartLineInteractive"

export default function Dashboard() {
  return (
    <div className="grid gap-6">
      {/* Dashboard page content */}
      <h1 className="text-4xl font-bold">Lead Researcher Dashboard</h1>
      <p className="text-lg">Comprehensive research and analytics platform</p>
      
      {/* Chart Widget */}
      <div className="grid gap-4">
        <ChartLineInteractive />
      </div>
      
      {/* Additional dashboard components will be added here */}
    </div>
  );
} 