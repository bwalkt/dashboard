'use client'

import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { FieldPath, FieldValues } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { BaseFormFieldProps, DatePickerConfig } from '@/types/base-form'

interface FormDatePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  config?: DatePickerConfig
}

/**
 * Renders a form-connected date picker that opens a calendar in a popover for selecting a single date.
 *
 * @param control - react-hook-form control object used to register and manage the field state
 * @param name - field name path within the form values
 * @param label - optional label text displayed above the control
 * @param description - optional helper text displayed under the control
 * @param required - when true, displays a required indicator next to the label
 * @param config - optional configuration for the date picker
 * @param config.minDate - earliest selectable date; dates before this are disabled
 * @param config.maxDate - latest selectable date; dates after this are disabled
 * @param config.disabledDates - array of specific Date objects to disable (compared by time)
 * @param config.placeholder - placeholder text shown when no date is selected
 * @param disabled - when true, disables interaction with the trigger button
 * @param className - optional additional CSS classes applied to the root form item
 * @returns A JSX element that renders a form field with a button trigger and a popover calendar for selecting a date
 */
function FormDatePicker<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  config = {},
  disabled,
  className,
}: FormDatePickerProps<TFieldValues, TName>) {
  const { minDate, maxDate, disabledDates = [], placeholder = 'Pick a date' } = config

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`flex flex-col ${className}`}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </FormLabel>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={`w-full pl-3 text-left font-normal ${!field.value && 'text-muted-foreground'}`}
                  disabled={disabled}
                >
                  {field.value ? format(field.value, 'PPP') : <span>{placeholder}</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={date => {
                  if (minDate && date < minDate) return true
                  if (maxDate && date > maxDate) return true
                  return disabledDates.some(disabledDate => date.getTime() === disabledDate.getTime())
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export { FormDatePicker }
