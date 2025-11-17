'use client'

import { IconFilter, IconFilterOff } from '@tabler/icons-react'
import { MenuIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/use-media-query'
import { DataTableTitle } from '../data-table/data-table-title'
import SearchInput from '../search-input'

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
  onToggleFilters,
}: MainHeaderProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { setOpenMobile } = useSidebar()

  return (
    <div className="border-b border-border bg-background p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isMobile ? (
            // Mobile: Single hamburger menu that opens mobile sidebar
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setOpenMobile(true)}>
              <MenuIcon className="w-4 h-4" />
            </Button>
          ) : (
            // Desktop: Original sidebar trigger and filter button
            <>
              <SidebarTrigger className="-ml-1" data-testid="sidebar-trigger" />
              {hasFilters && onToggleFilters && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={onToggleFilters}>
                        {showFilters ? <IconFilterOff className="h-4 w-4" /> : <IconFilter className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{showFilters ? 'Hide Filters' : 'Show Filters'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </div>
        {(title || description) && <DataTableTitle title={title || ''} description={description} />}
        {!isMobile && (
          <div className="ml-auto">
            <SearchInput />
          </div>
        )}
      </div>
    </div>
  )
}
