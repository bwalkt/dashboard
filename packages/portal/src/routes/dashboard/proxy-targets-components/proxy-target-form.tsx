'use client'

import { createValidator } from '@pzero/shared/validator'
import { useForm } from 'react-hook-form'
import { FormInput } from '@/components/forms/form-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { createAjvResolver } from '@/lib/ajv-resolver'
import type { CreateProxyTargetRequest, ProxyTarget, UpdateProxyTargetRequest } from '@/types/proxy-targets'

interface ProxyTargetFormData {
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

const validateCreateForm = createValidator<ProxyTargetFormData>(createFormSchema)
const validateUpdateForm = createValidator<Partial<ProxyTargetFormData>>(updateFormSchema)

// Separate handlers for create and update to fix type issues
interface ProxyTargetFormPropsCreate {
  target?: never
  onSubmit: (data: CreateProxyTargetRequest) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

interface ProxyTargetFormPropsUpdate {
  target: ProxyTarget
  onSubmit: (data: UpdateProxyTargetRequest) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ProxyTargetForm({
  target,
  onSubmit,
  onCancel,
  isLoading,
}: ProxyTargetFormPropsCreate | ProxyTargetFormPropsUpdate) {
  const isEditMode = !!target
  const form = useForm<ProxyTargetFormData>({
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

  const handleSubmit = async (data: ProxyTargetFormData) => {
    await onSubmit(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Proxy Target' : 'Create Proxy Target'}</CardTitle>
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
              description="Hostname or URL of the proxy target (must be unique)"
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
