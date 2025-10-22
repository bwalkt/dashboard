'use client'

import type { FieldPath, FieldValues } from 'react-hook-form'
import { FileUploader, FileUploaderProps } from '@/components/file-uploader'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { BaseFormFieldProps, FileUploadConfig } from '@/types/base-form'

interface FormFileUploadProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  config?: FileUploadConfig
}

/**
 * Renders a react-hook-form controlled file upload field with label, description, validation message, and configurable FileUploader behavior.
 *
 * @param control - react-hook-form control object used to register and manage the field
 * @param name - form field name/path bound to react-hook-form
 * @param label - optional label text shown above the uploader
 * @param description - optional descriptive text shown below the uploader
 * @param required - whether the field is required; shows a visual required indicator when true
 * @param config - optional FileUploadConfig to control accepted types, size limits, concurrency, callbacks, and other FileUploader options
 * @param disabled - disables the FileUploader when true
 * @param className - optional CSS class applied to the FormItem wrapper
 * @returns The form field element containing the configured FileUploader component and validation UI
 */
function FormFileUpload<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  required,
  config,
  disabled,
  className,
}: FormFileUploadProps<TFieldValues, TName>) {
  const { maxSize, acceptedTypes, multiple, maxFiles, onUpload, progresses, ...restConfig } = config || {}

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
            <FileUploader
              value={field.value}
              onValueChange={field.onChange}
              onUpload={onUpload}
              progresses={progresses}
              accept={acceptedTypes?.reduce((acc, type) => ({ ...acc, [type]: [] }), {})}
              maxSize={maxSize}
              maxFiles={maxFiles}
              multiple={multiple}
              disabled={disabled}
              {...restConfig}
            />
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export { FormFileUpload, type FileUploadConfig }
