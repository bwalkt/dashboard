'use client'

import type { Org } from '@pzero/shared/pzero'
import { EditIcon, PlusIcon } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

interface OrgDrawerProps {
  org?: Org // If provided, it's edit mode. If not, it's add mode
  onUpdate?: (org: Org) => void
  onAdd?: (org: Org) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function OrgDrawer({ org, onUpdate, onAdd, trigger, open: externalOpen, onOpenChange }: OrgDrawerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditMode = Boolean(org)

  // Form state
  const [formData, setFormData] = React.useState({
    name: org?.name || '',
    handle: org?.handle || '',
    dscr: org?.dscr || '',
    email: org?.email || '',
    phone: org?.phone || '',
    website: org?.website || '',
    status: org?.status || 'ACTIVE',
    plan: org?.plan || 'STARTER',
  })

  // Reset form when org changes or drawer opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: org?.name || '',
        handle: org?.handle || '',
        dscr: org?.dscr || '',
        email: org?.email || '',
        phone: org?.phone || '',
        website: org?.website || '',
        status: org?.status || 'ACTIVE',
        plan: org?.plan || 'STARTER',
      })
    }
  }, [org, open])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditMode && org) {
        // Edit existing organization
        const response = await fetch(`/api/orgs/${org.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          throw new Error('Failed to update organization')
        }

        const updatedOrg = await response.json()
        toast.success('Organization updated successfully')
        onUpdate?.(updatedOrg)
      } else {
        // Create new organization
        const response = await fetch('/api/orgs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          throw new Error('Failed to create organization')
        }

        const newOrg = await response.json()
        toast.success('Organization created successfully')
        onAdd?.(newOrg)
      }

      setOpen(false)
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} org:`, error)
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} organization`)
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate handle from name when creating
  React.useEffect(() => {
    if (!isEditMode && formData.name) {
      const autoHandle = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim()
      if (autoHandle !== formData.handle) {
        setFormData(prev => ({ ...prev, handle: autoHandle }))
      }
    }
  }, [formData.name, isEditMode, formData.handle])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant={isEditMode ? 'ghost' : 'default'} size={isEditMode ? 'icon' : 'default'}>
            {isEditMode ? (
              <EditIcon className="h-4 w-4" />
            ) : (
              <>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Organization
              </>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="!w-full !max-w-4xl flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{isEditMode ? 'Edit Organization' : 'Add New Organization'}</SheetTitle>
              <SheetDescription>
                {isEditMode
                  ? 'Update the organization details below.'
                  : 'Fill in the details to create a new organization.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Basic Information - Two columns */}
              <div className="!flex !w-full gap-6">
                {/* Organization Name */}
                <div className="!w-1/2 space-y-2">
                  <Label htmlFor="name">
                    Organization Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="Enter organization name"
                    required
                  />
                </div>

                {/* Handle */}
                <div className="!w-1/2 space-y-2">
                  <Label htmlFor="handle">
                    Handle <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="handle"
                    value={formData.handle}
                    onChange={e => handleChange('handle', e.target.value)}
                    placeholder="org-handle"
                    readOnly={isEditMode}
                    className={isEditMode ? 'bg-muted' : ''}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEditMode ? 'Handle cannot be changed after creation' : 'Auto-generated from name'}
                  </p>
                </div>
              </div>

              {/* Description - Full width */}
              <div className="space-y-2">
                <Label htmlFor="dscr">Description</Label>
                <Textarea
                  id="dscr"
                  value={formData.dscr}
                  onChange={e => handleChange('dscr', e.target.value)}
                  placeholder="Brief description of the organization"
                  rows={3}
                />
              </div>

              {/* Contact Information Section */}
              <div>
                <h3 className="text-sm font-medium mb-4">Contact Information</h3>

                <div className="!flex gap-4">
                  <div className="!w-1/2 space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="contact@organization.com"
                    />
                  </div>

                  <div className="!w-1/2 space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={e => handleChange('website', e.target.value)}
                    placeholder="https://organization.com"
                  />
                </div>
              </div>

              {/* Organization Settings */}
              <div>
                <h3 className="text-sm font-medium mb-4">Organization Settings</h3>

                <div className="!flex gap-4">
                  <div className="!w-1/2 space-y-2">
                    <Label htmlFor="status">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                        <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="!w-1/2 space-y-2">
                    <Label htmlFor="plan">
                      Plan <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.plan} onValueChange={value => handleChange('plan', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">Free</SelectItem>
                        <SelectItem value="STARTER">Starter</SelectItem>
                        <SelectItem value="PRO">Pro</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                    ? 'Update Organization'
                    : 'Create Organization'}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
