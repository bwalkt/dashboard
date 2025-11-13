import { ChevronDown, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExpandableColumnProps, TreeData } from "./types";

interface DataTableExpandableColumnProps<TData extends TreeData>
  extends ExpandableColumnProps<TData> {
  className?: string;
  expandIcon?: React.ComponentType<{ className?: string }>;
  collapseIcon?: React.ComponentType<{ className?: string }>;
  indentSize?: number;
}

export function DataTableExpandableColumn<TData extends TreeData>({
  row,
  className,
  expandIcon: ExpandIcon = ChevronRight,
  collapseIcon: CollapseIcon = ChevronDown,
  indentSize = 20,
}: DataTableExpandableColumnProps<TData>) {
  const canExpand = row.getCanExpand();
  const isExpanded = row.getIsExpanded();
  const depth = row.depth || 0;

  return (
    <div
      className={cn("flex items-center", className)}
      style={{ paddingLeft: `${depth * indentSize}px` }}
    >
      {canExpand ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted"
          onClick={row.getToggleExpandedHandler()}
        >
          {isExpanded ? (
            <CollapseIcon className="h-4 w-4" />
          ) : (
            <ExpandIcon className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <div className="h-6 w-6" />
      )}
    </div>
  );
}