'use client'

import { createValidator } from '@boardwalk/shared/validator/ajv'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import LocationSelector from '@/components/ui/location-input'
import { createAjvResolver } from '@/lib/ajv-resolver'

// =============================================================================
// TypeScript Interface
// =============================================================================

interface LocationFormData {
  location: [string, string?] // [country, state?]
}

// =============================================================================
// AJV Schema
// =============================================================================

const FormSchema = {
  type: 'object',
  properties: {
    location: {
      type: 'array',
      items: [
        { type: 'string', minLength: 1 }, // Country (required)
        { type: 'string' }, // State (optional)
      ],
      minItems: 1,
      maxItems: 2,
    },
  },
  required: ['location'],
  additionalProperties: false,
}

// =============================================================================
// Validator
// =============================================================================

const validateLocationForm = createValidator<LocationFormData>(FormSchema)

export function LocationForm() {
  const [countryName, setCountryName] = useState<string>('')
  const [stateName, setStateName] = useState<string>('')

  const form = useForm<LocationFormData>({
    resolver: createAjvResolver(validateLocationForm),
  })

  function onSubmit(data: LocationFormData) {
    toast(
      <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
        <code className="text-white">{JSON.stringify(data, null, 2)}</code>
      </pre>,
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div>
                <FormLabel>Country Selector</FormLabel>
              </div>
              <LocationSelector
                onCountryChange={country => {
                  setCountryName(country?.name || '')
                  form.setValue(field.name, [country?.name || '', form.getValues('location')[1] || ''])
                }}
                onStateChange={state => {
                  setStateName(state?.name || '')
                  form.setValue(field.name, [form.getValues('location')[0] || '', state?.name || ''])
                }}
              />
              <FormDescription>Please select state after selecting your country</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
