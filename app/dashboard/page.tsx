import { ChartLineInteractive } from "@/components/dashboard/ChartLineInteractive"

export default function Dashboard() {
  return (
    <div className="grid gap-6">
      {/* Chart Widget */}
      <div className="grid gap-4">
        <ChartLineInteractive />
      </div>
      
      {/* Additional dashboard components will be added here */}
    </div>
  );
} 