'use client'

import type { FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BaseFormFieldProps, FormOption } from '@/types/base-form'

interface FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  options: FormOption[]
  placeholder?: string
  searchable?: boolean
}

/**
 * Renders a form-connected select input wired to react-hook-form with provided options and UI chrome.
 *
 * @param label - Visible label text placed above the select; omitted when falsy.
 * @param description - Optional helper text shown below the select.
 * @param required - When true, indicates the field is required and renders a visual required marker.
 * @param options - Array of selectable options; each option's `value` is used as the select value and `label` is shown to the user.
 * @param placeholder - Text shown inside the select when no value is selected. Defaults to "Select an option".
 * @param disabled - When true, disables the select input.
 * @param className - Optional CSS class applied to the FormItem wrapper.
 * @returns A JSX element representing the form-connected select field with label, options, description, and validation message.
 */
function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  options,
  placeholder = 'Select an option',
  disabled,
  className,
}: FormSelectProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </FormLabel>
          )}
          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export { FormSelect, type FormOption }
