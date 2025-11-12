"use client";

import { IconFilter, IconFilterOff } from '@tabler/icons-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SearchInput from '../search-input'
import { DataTableTitle } from '../data-table/data-table-title'

export interface MainHeaderProps {
  title?: string
  description?: string
  hasFilters?: boolean
  showFilters?: boolean
  onToggleFilters?: () => void
}

export function MainHeader({ 
  title, 
  description, 
  hasFilters = false, 
  showFilters = false,
  onToggleFilters
}: MainHeaderProps) {
  return (
    <div className="border-b border-border bg-background p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" data-testid="sidebar-trigger" />
          {hasFilters && onToggleFilters && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleFilters}
                  >
                    {showFilters ? (
                      <IconFilterOff className="h-4 w-4" />
                    ) : (
                      <IconFilter className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{showFilters ? "Hide Filters" : "Show Filters"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {(title || description) && (
          <DataTableTitle title={title || ""} description={description} />
        )}
        <div className="ml-auto">
          <SearchInput />
        </div>
      </div>
    </div>
  )
}