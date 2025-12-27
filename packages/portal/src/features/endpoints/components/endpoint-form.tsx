'use client'

import { createValidator } from '@pzero/shared/validator'
import { useForm } from 'react-hook-form'
import { FormInput } from '@/components/forms/form-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { createAjvResolver } from '@/lib/ajv-resolver'
import type { CreateEndpointRequest, Endpoint, UpdateEndpointRequest } from '@/types/endpoints'

interface EndpointFormData {
  name: string
  url: string
  port?: number
}

// AJV Schema for validation
const createFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    url: { type: 'string', minLength: 1, maxLength: 255 },
    port: { type: 'number', minimum: 1, maximum: 65535 },
  },
  required: ['name', 'url'],
  additionalProperties: false,
}

const updateFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    url: { type: 'string', minLength: 1, maxLength: 255 },
    port: { type: 'number', minimum: 1, maximum: 65535 },
  },
  additionalProperties: false,
}

const validateCreateForm = createValidator<EndpointFormData>(createFormSchema)
const validateUpdateForm = createValidator<Partial<EndpointFormData>>(updateFormSchema)

// Separate handlers for create and update to fix type issues
interface EndpointFormPropsCreate {
  target?: never
  onSubmit: (data: CreateEndpointRequest) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

interface EndpointFormPropsUpdate {
  target: Endpoint
  onSubmit: (data: UpdateEndpointRequest) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function EndpointForm({
  target,
  onSubmit,
  onCancel,
  isLoading,
}: EndpointFormPropsCreate | EndpointFormPropsUpdate) {
  const isEditMode = !!target
  const form = useForm<EndpointFormData>({
    resolver: isEditMode
      ? (createAjvResolver(validateUpdateForm) as any)
      : (createAjvResolver(validateCreateForm) as any),
    defaultValues: target
      ? {
          name: target.name,
          url: target.url,
          port: target.port ?? undefined,
        }
      : {
          name: '',
          url: '',
          port: undefined,
        },
  })

  const handleSubmit = async (data: EndpointFormData) => {
    await onSubmit(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Endpoint' : 'Create Endpoint'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form form={form as any} onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4">
            <FormInput control={form.control} name="name" label="Name" placeholder="e.g., Salesforce Server" required />

            <FormInput
              control={form.control}
              name="url"
              label="URL"
              placeholder="e.g., pzero-sfdc-server"
              description="Hostname or URL of the endpoint (must be unique)"
              required
            />

            <FormInput
              control={form.control}
              name="port"
              type="number"
              label="Port"
              placeholder="80 (default)"
              min={1}
              max={65535}
              description="Port number (1-65535). Defaults to 80 if not specified."
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  )
}
