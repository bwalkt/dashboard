"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type GroupByOption<TData = any> = {
  label: string;
  value: keyof TData | null;
  color?: string;
};

interface DataTableGroupByProps<TData> {
  groupByOptions: GroupByOption<TData>[];
  groupBy: keyof TData | null;
  onGroupByChange: (groupBy: keyof TData | null) => void;
}

export function DataTableGroupBy<TData>({
  groupByOptions,
  groupBy,
  onGroupByChange,
}: DataTableGroupByProps<TData>) {
  const selectedOption = groupByOptions.find((option) => option.value === groupBy);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
        >
          Group by
          {selectedOption && (
            <>
              {": "}
              <span className="font-medium">{selectedOption.label}</span>
            </>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {groupByOptions.map((option) => (
          <DropdownMenuItem
            key={String(option.value)}
            onSelect={() => onGroupByChange(option.value)}
          >
            <div className="flex items-center space-x-2">
              {option.color && (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}
              <span className="flex-1">{option.label}</span>
              {groupBy === option.value && (
                <Check className="h-4 w-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}