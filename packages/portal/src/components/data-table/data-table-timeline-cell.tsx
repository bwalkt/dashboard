import * as React from 'react'
import { cn } from '@/lib/utils'

export type TimelineItem = {
  dateRange: string
  isActive?: boolean
  variant?: 'active' | 'completed' | 'upcoming'
}

export type TimelineData = TimelineItem[]

interface TimelineCellProps {
  timeline: TimelineData
  className?: string
  compact?: boolean
  maxItems?: number
}

const variantConfig = {
  active: {
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
    borderColor: 'border-blue-500',
  },
  completed: {
    bgColor: 'bg-gray-700',
    textColor: 'text-white',
    borderColor: 'border-gray-700',
  },
  upcoming: {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
}

export function TimelineCell({ timeline, className, compact = false, maxItems = 3 }: TimelineCellProps) {
  if (timeline?.length === 0) {
    return <div className={cn('text-muted-foreground text-sm', className)}>No timeline data</div>
  }

  const displayItems = timeline.slice(0, maxItems)
  const hasMore = timeline.length > maxItems

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-xs font-medium text-gray-600 mb-2">Timeline</div>
      <div className="space-y-1.5">
        {displayItems.map((item, index) => {
          const variant = item.variant || (item.isActive ? 'active' : 'completed')
          const config = variantConfig[variant]

          return (
            <div
              key={index}
              className={cn(
                'flex items-center justify-center rounded-full font-medium',
                compact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm',
                config.bgColor,
                config.textColor,
                'transition-colors duration-200',
              )}
            >
              {item.dateRange}
            </div>
          )
        })}
        {hasMore && (
          <div
            className={cn(
              'flex items-center justify-center rounded-full font-medium',
              'bg-gray-50 text-gray-500 border border-dashed border-gray-300',
              compact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm',
            )}
          >
            +{timeline.length - maxItems} more
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to create timeline data from date ranges
export function createTimelineData(
  ranges: Array<{ start: Date; end: Date; isActive?: boolean; variant?: TimelineItem['variant'] }>,
): TimelineData {
  return ranges.map(({ start, end, isActive, variant }) => ({
    dateRange: `${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`,
    isActive,
    variant,
  }))
}

// Helper function to create timeline from simple date strings
export function createSimpleTimeline(dateRanges: string[], activeIndex?: number): TimelineData {
  return dateRanges.map((dateRange, index) => ({
    dateRange,
    isActive: activeIndex === index,
    variant:
      activeIndex !== undefined
        ? index === activeIndex
          ? 'active'
          : index < activeIndex
            ? 'completed'
            : 'upcoming'
        : 'completed',
  }))
}
