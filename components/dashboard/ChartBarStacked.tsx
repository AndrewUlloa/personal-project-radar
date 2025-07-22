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
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingDisplay } from "@/components/ui/error-boundary"

export const description = "A stacked bar chart with a legend"

const chartConfig = {
  low: {
    label: "Low",
    color: "hsl(215, 20%, 65%)", // Muted slate gray
  },
  mid: {
    label: "Mid", 
    color: "hsl(43, 96%, 56%)", // Warm amber for moderate scores
  },
  high: {
    label: "High",
    color: "hsl(0, 84%, 60%)", // Attention red for high priority
  },
} satisfies ChartConfig

export function ChartBarStacked() {
  // Fetch live score distribution data
  const distributionData = useQuery(api.dashboard.getScoreDistribution, {});

  const isLoading = distributionData === undefined;

  const chartData = [
    { 
      category: "Score Distribution", 
      low: distributionData?.low ?? 0,
      mid: distributionData?.mid ?? 0, 
      high: distributionData?.high ?? 0 
    },
  ];

  if (isLoading) {
    return <LoadingDisplay message="Loading score distribution..." />;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Score Distribution (Low / Mid / High)</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>Quality bands reveal balance across pipeline</CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 px-6">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="category"
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
              dataKey="low"
              stackId="a"
              fill="var(--color-low)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="mid"
              stackId="a"
              fill="var(--color-mid)"
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
          Total scored: {distributionData?.total ?? 0} leads ({Math.round(((distributionData?.high ?? 0) / (distributionData?.total || 1)) * 100)}% high quality) 🎯
        </div>
        <div className="text-muted-foreground leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Low: &lt;40 • Mid: 40-80 • High: ≥80
        </div>
      </CardFooter>
    </Card>
  )
} 