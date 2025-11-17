import { cn } from '@/lib/utils'

export type StatusType =
  | 'todo'
  | 'working'
  | 'done'
  | 'stuck'
  | 'review'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'pending'

interface StatusCellProps {
  status: StatusType
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  fullCell?: boolean
}

const statusConfig: Record<
  StatusType,
  {
    label: string
    bgColor: string
    textColor: string
    icon?: string
  }
> = {
  todo: {
    label: 'To Do',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: '⏸️',
  },
  working: {
    label: 'In Progress',
    bgColor: 'bg-orange-400',
    textColor: 'text-white',
    icon: '🔄',
  },
  done: {
    label: 'Done',
    bgColor: 'bg-green-500',
    textColor: 'text-white',
    icon: '✅',
  },
  stuck: {
    label: 'Stuck',
    bgColor: 'bg-red-500',
    textColor: 'text-white',
    icon: '🚫',
  },
  review: {
    label: 'In Review',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
    icon: '👀',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-gray-400',
    textColor: 'text-white',
    icon: '❌',
  },
  active: {
    label: 'Active',
    bgColor: 'bg-green-500',
    textColor: 'text-white',
    icon: '✅',
  },
  inactive: {
    label: 'Inactive',
    bgColor: 'bg-gray-400',
    textColor: 'text-white',
    icon: '⏸️',
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-yellow-500',
    textColor: 'text-white',
    icon: '⏳',
  },
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

const fullCellClasses = 'w-full h-full px-3 text-sm rounded-none'

export function StatusCell({ status, className, size = 'md', showIcon = false, fullCell = false }: StatusCellProps) {
  const config = statusConfig[status]

  if (!config) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'bg-gray-100 text-gray-800',
          fullCell ? fullCellClasses : `rounded-md ${sizeClasses[size]}`,
          className,
        )}
      >
        {status}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium',
        config.bgColor,
        config.textColor,
        fullCell ? fullCellClasses : `rounded-md ${sizeClasses[size]}`,
        className,
      )}
    >
      {showIcon && config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </span>
  )
}

// Helper function to get all available status options
export function getStatusOptions(): { label: string; value: StatusType }[] {
  return Object.entries(statusConfig).map(([value, config]) => ({
    label: config.label,
    value: value as StatusType,
  }))
}
