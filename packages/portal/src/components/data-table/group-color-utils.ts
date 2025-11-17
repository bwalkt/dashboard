import type { StatusType } from './data-table-status-cell'

// Color mappings for status types
const statusColorMap: Record<StatusType, string> = {
  todo: '#9ca3af', // gray-400
  working: '#fb923c', // orange-400
  done: '#10b981', // green-500
  stuck: '#ef4444', // red-500
  review: '#3b82f6', // blue-500
  cancelled: '#6b7280', // gray-500
  active: '#10b981', // green-500
  inactive: '#6b7280', // gray-500
  pending: '#eab308', // yellow-500
}

// Color mappings for other common groupings
const departmentColorMap: Record<string, string> = {
  Engineering: '#3b82f6', // blue
  Product: '#8b5cf6', // purple
  Design: '#ec4899', // pink
  Marketing: '#f59e0b', // amber
  Sales: '#10b981', // emerald
  Finance: '#14b8a6', // teal
  Analytics: '#06b6d4', // cyan
  'Human Resources': '#84cc16', // lime
}

const employeeStatusColorMap: Record<string, string> = {
  active: '#10b981', // green-500
  inactive: '#6b7280', // gray-500
  pending: '#eab308', // yellow-500
}

export function getGroupColor(groupKey: string, groupValue: any, columnKey: string): string {
  // Handle different column types
  switch (columnKey) {
    case 'status':
    case 'employeeStatus':
      return employeeStatusColorMap[groupValue] || '#6b7280'

    case 'projectStatus': {
      // The groupValue is already the StatusType (e.g., "working", "done")
      // Use it directly to get the color
      return statusColorMap[groupValue as StatusType] || '#6b7280'
    }

    case 'priority': {
      // Map priority to status types
      const priorityMapping: Record<string, StatusType> = {
        Low: 'inactive',
        Medium: 'working',
        High: 'stuck',
      }
      const statusType = priorityMapping[groupValue]
      return statusType ? statusColorMap[statusType] : '#6b7280'
    }

    case 'department':
      return departmentColorMap[groupValue] || '#6b7280'

    case 'role':
      // Generate consistent colors for roles based on hash
      return hashStringToColor(groupValue)

    case 'tags':
    case 'regions':
      // Generate consistent colors for tags/regions
      return hashStringToColor(groupValue)

    default:
      return '#6b7280' // default gray
  }
}

// Simple hash function to generate consistent colors
function hashStringToColor(str: string): string {
  if (str == null || typeof str !== 'string') {
    return '#6b7280' // default gray for invalid input
  }
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ef4444', // red
  ]

  return colors[Math.abs(hash) % colors.length]
}
