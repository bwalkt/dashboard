'use client'

import { EditIcon, PlusIcon, X } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    dscr: endpoint?.dscr || '',
    status: endpoint?.status || 'ACTIVE',
  })

  // Reset form when endpoint changes or drawer opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: endpoint?.name || '',
        url: endpoint?.url || '',
        port: endpoint?.port || 3000,
        dscr: endpoint?.dscr || '',
        status: endpoint?.status || 'ACTIVE',
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
        dscr: formData.dscr.trim(),
        status: formData.status as 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED',
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
      <SheetContent side="right" className="!w-full !max-w-4xl flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{isEditMode ? 'Edit Endpoint' : 'Add New Endpoint'}</SheetTitle>
              <SheetDescription>
                {isEditMode
                  ? 'Update the endpoint details below.'
                  : 'Fill in the details to create a new endpoint.'}
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
                {/* Endpoint Name */}
                <div className="!w-1/2 space-y-2">
                  <Label htmlFor="name">
                    Endpoint Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder="Enter endpoint name"
                    required
                  />
                </div>

                {/* URL */}
                <div className="!w-1/2 space-y-2">
                  <Label htmlFor="url">
                    URL <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={e => handleInputChange('url', e.target.value)}
                    placeholder="e.g., pzero-sfdc-server"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Hostname or URL of the endpoint (must be unique)
                  </p>
                </div>
              </div>

              {/* Port - Single field */}
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

              {/* Description - Full width */}
              <div className="space-y-2">
                <Label htmlFor="dscr">Description</Label>
                <Textarea
                  id="dscr"
                  value={formData.dscr}
                  onChange={e => handleInputChange('dscr', e.target.value)}
                  placeholder="Brief description of the endpoint"
                  rows={3}
                />
              </div>

              {/* Endpoint Settings */}
              <div>
                <h3 className="text-sm font-medium mb-4">Endpoint Settings</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="status">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.status} onValueChange={value => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                {loading
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                    ? 'Update Endpoint'
                    : 'Create Endpoint'}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
