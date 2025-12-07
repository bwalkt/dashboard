'use client'

import type { Org } from '@pzero/shared/pzero'
import { generateOrgHandle } from '@pzero/shared/utils/handles'
import React from 'react'
import { useForm } from 'react-hook-form'
import { FormInput } from '@/components/forms/form-input'
import { FormSelect } from '@/components/forms/form-select'
import { FormTextarea } from '@/components/forms/form-textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { defaultFormValues, OrgFormValues, orgResolver } from '../utils/form-schema'

interface OrgFormProps {
  org?: Org
  onSubmit: (values: OrgFormValues) => void | Promise<void>
  onCancel?: () => void
  loading?: boolean
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

const planOptions = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export function OrgForm({ org, onSubmit, onCancel, loading }: OrgFormProps) {
  const isEditing = Boolean(org)

  const form = useForm<OrgFormValues>({
    resolver: orgResolver,
    defaultValues: org
      ? {
          name: org.name,
          handle: org.handle,
          description: org.description || '',
          email: org.email || '',
          phone: org.phone || '',
          website: org.website || '',
          status: org.status,
          plan: org.plan,
        }
      : defaultFormValues,
  })

  const handleSubmit = async (values: OrgFormValues) => {
    await onSubmit(values)
  }

  const generateHandle = generateOrgHandle

  const nameValue = form.watch('name')

  React.useEffect(() => {
    if (nameValue && !isEditing) {
      const handle = generateHandle(nameValue)
      form.setValue('handle', handle)
    }
  }, [nameValue, isEditing, form])

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Org' : 'Create Org'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update the org details below.' : 'Fill in the details to create a new org.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput control={form.control} name="name" label="Org Name" placeholder="Enter org name" required />
              <FormInput
                control={form.control}
                name="handle"
                label="Handle"
                placeholder="org-handle"
                description="URL-friendly identifier (lowercase, no spaces)"
                required
              />
            </div>

            <FormTextarea
              control={form.control}
              name="description"
              label="Description"
              placeholder="Brief description of the org"
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="email"
                label="Contact Email"
                type="email"
                placeholder="contact@org.com"
              />
              <FormInput
                control={form.control}
                name="phone"
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <FormInput control={form.control} name="website" label="Website" type="url" placeholder="https://org.com" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                control={form.control}
                name="status"
                label="Status"
                placeholder="Select status"
                options={statusOptions}
                required
              />
              <FormSelect
                control={form.control}
                name="plan"
                label="Plan"
                placeholder="Select plan"
                options={planOptions}
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
