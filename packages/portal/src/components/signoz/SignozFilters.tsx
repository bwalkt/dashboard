'use client'

import type { HttpMethod, SigNozFilters } from '@pzero/shared/types'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SignozFiltersProps {
  filters: SigNozFilters
  onFiltersChange: (filters: SigNozFilters) => void
  onQuery: () => void
  isLoading?: boolean
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

type TimeRangeOption = '15m' | '30m' | '1h'

const TIME_RANGE_OPTIONS: { value: TimeRangeOption; label: string }[] = [
  { value: '15m', label: 'Last 15 mins' },
  { value: '30m', label: 'Last 30 mins' },
  { value: '1h', label: 'Last 1 hour' },
]

function getTimeRangeFromOption(option: TimeRangeOption): { startTime: number; endTime: number } {
  const now = Date.now()
  const minutes = option === '15m' ? 15 : option === '30m' ? 30 : 60
  const startTime = now - minutes * 60 * 1000
  return { startTime, endTime: now }
}

function getTimeRangeOptionFromFilters(filters: SigNozFilters): TimeRangeOption | undefined {
  if (!filters.startTime || !filters.endTime) return undefined

  const duration = filters.endTime - filters.startTime
  const minutes = duration / (60 * 1000)

  // Find the closest matching option
  if (Math.abs(minutes - 15) < 5) return '15m'
  if (Math.abs(minutes - 30) < 5) return '30m'
  if (Math.abs(minutes - 60) < 5) return '1h'

  return undefined
}

export function SignozFilters({ filters, onFiltersChange, onQuery, isLoading = false }: SignozFiltersProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRangeOption>(() => {
    return getTimeRangeOptionFromFilters(filters) || '1h'
  })

  // Initialize filters with default time range if not set
  React.useEffect(() => {
    if (!filters.startTime || !filters.endTime) {
      const { startTime, endTime } = getTimeRangeFromOption('1h')
      onFiltersChange({
        ...filters,
        startTime,
        endTime,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update filters when time range changes
  const handleTimeRangeChange = (value: TimeRangeOption) => {
    setTimeRange(value)
    const { startTime, endTime } = getTimeRangeFromOption(value)
    onFiltersChange({
      ...filters,
      startTime,
      endTime,
    })
  }

  const handleServiceNameChange = (value: string) => {
    onFiltersChange({
      ...filters,
      serviceName: value || undefined,
    })
  }

  const handleHttpMethodChange = (value: string) => {
    onFiltersChange({
      ...filters,
      httpMethod: value === 'all' ? undefined : (value as HttpMethod | undefined),
    })
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Service Name Filter */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="service-name">Service Name</Label>
          <Input
            id="service-name"
            placeholder="Enter service name (optional)"
            value={filters.serviceName || ''}
            onChange={e => handleServiceNameChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* HTTP Method Filter */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="http-method">HTTP Method</Label>
          <Select value={filters.httpMethod || 'all'} onValueChange={handleHttpMethodChange}>
            <SelectTrigger id="http-method" className="w-full">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {HTTP_METHODS.map(method => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Range Dropdown */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="time-range">Time Range</Label>
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger id="time-range" className="w-full">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Query Button */}
        <div className="flex items-end">
          <Button onClick={onQuery} disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? 'Querying...' : 'Query'}
          </Button>
        </div>
      </div>
    </div>
  )
}
