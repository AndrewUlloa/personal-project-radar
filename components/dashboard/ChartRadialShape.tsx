"use client"

import { TrendingUp } from "lucide-react"
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

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

export const description = "A radial chart with a custom shape"

const chartConfig = {
  visitors: {
    label: "Leads",
  },
  safari: {
    label: "High-Priority",
    color: "hsl(0, 84%, 60%)", // Attention red for high priority
  },
} satisfies ChartConfig

export function ChartRadialShape() {
  // Fetch live high-priority leads data
  const priorityData = useQuery(api.dashboard.getHighPriorityLeads, {});

  const isLoading = priorityData === undefined;

  const chartData = [
    { 
      browser: "safari", 
      visitors: priorityData?.count ?? 0, 
      fill: "var(--color-safari)" 
    },
  ];

  const percentageText = priorityData?.percentage ?? 0;

  if (isLoading) {
    return <LoadingDisplay message="Loading priority data..." />;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="items-center pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>High-Priority Leads</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>Score ≥ 80 — {percentageText}% of total</CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 flex items-center justify-center px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-square w-full h-full max-w-[180px] max-h-[180px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={100}
            innerRadius={60}
            outerRadius={90}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[66, 54]}
            />
            <RadialBar dataKey="visitors" background />
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
                          {chartData[0].visitors.toLocaleString().replace(/,/g, ' ')}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="fill-muted-foreground"
                          style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}
                        >
                          Leads
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
          Quality band +8.7% vs. 7-day avg 📈
        </div>
        <div className="text-muted-foreground leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Hot lead identification accuracy
        </div>
      </CardFooter>
    </Card>
  )
} 