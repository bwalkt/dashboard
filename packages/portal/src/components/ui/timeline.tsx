'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type TimelineMode = 'vertical' | 'vertical-alternating' | 'horizontal'

export interface TimelineItem {
  id: string
  title: string
  cardTitle?: string
  cardSubtitle?: string
  cardDetailedText?: string | string[]
  date?: string | Date
  icon?: React.ReactNode
  iconClassName?: string
  media?: {
    type: 'IMAGE' | 'VIDEO'
    source: { url: string }
    name?: string
  }
  active?: boolean
  disabled?: boolean
  children?: React.ReactNode
}

export interface TimelineProps {
  items: TimelineItem[]
  mode?: TimelineMode
  activeItemIndex?: number
  onItemClick?: (item: TimelineItem, index: number) => void
  lineClassName?: string
  className?: string
  cardClassName?: string
  showConnector?: boolean
}

// =============================================================================
// Variants
// =============================================================================

const timelineVariants = cva('relative', {
  variants: {
    mode: {
      vertical: 'flex flex-col',
      'vertical-alternating': 'flex flex-col',
      horizontal: 'flex flex-row overflow-x-auto pb-4',
    },
  },
  defaultVariants: {
    mode: 'vertical',
  },
})

const timelineItemVariants = cva('relative', {
  variants: {
    mode: {
      vertical: 'flex gap-4 pb-8 last:pb-0',
      'vertical-alternating': 'flex gap-4 pb-8 last:pb-0',
      horizontal: 'flex flex-col items-center min-w-[200px] px-4',
    },
  },
  defaultVariants: {
    mode: 'vertical',
  },
})

const timelinePointVariants = cva(
  'relative z-10 flex items-center justify-center rounded-full border-2 bg-background transition-colors',
  {
    variants: {
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-6 w-6',
      },
      active: {
        true: 'border-primary bg-primary',
        false: 'border-muted-foreground/40',
      },
      disabled: {
        true: 'opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      active: false,
      disabled: false,
    },
  },
)

// =============================================================================
// Timeline Components
// =============================================================================

const TimelineContext = React.createContext<{
  mode: TimelineMode
  activeItemIndex?: number
}>({
  mode: 'vertical',
})

