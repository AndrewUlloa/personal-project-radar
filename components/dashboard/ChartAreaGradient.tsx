"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
    label: "Projected Revenue",
    color: "hsl(142, 76%, 36%)", // Success green for revenue
  },
  mobile: {
    label: "Pipeline Value",
    color: "hsl(217, 91%, 60%)", // Professional blue for pipeline
  },
} satisfies ChartConfig

export function ChartAreaGradient() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Projected Revenue & Pipeline (30-Day Roll)</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
          Weighted by lead-score
        </CardDescription>
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[hsl(217,91%,60%)]"></div>
            <span>Pipeline</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[hsl(142,76%,36%)]"></div>
            <span>Projected</span>
          </div>
        </div>
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
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${Math.round(value/1000)} K`}
              domain={[0, 800]}
              ticks={[0, 200, 400, 600, 800]}
            />
            <ChartTooltip 
              cursor={false} 
              content={<ChartTooltipContent 
                formatter={(value, name) => [`$${Math.round(value)} K`, name]}
                labelFormatter={(label) => `${label}`}
              />} 
            />
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
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              fillOpacity={0.3}
              stroke="var(--color-desktop)"
              strokeWidth={2.5}
              stackId="a"
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              fillOpacity={0.6}
              stroke="var(--color-mobile)"
              strokeWidth={1.5}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2">
        <div className="flex w-full items-start gap-2">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              Pipeline value +$22.8 K vs. prior 30 d 📈
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
              Projected monthly growth
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
} 