"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Kbd } from "@/components/custom/kbd";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHotKey } from "@/hooks/use-hot-key";
import { useControls } from "@/providers/controls";

export function DataTableToggleButton() {
  const { open, setOpen } = useControls();
  useHotKey(() => setOpen((prev) => !prev), "b");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen((prev) => !prev)}
            className="hidden sm:flex"
          >
            {open ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            Toggle controls with{" "}
            <Kbd className="ml-1 text-muted-foreground group-hover:text-accent-foreground">
              <span className="mr-1">⌘</span>
              <span>B</span>
            </Kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}