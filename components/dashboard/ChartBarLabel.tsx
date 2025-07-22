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
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LoadingDisplay } from "@/components/ui/error-boundary"

export const description = "A bar chart with a label"

const chartConfig = {
  count: {
    label: "New Leads",
    color: "hsl(142, 76%, 36%)", // Fresh green for new discoveries
  },
} satisfies ChartConfig

export function ChartBarLabel() {
  // Fetch live new leads data for today
  const todayData = useQuery(api.dashboard.getNewLeadsToday, {});

  const isLoading = todayData === undefined;

  if (isLoading) {
    return <LoadingDisplay message="Loading today's leads..." />;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-medium leading-none tracking-tight" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}>New Leads Discovered ★ Today</CardTitle>
        <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>Hourly discovery velocity — cron automation</CardDescription>
      </CardHeader>
      <div className="flex-1 min-h-0 px-6">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <BarChart
            accessibilityLayer
            data={todayData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
                         <Bar dataKey="count" fill="var(--color-count)" radius={8}>
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
          Total today: {todayData?.reduce((sum, hour) => sum + hour.count, 0) || 0} new leads 🎯
        </div>
        <div className="text-muted-foreground leading-none" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
          Automated discovery pipeline velocity
        </div>
      </CardFooter>
    </Card>
  )
} 