'use client'

import type { Org, UpdateOrgData } from '@pzero/shared/pzero'
import { EditIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { OrgFormValues } from '../utils/form-schema'
import { SimpleEditForm } from './simple-edit-form'

interface EditOrgDialogProps {
  org: Org
  onUpdate?: (updatedOrg: Org) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditOrgDialog({ org, onUpdate, trigger, open: externalOpen, onOpenChange }: EditOrgDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const handleSubmit = async (values: OrgFormValues) => {
    setLoading(true)
    try {
      const updateData: UpdateOrgData = {
        name: values.name,
        // handle is omitted - immutable after creation
        dscr: values.dscr,
        email: values.email,
        phone: values.phone,
        website: values.website,
        status: values.status,
        plan: values.plan,
      }

      const response = await fetch(`/api/orgs/${org.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error('Failed to update organization')
      }

      const updatedOrg = await response.json()

      toast.success('Organization updated successfully')
      setOpen(false)
      onUpdate?.(updatedOrg)
    } catch (error) {
      console.error('Failed to update org:', error)
      toast.error('Failed to update organization')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <EditIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>Update the organization details below.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <SimpleEditForm org={org} onSubmit={handleSubmit} onCancel={() => setOpen(false)} loading={loading} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
