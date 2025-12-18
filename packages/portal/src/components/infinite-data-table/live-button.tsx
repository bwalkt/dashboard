'use client'

import type { FetchPreviousPageOptions } from '@tanstack/react-query'
import { CirclePause, CirclePlay } from 'lucide-react'
import { type ParserBuilder, useQueryStates } from 'nuqs'
import * as React from 'react'
import { useDataTable } from '@/components/data-table/data-table-provider'
import { Button } from '@/components/ui/button'
import { useHotKey } from '@/hooks/use-hot-key'
import { cn } from '@/lib/utils'

const REFRESH_INTERVAL = 4_000

interface LiveButtonProps {
  fetchPreviousPage?: (options?: FetchPreviousPageOptions | undefined) => Promise<unknown>
  searchParamsParser: Record<string, ParserBuilder<any>>
  dateColumnId?: string
}

export function LiveButton({ fetchPreviousPage, searchParamsParser, dateColumnId = 'date' }: LiveButtonProps) {
  const [{ live, date, sort }, setSearch] = useQueryStates(searchParamsParser)
  const { table } = useDataTable()

  const handleClick = React.useCallback(() => {
    setSearch(prev => ({
      ...prev,
      live: !prev.live,
      date: null,
      sort: null,
    }))
    table.getColumn(dateColumnId)?.setFilterValue(undefined)
    table.resetSorting()
  }, [setSearch, table, dateColumnId])

  useHotKey(handleClick, 'j')

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout

    async function fetchData() {
      if (live) {
        await fetchPreviousPage?.()
        timeoutId = setTimeout(fetchData, REFRESH_INTERVAL)
      } else {
        clearTimeout(timeoutId)
      }
    }

    fetchData()

    return () => {
      clearTimeout(timeoutId)
    }
  }, [live, fetchPreviousPage])

  // REMINDER: make sure to reset live when date is set
  // TODO: test properly
  React.useEffect(() => {
    if ((date || sort) && live) {
      setSearch(prev => ({ ...prev, live: null }))
    }
  }, [date, sort, live, setSearch])

  return (
    <Button
      className={cn(live && 'border-info text-info hover:text-info')}
      onClick={handleClick}
      variant="outline"
      size="sm"
    >
      {live ? <CirclePause className="mr-2 h-4 w-4" /> : <CirclePlay className="mr-2 h-4 w-4" />}
      Live
    </Button>
  )
}

