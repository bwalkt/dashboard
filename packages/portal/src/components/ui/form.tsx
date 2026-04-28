'use client'

import type * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  type UseFormReturn,
  useFormContext,
  useFormState,
} from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ManagedFormProps<TFieldValues extends FieldValues, TContext, TTransformed> = {
  children: React.ReactNode
  onSubmit: React.FormEventHandler<HTMLFormElement>
  form: UseFormReturn<TFieldValues, TContext, TTransformed>
  className?: string
  id?: string
}

type ProviderFormProps<TFieldValues extends FieldValues, TContext, TTransformed> = UseFormReturn<
  TFieldValues,
  TContext,
  TTransformed
> & {
  children: React.ReactNode
}

const Form = <TFieldValues extends FieldValues = FieldValues, TContext = any, TTransformed = any>(
  props:
    | ManagedFormProps<TFieldValues, TContext, TTransformed>
    | ProviderFormProps<TFieldValues, TContext, TTransformed>,
) => {
  if (!('form' in props)) {
    return <FormProvider {...props} />
  }

  const { children, onSubmit, form, className, id } = props

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className={className} id={id}>
        {children}
      </form>
    </FormProvider>
  )
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

/**
 * Provides a container for a form field and supplies a unique item id to descendants via context.
 *
 * The component renders a div (data-slot="form-item") and exposes a generated `id` through FormItemContext so related form primitives can reference the same item.
 *
 * @returns The form item container element.
 */
function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
    </FormItemContext.Provider>
  )
}

/**
 * Renders a label for the current form field that is linked to the form item's id and indicates validation errors.
 *
 * @returns A Label element whose `htmlFor` is the form item's id and whose `data-error` attribute and styling reflect whether the field has a validation error.
 */
function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

/**
 * Renders a Slot as the form control for the current field and wires accessibility attributes.
 *
 * @returns A Slot element with `id`, `aria-describedby`, and `aria-invalid` set according to the field's state so assistive technologies can associate descriptions and error messages.
 */
function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
}

/**
 * Renders a paragraph that serves as the accessible description for the current form field.
 *
 * @returns A `<p>` element whose `id` is bound to the field's description ID and which includes styling and `data-slot="form-description"`.
 */
function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

/**
 * Renders a form field message element that shows either the field error message or the provided description.
 *
 * Uses the field's error message when present; otherwise uses the component's children. If there is no message
 * or children, nothing is rendered.
 *
 * @returns A paragraph element containing the field's error message or description, or `null` if no message is available.
 */
function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? '') : props.children

  if (!body) {
    return null
  }

  return (
    <p data-slot="form-message" id={formMessageId} className={cn('text-destructive text-sm', className)} {...props}>
      {body}
    </p>
  )
}

export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField }
