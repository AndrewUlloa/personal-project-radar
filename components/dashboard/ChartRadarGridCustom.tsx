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
  { month: "Funding", desktop: 186 },
  { month: "Expansion", desktop: 305 },
  { month: "Risk", desktop: 237 },
  { month: "Exec Moves", desktop: 273 },
  { month: "Partnerships", desktop: 209 },
  { month: "Technology", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Alert Count",
    color: "hsl(262, 83%, 58%)", // Professional purple for alerts
  },
} satisfies ChartConfig

export function ChartRadarGridCustom() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="items-center pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Relevant News Alerts (24 h)</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
          Funding • Expansion • Risk • Exec Moves
        </CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 py-2">
        <ChartContainer
          config={chartConfig}
          className="w-full h-full"
        >
          <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
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
          +31% high-impact articles vs. yesterday (5 → 7) 📈
        </div>
        <div className="text-muted-foreground flex items-center gap-2 leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Funding, Expansion, Risk tracking
        </div>
      </CardFooter>
    </Card>
  )
} 