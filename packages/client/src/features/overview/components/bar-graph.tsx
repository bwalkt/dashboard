"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useOrders } from "@/hooks/use-orders";
import { Order } from "@dashboard/shared-types";

export const description = "An interactive bar chart showing orders by date and status";

// Helper function to process orders data into chart format
const processOrdersData = (orders: Order[]) => {
  if (!orders || orders.length === 0) return [];

  // Group orders by date and count by status (Completed vs Pending)
  const dateGroups: Record<string, { Completed: number; Pending: number }> = {};

  orders.forEach((order) => {
    const effectiveDate = new Date(order.EffectiveDate);
    const dateKey = effectiveDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = {
        Completed: 0,
        Pending: 0,
      };
    }

    // Count Completed orders separately, all others as Pending
    if (order.Status === "Completed") {
      dateGroups[dateKey].Completed++;
    } else if (order.Status) {
      // All other statuses (Draft, Activated, Processing, Shipped) count as Pending
      dateGroups[dateKey].Pending++;
    }
  });

  // Convert to array format for chart
  return Object.entries(dateGroups)
    .map(([date, statusCounts]) => ({
      date,
      ...statusCounts,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // Show last 30 days
};

const chartConfig = {
  views: {
    label: "Orders",
  },
  Completed: {
    label: "Completed",
    color: "hsl(142, 76%, 36%)",
  },
  Pending: {
    label: "Pending",
    color: "hsl(38, 92%, 50%)",
  },
} satisfies ChartConfig;

export function BarGraph() {
  const { data: orders, isLoading, error } = useOrders();
  const [activeChart, setActiveChart] = React.useState<keyof typeof chartConfig>("Pending");

  const chartData = React.useMemo(() => {
    return processOrdersData(orders || []);
  }, [orders]);

  const total = React.useMemo(() => {
    if (!chartData.length) return { Completed: 0, Pending: 0 };

    return {
      Completed: chartData.reduce((acc, curr) => acc + curr.Completed, 0),
      Pending: chartData.reduce((acc, curr) => acc + curr.Pending, 0),
    };
  }, [chartData]);

  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
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
    );
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
    );
  }

  return (
    <Card className="@container/card !pt-3">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 !py-0">
          <CardTitle>Orders Chart - Interactive</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">Orders by status for the last 30 days</span>
            <span className="@[540px]/card:hidden">Last 30 days</span>
          </CardDescription>
        </div>
        <div className="flex">
          {(["Completed", "Pending"] as const).map((key) => {
            const chart = key as keyof typeof chartConfig;
            if (!chart || total[key as keyof typeof total] === 0) return null;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-primary/5 hover:bg-primary/5 relative flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left transition-colors duration-200 even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">{chartConfig[chart].label}</span>
                <span className="text-lg leading-none font-bold sm:text-3xl">{total[key as keyof typeof total]?.toLocaleString()}</span>
              </button>
            );
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
            <defs>
              <linearGradient id="fillBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={{ fill: "var(--primary)", opacity: 0.1 }}
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="orders"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Bar dataKey={activeChart} fill="url(#fillBar)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
