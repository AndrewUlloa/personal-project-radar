"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { LoadingDisplay } from "@/components/ui/error-boundary"
import { Button } from "@/components/ui/button"

export const description = "An interactive line chart with time period toggles"

const chartConfig = {
  views: {
    label: "Lead Sources",
  },
  desktop: {
    label: "Web Crawler",
    color: "hsl(217, 91%, 60%)", // Professional blue
  },
  mobile: {
    label: "LinkedIn API", 
    color: "hsl(142, 76%, 36%)", // LinkedIn green
  },
} satisfies ChartConfig

const TIME_PERIODS = [
  { key: "1D", label: "1D", name: "Today" },
  { key: "7D", label: "7D", name: "7 Days" },
  { key: "30D", label: "30D", name: "30 Days" },
  { key: "90D", label: "90D", name: "90 Days" },
  { key: "1Y", label: "1Y", name: "1 Year" },
  { key: "ALL", label: "ALL", name: "All Time" },
] as const

export function ChartLineInteractive() {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("desktop")
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("30D")

  // Fetch live data from Convex with selected period
  const trendData = useQuery(api.dashboard.getTotalLeadsTrend, { period: selectedPeriod })

  const isLoading = trendData === undefined

  const total = React.useMemo(
    () => ({
      desktop: trendData?.totals?.webCrawler ?? 0,
      mobile: trendData?.totals?.linkedin ?? 0,
    }),
    [trendData]
  )

  // Transform data based on period type
  const chartRows = React.useMemo(() => {
    if (!trendData?.data) return []

    if (selectedPeriod === "1D") {
      // For 1D, data comes as hourly { hour: "14:00", count: 2, webCrawler: 2, linkedin: 0 }
      // Now we have proper breakdown by source for hourly data
      return trendData.data.map((item: any) => ({
        date: item.hour,
        desktop: item.webCrawler || 0, // Web Crawler data
        mobile: item.linkedin || 0,    // LinkedIn data
        webCrawler: item.webCrawler || 0,
        linkedin: item.linkedin || 0,
      }))
    } else {
      // For other periods, data comes as daily { date: "2025-01-21", webCrawler: 4, linkedin: 0, total: 4 }
      // We map the correct data to desktop/mobile based on what they represent
      return trendData.data.map((item: any) => ({
        date: item.date,
        desktop: item.webCrawler,    // Desktop button shows Web Crawler data
        mobile: item.linkedin,       // Mobile button shows LinkedIn data
        webCrawler: item.webCrawler,
        linkedin: item.linkedin,
      }))
    }
  }, [trendData, selectedPeriod])

  // Format X-axis labels based on selected period (HCI best practices)
  const formatXAxisLabel = React.useCallback((value: string) => {
    if (selectedPeriod === "1D") {
      // For 1D: Show time in 12-hour format (2 PM, 6 PM)
      const hour = parseInt(value.split(':')[0]);
      if (hour === 0) return "12 AM";
      if (hour === 12) return "12 PM"; 
      return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    } else {
      // For daily data: Adaptive date formatting based on period
      const date = new Date(value);
      
      switch (selectedPeriod) {
        case "7D":
          // Show day names for week view
          return date.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue, Wed
          
        case "30D":
          // Show month/day for 30-day view
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // Jan 15
          
                 case "90D":
           // Show weekly markers, with fallback for data points
           const day = date.getDate();
           const totalDays = chartRows.length;
           if (totalDays <= 10) {
             // For small datasets, show all non-zero points
             return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
           } else if (day === 1 || day === 8 || day === 15 || day === 22) {
             return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
           }
           return "";
           
         case "1Y":
           // Show months for year view, with fallback for small datasets
           const monthDay = date.getDate();
           const totalMonths = chartRows.length;
           if (totalMonths <= 12) {
             // For small datasets, show key dates
             return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
           } else if (monthDay <= 7) {
             return date.toLocaleDateString('en-US', { month: 'short' });
           }
           return "";
          
        case "ALL":
          // Show years or quarters
          const month = date.getMonth();
          const dayOfMonth = date.getDate();
          if (month === 0 && dayOfMonth === 1) {
            return date.getFullYear().toString(); // 2024, 2025
          }
          return "";
          
        default:
          // Default to short date for unknown periods
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
  }, [selectedPeriod, chartRows.length]);

  // Format tooltip labels for consistency and context
  const formatTooltipLabel = React.useCallback((value: string) => {
    if (selectedPeriod === "1D") {
      // For hourly data: "Today at 2:00 PM"
      const hour = parseInt(value.split(':')[0]);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `Today at ${displayHour}:00 ${period}`;
    } else {
      const date = new Date(value);
      
      switch (selectedPeriod) {
        case "7D":
          // For week view: "Monday, Jul 22"
          return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          });
          
        case "30D":
          // For month view: "Jul 22, 2025"
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          });
          
        case "90D":
          // For quarter view: "Tuesday, Jul 22, 2025"
          return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          });
          
        case "1Y":
          // For year view: "July 2025"
          return date.toLocaleDateString('en-US', { 
            month: 'long',
            year: 'numeric'
          });
          
        case "ALL":
          // For all-time view: "Q3 2025" or fallback to month/year
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `Q${quarter} ${date.getFullYear()}`;
          
        default:
          // Default fallback
          return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
      }
    }
  }, [selectedPeriod]);

  if (isLoading) {
    return <LoadingDisplay message="Loading trend data..." />
  }

  return (
    <Card className="h-full flex flex-col py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row flex-shrink-0">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle className="font-semibold leading-none tracking-tight" style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}>
            Total Leads in Database
          </CardTitle>
          <CardDescription style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>
            {TIME_PERIODS.find(p => p.key === selectedPeriod)?.name} trend + source breakdown — granular view with interactive hover
          </CardDescription>
        </div>
        <div className="flex">
          {["desktop", "mobile"].map((key) => {
            const chart = key as keyof typeof chartConfig
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)' }}>
                  {chart === 'desktop' ? 'Web Crawler' : 'LinkedIn Enrichment'}
                </span>
                <span className="leading-none font-bold" style={{ fontSize: 'clamp(1rem, 4vw, 1.875rem)' }}>
                  {total[key as keyof typeof total].toLocaleString().replace(/,/g, ' ')} Leads
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      
      {/* Time Period Toggle Buttons */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-1 flex-wrap">
          {TIME_PERIODS.map((period) => (
            <Button
              key={period.key}
              variant={selectedPeriod === period.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod(period.key)}
              className="h-7 px-3 text-xs font-medium"
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      <CardContent className="px-2 sm:p-6 flex-1 flex flex-col">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto flex-1 w-full min-h-0"
        >
          <LineChart
            accessibilityLayer
            data={chartRows}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatXAxisLabel}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  nameKey="views"
                  labelFormatter={formatTooltipLabel}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={`var(--color-${activeChart})`}
              strokeWidth={2}
              dot={chartRows.length <= 7} // Show dots for small datasets
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
} 