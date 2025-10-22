'use client'

import type { FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { BaseFormFieldProps, RadioGroupOption } from '@/types/base-form'

interface FormRadioGroupProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  options: RadioGroupOption[]
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Render a labeled radio-group form field that is synchronized with form state.
 *
 * Renders an optional label and description, a set of radio options (each with label and value),
 * an optional required indicator, and a validation message. The selected value is bound to the
 * provided form field and updates form state on change.
 *
 * @param options - Array of radio options; each option should provide `value`, `label`, and optional `disabled`.
 * @param orientation - Layout of the options; `'vertical'` (default) stacks options, `'horizontal'` lays them out in a row.
 * @param required - When true, displays a visual required indicator next to the label.
 * @param disabled - When true, disables all radio options in the group.
 * @param className - Optional container CSS class names applied to the form item wrapper.
 * @returns The rendered form field element containing the radio group and validation message.
 */
function FormRadioGroup<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  options,
  orientation = 'vertical',
  disabled,
  className,
}: FormRadioGroupProps<TFieldValues, TName>) {
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
          {description && <FormDescription>{description}</FormDescription>}
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              disabled={disabled}
              className={orientation === 'horizontal' ? 'flex flex-row space-x-6' : 'space-y-2'}
            >
              {options.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${name}-${option.value}`} disabled={option.disabled} />
                  <Label
                    htmlFor={`${name}-${option.value}`}
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export { FormRadioGroup, type RadioGroupOption }
