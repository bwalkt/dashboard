'use client'

import type { FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import type { BaseFormFieldProps } from '@/types/base-form'

interface FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  showDescription?: boolean
}

/**
 * Renders a labeled toggle switch bound to a react-hook-form field.
 *
 * @param control - The react-hook-form control used to connect the field to form state
 * @param name - The field path within the form values
 * @param label - The visible label text displayed next to the switch
 * @param description - Optional descriptive text shown under the label
 * @param required - If true, displays a required indicator next to the label
 * @param showDescription - Whether to render the description (default: `true`)
 * @param disabled - If true, disables the switch control
 * @param className - Additional CSS classes applied to the outer FormItem
 * @returns The JSX element for a form-connected switch component
 */
function FormSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  showDescription = true,
  disabled,
  className,
}: FormSwitchProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-4 ${className}`}>
          <div className="space-y-0.5">
            <FormLabel className="text-base">
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </FormLabel>
            {showDescription && description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

export { FormSwitch }
