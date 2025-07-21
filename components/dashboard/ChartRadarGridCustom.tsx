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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A radar chart with a custom grid"

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 273 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ChartRadarGridCustom() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="items-center pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Radar Chart - Grid Custom</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
          Showing total visitors for the last 6 months
        </CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 flex items-center justify-center px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-square w-full h-full max-w-[180px] max-h-[180px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarGrid radialLines={false} polarRadius={[70]} strokeWidth={1} />
            <PolarAngleAxis dataKey="month" />
            <Radar
              dataKey="desktop"
              fill="var(--color-desktop)"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2 flex-col gap-1">
        <div className="flex items-center gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
          Trending up by 5.2% this month <TrendingUp style={{ width: 'clamp(0.875rem, 2.5vw, 1.125rem)', height: 'clamp(0.875rem, 2.5vw, 1.125rem)' }} />
        </div>
        <div className="text-muted-foreground flex items-center gap-2 leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          January - June 2024
        </div>
      </CardFooter>
    </Card>
  )
} 