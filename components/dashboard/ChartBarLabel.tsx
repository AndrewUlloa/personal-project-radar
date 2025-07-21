"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"

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

export const description = "A bar chart with a label"

const chartData = [
  { month: "00:00", desktop: 186 },
  { month: "04:00", desktop: 305 },
  { month: "08:00", desktop: 237 },
  { month: "12:00", desktop: 73 },
  { month: "16:00", desktop: 209 },
  { month: "20:00", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "New Leads",
    color: "hsl(262, 83%, 58%)", // Professional purple for activity
  },
} satisfies ChartConfig

export function ChartBarLabel() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>New Leads Added Today</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>Today's hourly import velocity</CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 px-6">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2 flex-col items-start gap-1">
        <div className="flex gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
          Peak window: 14:00–15:00 UTC 📈
        </div>
        <div className="text-muted-foreground leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Automated research pipeline performance
        </div>
      </CardFooter>
    </Card>
  )
} 