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
  { month: "January", desktop: 186, mobile: 80, high: 120 },
  { month: "February", desktop: 305, mobile: 200, high: 150 },
  { month: "March", desktop: 237, mobile: 120, high: 180 },
  { month: "April", desktop: 73, mobile: 190, high: 95 },
  { month: "May", desktop: 209, mobile: 130, high: 165 },
  { month: "June", desktop: 214, mobile: 140, high: 190 },
]

const chartConfig = {
  desktop: {
    label: "Low",
    color: "hsl(215, 20%, 65%)", // Muted slate gray
  },
  mobile: {
    label: "Mid", 
    color: "hsl(43, 96%, 56%)", // Vibrant amber
  },
  high: {
    label: "High",
    color: "hsl(142, 76%, 36%)", // Success green
  },
} satisfies ChartConfig

export function ChartBarStacked() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Lead Quality Distribution</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>Band counts — Low | Mid | High</CardDescription>
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
            <ChartTooltip content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                // Reverse the order: High -> Mid -> Low
                const reversedPayload = [...payload].reverse();
                return <ChartTooltipContent hideLabel active={active} payload={reversedPayload} label={label} />;
              }
              return <ChartTooltipContent hideLabel />;
            }} />
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
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="high"
              stackId="a"
              fill="var(--color-high)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2 flex-col items-start gap-1">
        <div className="flex gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
          +15% high-band vs. prior month 📈
        </div>
        <div className="text-muted-foreground leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Stacked bars = count per month
        </div>
      </CardFooter>
    </Card>
  )
} 