'use client'

import type { FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { BaseFormFieldProps } from '@/types/base-form'

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  step?: string | number
  min?: string | number
  max?: string | number
}

/**
 * Render a form-connected input with optional label, description, and validation message.
 *
 * The input is wired to react-hook-form via `control`/`name`. When `type` is `"number"`,
 * user input is converted to a number for the form value; an empty string becomes `undefined`.
 *
 * @param control - react-hook-form control instance used to register the field
 * @param name - field path within the form values
 * @param label - optional visible label text
 * @param description - optional helper text rendered below the control
 * @param required - whether the field is required; renders a visible asterisk when true
 * @param type - input type; supports `"text"`, `"email"`, `"password"`, `"number"`, `"tel"`, `"url"`
 * @param placeholder - optional placeholder text for the input
 * @param step - step attribute applied to numeric inputs
 * @param min - minimum value for numeric inputs
 * @param max - maximum value for numeric inputs
 * @param disabled - whether the input is disabled
 * @param className - optional class name applied to the form item container
 * @returns The JSX element for the connected form input
 */
function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  type = 'text',
  placeholder,
  step,
  min,
  max,
  disabled,
  className,
}: FormInputProps<TFieldValues, TName>) {
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
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              step={step}
              min={min}
              max={max}
              disabled={disabled}
              {...field}
              onChange={e => {
                if (type === 'number') {
                  const value = e.target.value
                  field.onChange(value === '' ? undefined : parseFloat(value))
                } else {
                  field.onChange(e.target.value)
                }
              }}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export { FormInput }
