'use client'

import { createValidator } from '@boardwalk/shared/validator/ajv'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import Autocomplete from '@/components/ui/autocomplete'
import { Button } from '@/components/ui/button'
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { createAjvResolver } from '@/lib/ajv-resolver'

// =============================================================================
// TypeScript Interface
// =============================================================================

interface AutocompleteFormData {
  framework: string
}

// =============================================================================
// AJV Schema
// =============================================================================

const FormSchema = {
  type: 'object',
  properties: {
    framework: { type: 'string', minLength: 1 },
  },
  required: ['framework'],
  additionalProperties: false,
}

// =============================================================================
// Validator
// =============================================================================

const validateAutocompleteForm = createValidator<AutocompleteFormData>(FormSchema)

export function AutocompleteForm() {
  const form = useForm<AutocompleteFormData>({
    resolver: createAjvResolver(validateAutocompleteForm),
  })

  const onSubmit = (data: AutocompleteFormData) => {
    console.log('HEY', data)
    toast(
      <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
        <code className="text-white">{JSON.stringify(data, null, 2)}</code>
      </pre>,
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="framework"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div>
                <FormLabel>What is your favorite framework?</FormLabel>
              </div>
              <Autocomplete value={field.value} onChange={field.onChange} />
              <FormDescription>Please type and select your favorite framework?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
