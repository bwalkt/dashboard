'use client'

import type { FieldPath, FieldValues } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { BaseFormFieldProps } from '@/types/base-form'

interface FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  checkboxLabel?: string
}

/**
 * Renders a react-hook-form bound checkbox with label, optional description, required indicator, and disabled state.
 *
 * @param control - react-hook-form control object for the field
 * @param name - field name within the form values
 * @param label - fallback text label shown when `checkboxLabel` is not provided
 * @param checkboxLabel - label text shown adjacent to the checkbox; takes precedence over `label`
 * @param description - optional supplementary text displayed under the label
 * @param required - when true, displays a red asterisk next to the label
 * @param disabled - when true, disables the checkbox input
 * @param className - additional CSS class names applied to the form item container
 * @returns A form field containing a controlled checkbox with its label, optional description, and validation message
 */
function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  checkboxLabel,
  disabled,
  className,
}: FormCheckboxProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`flex flex-row items-start space-y-0 space-x-3 ${className}`}>
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>
              {checkboxLabel || label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export { FormCheckbox }
