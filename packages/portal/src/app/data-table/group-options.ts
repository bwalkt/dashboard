import type { GroupByOption } from '@/components/data-table/data-table-group-by'
import type { ColumnSchema } from './types'

export const groupByOptions: GroupByOption<ColumnSchema>[] = [
  {
    label: 'None',
    value: null,
  },
  {
    label: 'Employee Status',
    value: 'employeeStatus',
    color: '#3b82f6', // blue
  },
  {
    label: 'Project Status',
    value: 'projectStatus',
    color: '#10b981', // green
  },
  {
    label: 'Priority',
    value: 'priority',
    color: '#f59e0b', // amber
  },
  {
    label: 'Tags',
    value: 'tags',
    color: '#8b5cf6', // violet
  },
  {
    label: 'Regions',
    value: 'regions',
    color: '#ef4444', // red
  },
]
