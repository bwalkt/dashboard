import type { LucideIcon } from 'lucide-react'
import type { FieldConfig } from '../auto-form/types'

export interface StepSchema<T = any> {
  formSchema: any // AJV schema object
  label: string
  stepIcon: string | LucideIcon // Allow both string and LucideIcon
  fieldConfig?: FieldConfig<T>
  dependencies?: {
    [key: string]: {
      field: string
      type: 'setOptions' | 'disabled' | 'required' | 'hidden'
      condition: {
        value: any
      }
      options?: any
    }
  }
}

// Define the overall schema structure
export interface StepperSchema {
  steps: StepSchema<any>[]
}
