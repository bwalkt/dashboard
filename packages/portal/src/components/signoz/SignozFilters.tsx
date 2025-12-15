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

type TimeRangeOption = '15m' | '30m' | '1h' | '5h' | '10h' | '24h' | '1w'

const TIME_RANGE_OPTIONS: { value: TimeRangeOption; label: string }[] = [
  { value: '15m', label: 'Last 15 mins' },
  { value: '30m', label: 'Last 30 mins' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '5h', label: 'Last 5 hours' },
  { value: '10h', label: 'Last 10 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '1w', label: 'Last 1 week' },
]

function getTimeRangeFromOption(option: TimeRangeOption): { startTime: number; endTime: number } {
  const now = Date.now()

  let minutes: number
  switch (option) {
    case '15m':
      minutes = 15
      break
    case '30m':
      minutes = 30
      break
    case '1h':
      minutes = 60
      break
    case '5h':
      minutes = 5 * 60
      break
    case '10h':
      minutes = 10 * 60
      break
    case '24h':
      minutes = 24 * 60
      break
    case '1w':
      minutes = 7 * 24 * 60
      break
    default:
      minutes = 60
  }

  const startTime = now - minutes * 60 * 1000
  return { startTime, endTime: now }
}

function getTimeRangeOptionFromFilters(filters: SigNozFilters): TimeRangeOption | undefined {
  if (!filters.startTime || !filters.endTime) return undefined

  const duration = filters.endTime - filters.startTime
  const minutes = duration / (60 * 1000)

  // Find the closest matching option (tolerances in minutes)
  if (Math.abs(minutes - 15) < 5) return '15m'
  if (Math.abs(minutes - 30) < 5) return '30m'
  if (Math.abs(minutes - 60) < 10) return '1h'
  if (Math.abs(minutes - 5 * 60) < 30) return '5h'
  if (Math.abs(minutes - 10 * 60) < 30) return '10h'
  if (Math.abs(minutes - 24 * 60) < 60) return '24h'
  if (Math.abs(minutes - 7 * 24 * 60) < 120) return '1w'

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
