'use client'

import { EditIcon, PlusIcon, X } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { ProxyTarget } from '@/types/proxy-targets'

interface EndpointDrawerProps {
  endpoint?: ProxyTarget // If provided, it's edit mode. If not, it's add mode
  onUpdate?: (endpoint: ProxyTarget) => void
  onAdd?: (endpoint: ProxyTarget) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EndpointDrawer({
  endpoint,
  onUpdate,
  onAdd,
  trigger,
  open: externalOpen,
  onOpenChange,
}: EndpointDrawerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditMode = Boolean(endpoint)

  // Form state
  const [formData, setFormData] = React.useState({
    name: endpoint?.name || '',
    url: endpoint?.url || '',
    port: endpoint?.port || 3000,
  })

  // Reset form when endpoint changes or drawer opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: endpoint?.name || '',
        url: endpoint?.url || '',
        port: endpoint?.port || 3000,
      })
    }
  }, [open, endpoint])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.url.trim()) {
        toast.error('Name and URL are required')
        return
      }

      const endpointData = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        port: formData.port,
      }

      if (isEditMode && endpoint && onUpdate) {
        // Update existing endpoint
        const updatedEndpoint = { ...endpoint, ...endpointData }
        onUpdate(updatedEndpoint)
        toast.success('Endpoint updated successfully')
      } else if (onAdd) {
        // Create new endpoint - API will handle ID and timestamps
        onAdd(endpointData as ProxyTarget)
        toast.success('Endpoint created successfully')
      }

      setOpen(false)
    } catch (error) {
      console.error('Failed to save endpoint:', error)
      toast.error(isEditMode ? 'Failed to update endpoint' : 'Failed to create endpoint')
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
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <EditIcon className="h-5 w-5" />
                Edit Endpoint
              </>
            ) : (
              <>
                <PlusIcon className="h-5 w-5" />
                Add New Endpoint
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the endpoint details below.' : 'Enter the details for the new endpoint below.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="e.g., Salesforce Server"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={e => handleInputChange('url', e.target.value)}
              placeholder="e.g., pzero-sfdc-server"
              required
            />
            <p className="text-xs text-muted-foreground">Hostname or URL of the endpoint (must be unique)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={formData.port}
              onChange={e => handleInputChange('port', parseInt(e.target.value) || 3000)}
              placeholder="3000"
              min="1"
              max="65535"
            />
          </div>

          <div className="flex gap-3 pt-6">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : isEditMode ? 'Update Endpoint' : 'Create Endpoint'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
