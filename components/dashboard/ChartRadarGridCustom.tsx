"use client"

import { TrendingUp } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingDisplay } from "@/components/ui/error-boundary"

export const description = "A radar chart with a custom grid"

const chartConfig = {
  value: {
    label: "Activity",
    color: "hsl(262, 83%, 58%)", // Professional purple for activity tracking
  },
} satisfies ChartConfig

export function ChartRadarGridCustom() {
  // Fetch live news alerts data
  const alertsData = useQuery(api.dashboard.getNewsAlerts, {});

  const isLoading = alertsData === undefined;

  if (isLoading) {
    return <LoadingDisplay message="Loading news alerts..." />;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="items-center pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Relevant News Alerts (24 h)</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
          Real-time alert categories — contextual triggers
        </CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 py-2">
        <ChartContainer
          config={chartConfig}
          className="w-full h-full"
        >
          <RadarChart data={alertsData?.alerts ?? []} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            {/* <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            /> */}
            <PolarGrid radialLines={false} polarRadius={[70]} strokeWidth={1} />
            <PolarAngleAxis dataKey="category" />
            <Radar
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2 flex-col gap-1">
        <div className="flex items-center gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
          {alertsData?.summary?.totalEvents ?? 0} events • {alertsData?.summary?.newsArticles ?? 0} articles 📰
        </div>
        <div className="text-muted-foreground flex items-center gap-2 leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Enrichment, Scoring, Discovery, News, Social
        </div>
      </CardFooter>
    </Card>
  )
} 