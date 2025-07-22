"use client"

import { TrendingUp } from "lucide-react"
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { LoadingDisplay } from "@/components/ui/error-boundary"

export const description = "A radial chart with text"

const chartData = [
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
]

const chartConfig = {
  visitors: {
    label: "Lead Score",
  },
  safari: {
    label: "Quality Index",
    color: "hsl(43, 96%, 56%)", // Warm amber for quality metrics
  },
} satisfies ChartConfig

export function ChartRadialText() {
  // Fetch live average lead score data
  const scoreData = useQuery(api.dashboard.getAverageLeadScore, {})
  
  if (!scoreData) {
    return <LoadingDisplay message="Loading average score..." />
  }

  const chartData = [
    { 
      browser: "score", 
      visitors: scoreData.current || 0, 
      fill: "var(--color-safari)" 
    },
  ]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="items-center pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Average Lead Score</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
          {scoreData.change > 0 ? '+' : ''}{scoreData.change} vs last month
        </CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 flex items-center justify-center px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-square w-full h-full max-w-[180px] max-h-[180px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={250}
            innerRadius={60}
            outerRadius={80}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[66, 54]}
            />
            <RadialBar dataKey="visitors" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground font-bold"
                          style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
                        >
                          {scoreData?.current ?? 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="fill-muted-foreground"
                          style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}
                        >
                          Score
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2 flex-col gap-1">
        <div className="flex items-center gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
          {scoreData?.change > 0 ? '+' : ''}{scoreData?.change ?? 0} pts vs last month {scoreData?.trend === 'up' ? '📈' : scoreData?.trend === 'down' ? '📉' : '➡️'}
        </div>
        <div className="text-muted-foreground leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Overall lead quality health metric
        </div>
      </CardFooter>
    </Card>
  )
} 