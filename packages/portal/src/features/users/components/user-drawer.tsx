'use client'

import React from 'react'
import { toast } from 'sonner'
import { AlertModal } from '@/components/modal/alert-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
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
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean
    type: 'delete' | 'deactivate' | 'activate' | null
    onConfirm: () => void
  }>({
    isOpen: false,
    type: null,
    onConfirm: () => {},
  })

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditMode = Boolean(user)

  // Form state
  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
    handle: user?.handle || '',
    is_act: user?.is_act ?? true,
    is_del: user?.is_del ?? false,
  })

  // Reset form when user changes or drawer opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        handle: user?.handle || '',
        is_act: user?.is_act ?? true,
        is_del: user?.is_del ?? false,
      })
    }
  }, [open, user])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStatusChange = (field: 'is_act' | 'is_del', value: boolean) => {
    // Show confirmation for dangerous operations
    if (field === 'is_del' && value) {
      setConfirmDialog({
        isOpen: true,
        type: 'delete',
        onConfirm: () => {
          handleInputChange('is_del', true)
          setConfirmDialog({ isOpen: false, type: null, onConfirm: () => {} })
        },
      })
    } else if (field === 'is_act' && !value) {
      setConfirmDialog({
        isOpen: true,
        type: 'deactivate',
        onConfirm: () => {
          handleInputChange('is_act', false)
          setConfirmDialog({ isOpen: false, type: null, onConfirm: () => {} })
        },
      })
    } else if (field === 'is_act' && value && formData.is_del) {
      // If activating a deleted user, need to undelete first
      setConfirmDialog({
        isOpen: true,
        type: 'activate',
        onConfirm: () => {
          handleInputChange('is_act', true)
          handleInputChange('is_del', false)
          setConfirmDialog({ isOpen: false, type: null, onConfirm: () => {} })
        },
      })
    } else {
      handleInputChange(field, value)
    }
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
        is_act: formData.is_act,
        is_del: formData.is_del,
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

  const getConfirmationMessage = () => {
    switch (confirmDialog.type) {
      case 'delete':
        return {
          title: 'Mark User as Deleted',
          description:
            'Are you sure you want to mark this user as deleted? This will soft delete the user and they will no longer be able to access the system. You can restore the user later by unchecking this option.',
        }
      case 'deactivate':
        return {
          title: 'Deactivate User',
          description:
            'Are you sure you want to deactivate this user? They will not be able to log in until reactivated. You can reactivate the user at any time.',
        }
      case 'activate':
        return {
          title: 'Activate and Restore User',
          description:
            'This user is marked as deleted. Activating will restore the user and allow them to access the system again. Continue?',
        }
      default:
        return { title: '', description: '' }
    }
  }

  return (
    <>
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

                {/* Status Controls - Only show in edit mode */}
                {isEditMode && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-medium">User Status</h3>

                    {/* Active Status */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_act">Active Status</Label>
                        <div className="text-sm text-muted-foreground">
                          {formData.is_act
                            ? 'User is active and can access the system'
                            : 'User is inactive and cannot log in'}
                        </div>
                      </div>
                      <Switch
                        id="is_act"
                        checked={formData.is_act}
                        onCheckedChange={checked => handleStatusChange('is_act', checked)}
                        disabled={formData.is_del && formData.is_act} // Can't deactivate if deleted
                      />
                    </div>

                    {/* Deleted Status */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_del" className="text-destructive">
                          Deleted Status
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          {formData.is_del ? 'User is marked as deleted (soft delete)' : 'User is not deleted'}
                        </div>
                      </div>
                      <Switch
                        id="is_del"
                        checked={formData.is_del}
                        onCheckedChange={checked => handleStatusChange('is_del', checked)}
                        className="data-[state=checked]:bg-destructive"
                      />
                    </div>
                  </div>
                )}
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

      {/* Confirmation Dialog */}
      <AlertModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: null, onConfirm: () => {} })}
        onConfirm={confirmDialog.onConfirm}
        loading={false}
        title={getConfirmationMessage().title}
        description={getConfirmationMessage().description}
      />
    </>
  )
}
