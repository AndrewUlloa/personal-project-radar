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
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingDisplay } from "@/components/ui/error-boundary"

export const description = "An area chart with gradient fill"

const chartConfig = {
  value: {
    label: "ARPU",
    color: "hsl(142, 76%, 36%)", // Success green for revenue
  },
} satisfies ChartConfig

export function ChartAreaGradient() {
  // Fetch live ARPU forecast data
  const arpuData = useQuery(api.dashboard.getARPUForecast, {});

  const isLoading = arpuData === undefined;

  if (isLoading) {
    return <LoadingDisplay message="Loading ARPU forecast..." />;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>Pipeline Growth (30d)</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
          Cumulative revenue potential growth — total pipeline expansion
        </CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 px-6">
        <ChartContainer config={chartConfig} className="w-full h-full">
                      <AreaChart
              accessibilityLayer
              data={arpuData?.data ?? []}
              margin={{
                left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${Math.round(value/1000)}K`}
            />
            <ChartTooltip 
              cursor={false} 
              content={<ChartTooltipContent 
                formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                labelFormatter={(label) => new Date(label).toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              />} 
            />
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.1}
                />
              </linearGradient>

            </defs>
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              fillOpacity={0.3}
              stroke="var(--color-value)"
              strokeWidth={2.5}
              stackId="a"
            />

          </AreaChart>
        </ChartContainer>
      </div>
      <CardFooter className="pt-2">
        <div className="flex w-full items-start gap-2">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 leading-none font-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              Current pipeline: ${((arpuData?.summary?.totalEstimatedARPU ?? 0) / 1000).toFixed(1)}K across {arpuData?.summary?.companiesCount ?? 0} leads 💰
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
              Total estimated revenue potential — latest 30 days
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
} 