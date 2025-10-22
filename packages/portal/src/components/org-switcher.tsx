'use client'

import { Check, ChevronsUpDown, GalleryVerticalEnd } from 'lucide-react'
import * as React from 'react'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

interface Tenant {
  id: string
  name: string
}

/**
 * Renders a sidebar organization switcher that shows the current tenant and a dropdown to choose another tenant.
 *
 * Displays a menu button with the selected tenant's name and a list of all tenants; selecting one updates internal state and invokes `onTenantSwitch` with the chosen tenant's id.
 *
 * @param tenants - Array of available tenants to list in the dropdown.
 * @param defaultTenant - Tenant to select initially when the component mounts; if not provided, the first tenant in `tenants` is used.
 * @param onTenantSwitch - Optional callback invoked with the selected tenant's `id` when the user picks a different tenant.
 * @returns The sidebar menu JSX element displaying the current tenant and dropdown options, or `null` when no tenant is available.
 */
export function OrgSwitcher({
  tenants,
  defaultTenant,
  onTenantSwitch,
}: {
  tenants: Tenant[]
  defaultTenant: Tenant
  onTenantSwitch?: (tenantId: string) => void
}) {
  const [selectedTenant, setSelectedTenant] = React.useState<Tenant | undefined>(
    defaultTenant || (tenants.length > 0 ? tenants[0] : undefined),
  )

  const handleTenantSwitch = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    if (onTenantSwitch) {
      onTenantSwitch(tenant.id)
    }
  }

  if (!selectedTenant) {
    return null
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Next Starter</span>
                <span className="">{selectedTenant.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
            {tenants.map(tenant => (
              <DropdownMenuItem key={tenant.id} onSelect={() => handleTenantSwitch(tenant)}>
                {tenant.name} {tenant.id === selectedTenant.id && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
