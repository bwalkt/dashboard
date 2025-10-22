'use client'

import type { Order } from '@pzero/shared'
import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useOrdersLast30Days } from '@/hooks/use-orders'

export const description = 'An interactive bar chart showing orders by date and status'

// Helper function to process orders data into chart format
const processOrdersData = (orders: Order[]) => {
  if (!orders || orders.length === 0) return []

  // Group orders by date and count by status (Completed vs Pending)
  const dateGroups: Record<string, { Completed: number; Pending: number }> = {}

  orders.forEach(order => {
    const effectiveDate = new Date(order.EffectiveDate)
    const dateKey = effectiveDate.toISOString().split('T')[0] // YYYY-MM-DD format

    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = {
        Completed: 0,
        Pending: 0,
      }
    }

    // Count orders by status
    if (order.Status === 'Completed') {
      dateGroups[dateKey].Completed++
    } else {
      // All other statuses (Draft, Activated, Processing, Shipped) count as Pending
      dateGroups[dateKey].Pending++
    }
  })

  // Convert to array format for chart
  const chartData = Object.entries(dateGroups)
    .map(([date, statusCounts]) => ({
      date,
      ...statusCounts,
      All: statusCounts.Completed + statusCounts.Pending, // Add combined total for "All" view
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return chartData
}

const chartConfig = {
  views: {
    label: 'Orders',
    color: 'hsl(262, 83%, 58%)',
  },
  All: {
    label: 'All',
    color: 'hsl(262, 83%, 58%)',
  },
  Completed: {
    label: 'Completed',
    color: 'hsl(221, 83%, 53%)',
  },
  Pending: {
    label: 'Pending',
    color: 'hsl(48, 96%, 53%)',
  },
} satisfies ChartConfig

/**
 * Render an interactive bar chart showing orders by date and status for the last 30 days.
 *
 * Displays loading and error states as needed, provides controls to view All, Completed, or Pending orders,
 * and defers rendering on the server until client-side mounting.
 *
 * @returns A React element containing the interactive orders bar chart, or `null` before client-side mount.
 */
export function BarGraph() {
  const { data: allOrders, isLoading, error } = useOrdersLast30Days()
  const [activeChart, setActiveChart] = React.useState<keyof typeof chartConfig>('All')

  const chartData = React.useMemo(() => {
    const orders = allOrders
    const data = processOrdersData(orders || [])
    return data
  }, [allOrders])

  const total = React.useMemo(() => {
    if (!chartData.length) return { All: 0, Completed: 0, Pending: 0 }

    return {
      All: chartData.reduce((acc, curr) => acc + curr.All, 0),
      Completed: chartData.reduce((acc, curr) => acc + curr.Completed, 0),
      Pending: chartData.reduce((acc, curr) => acc + curr.Pending, 0),
    }
  }, [chartData])

  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="@container/card !pt-3">
        <CardHeader className="flex flex-col items-stretch space-y-0 border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 !py-0">
            <CardTitle>Orders Chart</CardTitle>
            <CardDescription>Loading orders data...</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="@container/card !pt-3">
        <CardHeader className="flex flex-col items-stretch space-y-0 border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 !py-0">
            <CardTitle>Orders Chart</CardTitle>
            <CardDescription>Error loading orders data</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-destructive">Failed to load orders</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card !pt-3">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 !py-0">
          <CardTitle>Orders Chart - Interactive</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">Orders by status for the last 30 days</span>
          </CardDescription>
        </div>

        <div className="flex">
          {(['All', 'Completed', 'Pending'] as const).map(key => {
            const chart = key as keyof typeof chartConfig
            // For "All" tab, show if there are any orders (Completed + Pending > 0)
            // For individual tabs, show only if that specific total > 0
            const shouldShow = (total[key as keyof typeof total] || 0) > 0
            if (!chart || !shouldShow) return null
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-primary/5 hover:bg-primary/5 relative flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left transition-colors duration-200 even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">{chartConfig[chart].label}</span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[key as keyof typeof total]?.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart
            data={chartData}
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
              minTickGap={32}
              tickFormatter={value => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }}
            />
            <ChartTooltip
              cursor={{ fill: chartConfig[activeChart]?.color || 'hsl(221, 83%, 53%)', opacity: 0.1 }}
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="orders"
                  labelFormatter={value => {
                    return new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }}
                />
              }
            />
            <Bar
              dataKey="Completed"
              fill={chartConfig.Completed.color}
              stackId="chart"
              radius={activeChart === 'All' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              hide={activeChart === 'Pending'}
            />
            <Bar
              dataKey="Pending"
              fill={chartConfig.Pending.color}
              stackId="chart"
              radius={[4, 4, 0, 0]}
              hide={activeChart === 'Completed'}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
