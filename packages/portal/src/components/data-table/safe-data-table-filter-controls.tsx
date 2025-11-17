'use client'

import React from 'react'
import { DataTableFilterControls } from './data-table-filter-controls'
import { DataTableContext } from './data-table-provider'
import type { DataTableFilterField } from './types'

interface SafeDataTableFilterControlsProps {
  filterFields?: DataTableFilterField<any>[]
}

export function SafeDataTableFilterControls({ filterFields: propFilterFields }: SafeDataTableFilterControlsProps) {
  const context = React.useContext(DataTableContext)

  // If we're not in a DataTableProvider context, show a fallback message
  if (!context) {
    if (!propFilterFields || propFilterFields.length === 0) {
      return <div className="text-muted-foreground text-sm">No filters available</div>
    }

    // Show static filter display when outside DataTableProvider
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium">Available Filters</div>
        <div className="space-y-3">
          {propFilterFields.map((field, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="font-medium text-sm mb-2">{field.label}</div>
              <div className="text-xs text-muted-foreground">
                Type: {field.type}
                {'options' in field && field.options && ` • ${field.options.length} options`}
              </div>
              {field.type === 'slider' && 'min' in field && 'max' in field && (
                <div className="text-xs text-muted-foreground mt-1">
                  Range: {field.min} - {field.max}
                </div>
              )}
              {'options' in field && field.options && field.options.length <= 5 && (
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
        <div className="text-xs text-muted-foreground">Note: Navigate to the page to use interactive filters.</div>
      </div>
    )
  }

  // If we're in a DataTableProvider context, use the full filter controls
  return <DataTableFilterControls filterFields={propFilterFields} />
}
