import React from 'react'
import type { DataTableFilterField } from '@/components/data-table/types'

interface MobileFilterDisplayProps {
  filterFields: DataTableFilterField<any>[]
}

export function MobileFilterDisplay({ filterFields }: MobileFilterDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Available Filters</div>
      <div className="space-y-3">
        {filterFields.map((field, index) => (
          <div key={index} className="border rounded-lg p-3">
            <div className="font-medium text-sm mb-2">{field.label}</div>
            <div className="text-xs text-muted-foreground">
              Type: {field.type}
              {field.options && ` • ${field.options.length} options`}
            </div>
            {field.type === 'slider' && (
              <div className="text-xs text-muted-foreground mt-1">
                Range: {(field as any).min} - {(field as any).max}
              </div>
            )}
            {field.options && field.options.length <= 5 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {field.options.slice(0, 5).map((option, optIndex) => (
                  <span key={optIndex} className="text-xs bg-muted px-2 py-1 rounded">
                    {typeof option === 'object' ? option.label || option.value : option}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Note: Use the main data table interface to apply filters.
      </div>
    </div>
  )
}