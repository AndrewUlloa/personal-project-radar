"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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

export const description = "An area chart with gradient fill"

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

export function ChartAreaGradient() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Area Chart - Gradient</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
          Showing total visitors for the last 6 months
        </CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 px-6">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2">
        <div className="flex w-full items-start gap-2">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              Trending up by 5.2% this month <TrendingUp style={{ width: 'clamp(0.875rem, 2.5vw, 1.125rem)', height: 'clamp(0.875rem, 2.5vw, 1.125rem)' }} />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
} 