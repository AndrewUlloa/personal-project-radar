import { ChartLineInteractive } from "@/components/dashboard/ChartLineInteractive";
import { ChartAreaGradient } from "@/components/dashboard/ChartAreaGradient";
import { ChartBarLabel } from "@/components/dashboard/ChartBarLabel";
import { ChartRadialShape } from "@/components/dashboard/ChartRadialShape";
import { ChartRadialText } from "@/components/dashboard/ChartRadialText";
import { ChartRadarGridCustom } from "@/components/dashboard/ChartRadarGridCustom";
import { ChartBarStacked } from "@/components/dashboard/ChartBarStacked";
import { NoSSR } from "@/components/ui/no-ssr";

export default function Dashboard() {
  return (
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
  );
} 