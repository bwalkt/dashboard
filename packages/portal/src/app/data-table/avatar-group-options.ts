import type { GroupByOption } from '@/components/data-table/data-table-group-by'
import type { UserData } from './avatar-data'

export const avatarGroupByOptions: GroupByOption<UserData>[] = [
  {
    label: 'None',
    value: null,
  },
  {
    label: 'Department',
    value: 'department',
    color: '#3b82f6', // blue
  },
  {
    label: 'Employee Status',
    value: 'status',
    color: '#10b981', // green
  },
  {
    label: 'Project Status',
    value: 'projectStatus',
    color: '#f59e0b', // amber
  },
  {
    label: 'Role',
    value: 'role',
    color: '#8b5cf6', // violet
  },
]