function Timeline({
  items,
  mode = 'vertical',
  activeItemIndex,
  onItemClick,
  lineClassName,
  className,
  cardClassName,
  showConnector = true,
}: TimelineProps) {
  return (
    <TimelineContext.Provider value={{ mode, activeItemIndex }}>
      <div className={cn(timelineVariants({ mode }), className)}>
        {/* Connector line for vertical modes */}
        {showConnector && mode !== 'horizontal' && (
          <div
            className={cn(
              'absolute left-[7px] top-0 h-full w-0.5 bg-border',
              mode === 'vertical-alternating' && 'left-1/2 -translate-x-1/2',
              lineClassName,
            )}
          />
        )}

        {/* Connector line for horizontal mode */}
        {showConnector && mode === 'horizontal' && (
          <div className={cn('absolute left-0 right-0 top-[7px] h-0.5 bg-border', lineClassName)} />
        )}

        {items.map((item, index) => (
          <TimelineItemComponent
            key={item.id}
            item={item}
            index={index}
            mode={mode}
            isActive={activeItemIndex === index || item.active}
            isAlternate={mode === 'vertical-alternating' && index % 2 === 1}
            onClick={onItemClick ? () => onItemClick(item, index) : undefined}
            cardClassName={cardClassName}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </TimelineContext.Provider>
  )
}

interface TimelineItemComponentProps {
  item: TimelineItem
  index: number
  mode: TimelineMode
  isActive?: boolean
  isAlternate?: boolean
  onClick?: () => void
  cardClassName?: string
  isLast?: boolean
}

function TimelineItemComponent({
  item,
  index,
  mode,
  isActive,
  isAlternate,
  onClick,
  cardClassName,
  isLast,
}: TimelineItemComponentProps) {
  const isHorizontal = mode === 'horizontal'
  const isVerticalAlternating = mode === 'vertical-alternating'

  return (
    <div
      className={cn(
        timelineItemVariants({ mode }),
        isVerticalAlternating && (isAlternate ? 'flex-row-reverse' : 'flex-row'),
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Point/Icon */}
      <div
        className={cn(
          'flex flex-col items-center',
          isHorizontal && 'flex-row',
          isVerticalAlternating && 'absolute left-1/2 -translate-x-1/2',
        )}
      >
        <TimelinePoint active={isActive} disabled={item.disabled} icon={item.icon} iconClassName={item.iconClassName} />
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 min-w-0',
          isHorizontal && 'mt-4 text-center',
          isVerticalAlternating && (isAlternate ? 'pr-8 text-right w-[calc(50%-16px)]' : 'pl-8 w-[calc(50%-16px)]'),
        )}
      >
        <TimelineCard item={item} className={cardClassName} isHorizontal={isHorizontal} isAlternate={isAlternate} />
      </div>
    </div>
  )
}

interface TimelinePointProps extends VariantProps<typeof timelinePointVariants> {
  icon?: React.ReactNode
  iconClassName?: string
}

function TimelinePoint({ active, disabled, icon, iconClassName }: TimelinePointProps) {
  return (
    <div className={cn(timelinePointVariants({ size: icon ? 'lg' : 'md', active, disabled }), iconClassName)}>
      {icon && <span className="text-xs">{icon}</span>}
    </div>
  )
}

interface TimelineCardProps {
  item: TimelineItem
  className?: string
  isHorizontal?: boolean
  isAlternate?: boolean
}

function TimelineCard({ item, className, isHorizontal, isAlternate }: TimelineCardProps) {
  const formattedDate = item.date ? (typeof item.date === 'string' ? item.date : item.date.toLocaleDateString()) : null

  return (
    <div className={cn('rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50', className)}>
      {/* Title/Date row */}
      <div className={cn('flex items-center gap-2', isHorizontal && 'justify-center', isAlternate && 'justify-end')}>
        {item.title && <span className="text-xs font-medium text-muted-foreground">{item.title}</span>}
        {formattedDate && <span className="text-xs text-muted-foreground">{formattedDate}</span>}
      </div>

      {/* Card Title */}
      {item.cardTitle && (
        <h4 className={cn('mt-1 font-semibold text-sm', isHorizontal && 'text-center', isAlternate && 'text-right')}>
          {item.cardTitle}
        </h4>
      )}

      {/* Card Subtitle */}
      {item.cardSubtitle && (
        <p className={cn('text-xs text-muted-foreground', isHorizontal && 'text-center', isAlternate && 'text-right')}>
          {item.cardSubtitle}
        </p>
      )}

      {/* Card Detailed Text */}
      {item.cardDetailedText && (
        <div
          className={cn('mt-2 text-sm text-foreground/80', isHorizontal && 'text-center', isAlternate && 'text-right')}
        >
          {Array.isArray(item.cardDetailedText) ? (
            <ul className={cn('list-disc pl-4 space-y-1', isAlternate && 'list-inside pl-0')}>
              {item.cardDetailedText.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          ) : (
            <p>{item.cardDetailedText}</p>
          )}
        </div>
      )}

      {/* Media */}
      {item.media && (
        <div className="mt-2">
          {item.media.type === 'IMAGE' && (
            <img
              src={item.media.source.url}
              alt={item.media.name || 'Timeline media'}
              className="rounded-md max-h-32 object-cover"
            />
          )}
          {item.media.type === 'VIDEO' && (
            <video src={item.media.source.url} controls className="rounded-md max-h-32" />
          )}
        </div>
      )}

      {/* Custom Children */}
      {item.children}
    </div>
  )
}

// =============================================================================
// Simple Timeline (for minimal use cases like challenge chain)
// =============================================================================

export interface SimpleTimelineItem {
  id: string
  label: string
  sublabel?: string
  status?: 'completed' | 'current' | 'pending' | 'error' | 'previous' | 'executed'
  icon?: React.ReactNode
}

export interface SimpleTimelineProps {
  items: SimpleTimelineItem[]
  className?: string
  onItemClick?: (item: SimpleTimelineItem, index: number) => void
}

function SimpleTimeline({ items, className, onItemClick }: SimpleTimelineProps) {
  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Vertical connector line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />

      {items.map((item, index) => {
        const statusColors = {
          current: 'bg-green-500 border-green-500 ring-2 ring-green-500/20', // Current: Green
          previous: 'bg-blue-500 border-blue-500', // Previous: Blue
          executed: 'bg-blue-500 border-blue-500', // Executed next: Blue
          completed: 'bg-blue-500 border-blue-500', // Completed: Blue (alias)
          pending: 'bg-muted border-muted-foreground/40', // Not executed: Gray
          error: 'bg-destructive border-destructive',
        }

        const statusColor = item.status ? statusColors[item.status] : statusColors.pending

        return (
          <div
            key={item.id}
            className={cn(
              'relative flex items-start gap-3 py-2',
              onItemClick && 'cursor-pointer hover:bg-accent/50 rounded-md px-1 -mx-1',
            )}
            onClick={onItemClick ? () => onItemClick(item, index) : undefined}
          >
            {/* Point */}
            <div
              className={cn(
                'relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background transition-all',
                statusColor,
              )}
            >
              {item.icon && <span className="text-[10px] text-white">{item.icon}</span>}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-mono text-xs truncate',
                    item.status === 'current' && 'font-semibold text-primary',
                    item.status === 'error' && 'text-destructive',
                  )}
                >
                  {item.label}
                </span>
              </div>
              {item.sublabel && <span className="text-xs text-muted-foreground">{item.sublabel}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { Timeline, SimpleTimeline, TimelinePoint, TimelineCard }
