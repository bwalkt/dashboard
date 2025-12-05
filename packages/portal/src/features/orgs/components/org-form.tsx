'use client'

import type { Organization } from '@pzero/shared/pzero'
import React from 'react'
import { useForm } from 'react-hook-form'
import { FormInput } from '@/components/forms/form-input'
import { FormSelect } from '@/components/forms/form-select'
import { FormTextarea } from '@/components/forms/form-textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { defaultFormValues, OrganizationFormValues, organizationResolver } from '../utils/form-schema'

interface OrgFormProps {
  org?: Organization
  onSubmit: (values: OrganizationFormValues) => void | Promise<void>
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

  const form = useForm<OrganizationFormValues>({
    resolver: organizationResolver,
    defaultValues: org
      ? {
          name: org.name,
          slug: org.slug,
          description: org.description || '',
          email: org.email || '',
          phone: org.phone || '',
          website: org.website || '',
          status: org.status,
          plan: org.plan,
        }
      : defaultFormValues,
  })

  const handleSubmit = async (values: OrganizationFormValues) => {
    await onSubmit(values)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const nameValue = form.watch('name')

  React.useEffect(() => {
    if (nameValue && !isEditing) {
      const slug = generateSlug(nameValue)
      form.setValue('slug', slug)
    }
  }, [nameValue, isEditing, form])

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Organization' : 'Create Organization'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update the organization details below.' : 'Fill in the details to create a new organization.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="name"
                label="Organization Name"
                placeholder="Enter organization name"
                required
              />
              <FormInput
                control={form.control}
                name="slug"
                label="Slug"
                placeholder="organization-slug"
                description="URL-friendly identifier (lowercase, no spaces)"
                required
              />
            </div>

            <FormTextarea
              control={form.control}
              name="description"
              label="Description"
              placeholder="Brief description of the organization"
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="email"
                label="Contact Email"
                type="email"
                placeholder="contact@organization.com"
              />
              <FormInput
                control={form.control}
                name="phone"
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <FormInput
              control={form.control}
              name="website"
              label="Website"
              type="url"
              placeholder="https://organization.com"
            />

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
