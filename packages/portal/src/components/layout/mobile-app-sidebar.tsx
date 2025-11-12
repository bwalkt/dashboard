import {
  IconBell,
  IconChevronRight,
  IconChevronsDown,
  IconCreditCard,
  IconLogout,
  IconPhotoUp,
  IconUserCircle,
} from '@tabler/icons-react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mobileNavItems } from '@/constants/mobile-nav'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/use-media-query'
import { DataTableFilterControls } from '../data-table/data-table-filter-controls'
import { useDataTable } from '../data-table/data-table-provider'
import { Icons } from '../icons'
import { OrgSwitcher } from '../org-switcher'
import { UserAvatarProfile } from '../user-avatar-profile'

export const company = {
  name: 'Acme Inc',
  logo: IconPhotoUp,
  plan: 'Enterprise',
}

const tenants = [
  { id: '1', name: 'Acme Inc' },
  { id: '2', name: 'Beta Corp' },
  { id: '3', name: 'Gamma Ltd' },
]

/**
 * Render the mobile collapsible sidebar for the admin portal.
 *
 * The sidebar includes an org switcher, an overview navigation menu that supports nested collapsible sections,
 * and a footer user panel with a dropdown for profile, billing, notifications, and home actions. Navigation
 * active states are determined from the current location pathname and user information is sourced from the auth context.
 *
 * Note: tenant switching handler is a placeholder and does not perform any action.
 *
 * @returns The sidebar JSX element with header, content (navigation), footer (user dropdown), and rail.
 */
export default function MobileAppSidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { isOpen } = useMediaQuery()
  const navigate = useNavigate()
  
  // Tab state management - default to 'filter' and persist in localStorage
  const [activeTab, setActiveTab] = React.useState<'filter' | 'menu'>(() => {
    const stored = localStorage.getItem('mobile-sidebar-tab')
    return (stored as 'filter' | 'menu') || 'filter'
  })

  const handleTabChange = (value: string) => {
    const tab = value as 'filter' | 'menu'
    setActiveTab(tab)
    localStorage.setItem('mobile-sidebar-tab', tab)
  }

  const handleSwitchTenant = (_tenantId: string) => {
    // Tenant switching functionality would be implemented here
  }

  const activeTenant = tenants[0]

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen])

  const { user } = useAuth()
  
  // Safely get filter fields from context
  let filterFields: any[] = []
  try {
    const dataTable = useDataTable()
    filterFields = dataTable?.filterFields || []
  } catch {
    // Not in DataTable context
  }

  const isMobile = useMediaQuery("(max-width: 768px)")

  if (isMobile) {
    // On mobile, return the tabs directly (not wrapped in Sidebar since that creates its own Sheet)
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <OrgSwitcher tenants={tenants} defaultTenant={activeTenant} onTenantSwitch={handleSwitchTenant} />
        </div>
        
        {/* Tabs for Filter and Menu */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
            <TabsTrigger value="filter" className="rounded-none">
              Filters
            </TabsTrigger>
            <TabsTrigger value="menu" className="rounded-none">
              Menu
            </TabsTrigger>
          </TabsList>

          {/* Filter Tab Content */}
          <TabsContent value="filter" className="mt-0 flex-1 overflow-y-auto p-4">
            {filterFields.length > 0 ? (
              <DataTableFilterControls filterFields={filterFields} />
            ) : (
              <div className="text-muted-foreground text-sm">No filters available</div>
            )}
          </TabsContent>

          {/* Menu Tab Content */}
          <TabsContent value="menu" className="mt-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-4">Overview</h3>
                <div className="space-y-2">
                  {mobileNavItems.map(item => {
                    const Icon = item.icon ? Icons[item.icon] : Icons.logo
                    return item?.items && item?.items?.length > 0 ? (
                      <Collapsible key={item.title} defaultOpen={item.isActive} className="group/collapsible">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-accent rounded-md">
                          <div className="flex items-center gap-2">
                            {item.icon && <Icon className="h-4 w-4" />}
                            <span>{item.title}</span>
                          </div>
                          <IconChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 space-y-1 pt-2">
                            {item.items?.map(subItem => (
                              <Link 
                                key={subItem.title}
                                to={subItem.url}
                                className="block p-2 text-sm hover:bg-accent rounded-md"
                              >
                                {subItem.title}
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Link 
                        key={item.title}
                        to={item.url}
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded-md"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* User section */}
              <div className="border-t pt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 p-2 w-full hover:bg-accent rounded-md">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UserAvatarProfile user={user} />
                    </div>
                    <div className="flex-1 text-left text-sm">
                      <div className="font-semibold">{user?.name}</div>
                      <div className="text-xs text-muted-foreground">{user?.email}</div>
                    </div>
                    <IconChevronsDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" side="top" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/settings' })}>
                        <IconUserCircle className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <IconCreditCard className="mr-2 h-4 w-4" />
                        Billing
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <IconBell className="mr-2 h-4 w-4" />
                        Notifications
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/overview' })}>
                      <IconLogout className="mr-2 h-4 w-4" />
                      Home
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Desktop version - original sidebar
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher tenants={tenants} defaultTenant={activeTenant} onTenantSwitch={handleSwitchTenant} />
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            {mobileNavItems.map(item => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo
              return item?.items && item?.items?.length > 0 ? (
                <Collapsible key={item.title} asChild defaultOpen={item.isActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url}>
                        {item.icon && <Icon />}
                        <span>{item.title}</span>
                        <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map(subItem => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                    <Link to={item.url}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UserAvatarProfile user={user} />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                  <IconChevronsDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="px-1 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <UserAvatarProfile user={user} />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.name}</span>
                        <span className="truncate text-xs">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/settings' })}>
                    <IconUserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconCreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconBell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/overview' })}>
                  <IconLogout className="mr-2 h-4 w-4" />
                  Home
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
