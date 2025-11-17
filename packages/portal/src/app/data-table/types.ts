import type { TimelineData } from '@/components/data-table/data-table-timeline-cell'
import { REGIONS } from '@/constants/region'
import { TAGS } from '@/constants/tag'

export type ColumnSchema = {
  name: string
  url: string
  public: boolean
  active: boolean
  regions: (typeof REGIONS)[number][]
  tags: (typeof TAGS)[number][]
  date: Date
  p95?: number | undefined
  timeline?: TimelineData
  employeeStatus?: 'Active' | 'Inactive' | 'On Leave'
  projectStatus?: 'Planning' | 'In Progress' | 'Completed' | 'On Hold'
  priority?: 'Low' | 'Medium' | 'High'
}
