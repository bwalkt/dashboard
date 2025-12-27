'use client'

import React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { User } from '@/types/users'

interface UserDrawerProps {
  user?: User // If provided, it's edit mode. If not, it's add mode
  onUpdate?: (user: User) => void
  onAdd?: (user: User) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UserDrawer({ user, onUpdate, onAdd, trigger, open: externalOpen, onOpenChange }: UserDrawerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditMode = Boolean(user)

  // Form state
  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
    handle: user?.handle || '',
  })

  // Reset form when user changes or drawer opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        handle: user?.handle || '',
      })
    }
  }, [open, user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.email.trim()) {
        toast.error('Name and email are required')
        return
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address')
        return
      }

      setLoading(true)

      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        handle: formData.handle.trim() || undefined,
      }

      if (isEditMode && user && onUpdate) {
        // Update existing user
        const updatedUser = { ...user, ...userData }
        onUpdate(updatedUser)
      } else if (onAdd) {
        // Create new user - API will handle ID and timestamps
        onAdd(userData as User)
      }

      setOpen(false)
    } catch (error) {
      console.error('Failed to save user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="right" className="!w-full !max-w-4xl flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{isEditMode ? 'Edit User' : 'Add New User'}</SheetTitle>
              <SheetDescription>
                {isEditMode ? 'Update the user details below.' : 'Fill in the details to create a new user.'}
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
                {/* Name */}
                <div className="!w-1/2 space-y-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                {/* Email */}
                <div className="!w-1/2 space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              {/* Handle field */}
              <div className="space-y-2">
                <Label htmlFor="handle">Handle</Label>
                <Input
                  id="handle"
                  value={formData.handle}
                  onChange={e => handleInputChange('handle', e.target.value)}
                  placeholder="@username (optional)"
                />
              </div>
            </div>
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
