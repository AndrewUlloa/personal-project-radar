"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A stacked bar chart with a legend"

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartBarStacked() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Bar Chart - Stacked + Legend</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>January - June 2024</CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 px-6">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="desktop"
              stackId="a"
              fill="var(--color-desktop)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="mobile"
              stackId="a"
              fill="var(--color-mobile)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2 flex-col items-start gap-1">
        <div className="flex gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
          Trending up by 5.2% this month <TrendingUp style={{ width: 'clamp(0.875rem, 2.5vw, 1.125rem)', height: 'clamp(0.875rem, 2.5vw, 1.125rem)' }} />
        </div>
        <div className="text-muted-foreground leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  )
} 