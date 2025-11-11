"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, ReferenceArea, Tooltip, XAxis } from "recharts";
import type { CategoricalChartFunc } from "recharts/types/chart/generateCategoricalChart";
import { useDataTable } from "@/components/data-table/data-table-provider";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getLevelLabel } from "@/lib/request/level";
import { cn } from "@/lib/utils";
import { BaseChartSchema, TimelineChartSchema } from "./schema";

export const description = "A stacked bar chart";

const chartConfig = {
  success: {
    label: <TooltipLabel level="success" />,
    color: "hsl(var(--muted-foreground))",
  },
  warning: {
    label: <TooltipLabel level="warning" />,
    color: "#f97316",
  },
  error: {
    label: <TooltipLabel level="error" />,
    color: "#ef4444",
  },
} satisfies ChartConfig;

interface TimelineChartProps<TChart extends BaseChartSchema> {
  className?: string;
  /**
   * The table column id to filter by - needs to be a type of `timerange` (e.g. "date").
   * TBD: if using keyof TData to be closer to the data table props
   */
  columnId: string;
  /**
   * Same data as of the InfiniteQueryMeta.
   */
  data: TChart[];
}

export function TimelineChart<TChart extends BaseChartSchema>({
  data,
  className,
  columnId,
}: TimelineChartProps<TChart>) {
  const { table } = useDataTable();
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const chart = useMemo(
    () => {
      return data.map((item) => ({
        ...item,
        [columnId]: new Date(item.timestamp).toString(),
      }));
    },
    [data, columnId],
  );

  const timerange = useMemo(() => {
    if (data.length === 0) return { interval: 0, period: undefined };
    const first = data[0].timestamp;
    const last = data[data.length - 1].timestamp;
    const interval = Math.abs(first - last);
    return { interval, period: calculatePeriod(interval) };
  }, [data]);

  const handleMouseDown: CategoricalChartFunc = (e) => {
    if (e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
      setIsSelecting(true);
    }
  };

  const handleMouseMove: CategoricalChartFunc = (e) => {
    if (isSelecting && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp: CategoricalChartFunc = (e) => {
    if (refAreaLeft && refAreaRight) {
      const [left, right] = [refAreaLeft, refAreaRight].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      );
      table
        .getColumn(columnId)
        ?.setFilterValue([new Date(left), new Date(right)]);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  };

  return (
    <ChartContainer config={chartConfig} className={cn("h-[60px] w-full", className)}>
      <BarChart
        accessibilityLayer
        data={chart}
        margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
        maxBarSize={20}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={columnId}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value);
            if (isNaN(date.getTime())) return "N/A";
            return timerange.period === "10m"
              ? format(date, "HH:mm")
              : format(date, "LLL dd");
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[150px]"
              labelFormatter={(value) => {
                const date = new Date(value);
                if (isNaN(date.getTime())) return "N/A";
                return format(date, "LLL dd, y HH:mm");
              }}
            />
          }
        />
        <Bar dataKey="error" stackId="a" fill="#ef4444" />
        <Bar dataKey="warning" stackId="a" fill="#f97316" />
        <Bar dataKey="success" stackId="a" fill="hsl(var(--muted-foreground))" />
        {isSelecting && refAreaLeft && refAreaRight && (
          <ReferenceArea
            x1={refAreaLeft}
            x2={refAreaRight}
            strokeOpacity={0.3}
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
          />
        )}
      </BarChart>
    </ChartContainer>
  );
}

// TODO: check what's a good abbreviation for month vs. minutes
function calculatePeriod(interval: number): "10m" | "1d" | "1w" | "1mo" {
  if (interval <= 1000 * 60 * 10) {
    // less than 10 minutes
    return "10m";
  } else if (interval <= 1000 * 60 * 60 * 24) {
    // less than 1 day
    return "1d";
  } else if (interval <= 1000 * 60 * 60 * 24 * 7) {
    // less than 1 week
    return "1w";
  }
  return "1mo"; // defaults to 1 month
}

// TODO: use a `formatTooltipLabel` function instead for composability
function TooltipLabel({
  level,
}: {
  level: keyof Omit<TimelineChartSchema, "timestamp">;
}) {
  return (
    <div className="mr-2 flex w-20 items-center justify-between gap-2 font-mono">
      <div className="capitalize text-foreground/70">{level}</div>
      <div className="text-xs text-muted-foreground/70">
        {getLevelLabel(level)}
      </div>
    </div>
  );
}
