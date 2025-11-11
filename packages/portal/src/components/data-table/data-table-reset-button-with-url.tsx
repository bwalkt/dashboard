"use client";

import { X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { Kbd } from "@/components/custom/kbd";
import { useDataTable } from "@/components/data-table/data-table-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHotKey } from "@/hooks/use-hot-key";
import { Button } from "../ui/button";

interface DataTableResetButtonWithUrlProps {
  searchParamsParser: Record<string, any>;
}

export function DataTableResetButtonWithUrl({
  searchParamsParser,
}: DataTableResetButtonWithUrlProps) {
  const { table, filterFields } = useDataTable();
  const [_, setSearch] = useQueryStates(searchParamsParser);

  const handleReset = () => {
    // Reset table filters first
    table.resetColumnFilters();
    
    // Clear all filter-related URL parameters
    const resetParams = filterFields.reduce(
      (acc, field) => {
        acc[field.value as string] = undefined;
        return acc;
      },
      {} as Record<string, undefined>
    );
    
    // Also clear other search-related params but keep essential ones like size, direction
    setSearch({
      ...resetParams,
      sort: undefined,
      host: undefined,
      pathname: undefined,
      date: undefined,
    });
  };

  useHotKey(handleReset, "Escape");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>
            Reset filters with{" "}
            <Kbd className="ml-1 text-muted-foreground group-hover:text-accent-foreground">
              <span className="mr-1">⌘</span>
              <span>Esc</span>
            </Kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}