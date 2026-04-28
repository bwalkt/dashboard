// User management imports
import {
  IconBell,
  IconChevronRight,
  IconChevronsDown,
  IconCreditCard,
  IconLogout,
  IconMoon,
  IconPhotoUp,
  IconSun,
  IconUserCircle,
} from '@tabler/icons-react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import * as React from 'react'
import { toast } from 'sonner'
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
  useSidebar,
} from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatarProfile } from '@/components/user-avatar-profile'
import { navItems } from '@/constants/data'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useAuthStore } from '@/stores/auth'
import { useOrgsStore } from '@/stores/orgs'
import { DataTableContext } from '../data-table/data-table-provider'
import { SafeDataTableFilterControls } from '../data-table/safe-data-table-filter-controls'
import { Icons } from '../icons'
import { OrgSwitcher } from '../org-switcher'
import { CollapseMenuButton } from './collapse-menu-button'

// Helper function to generate CollapseMenuButton props
const getCollapseMenuProps = (item: any, pathname: string, Icons: any) => {
  const Icon = item.icon ? Icons[item.icon] : Icons.logo

  return {
    icon: Icon,
    label: item.title,
    active: pathname === item.url,
    submenus: item.items.map((subItem: any) => ({
      url: subItem.url,
      title: subItem.title,
      icon: subItem.icon,
      isActive: pathname === subItem.url,
      items: subItem.items?.map((nestedItem: any) => ({
        url: nestedItem.url,
        title: nestedItem.title,
        icon: nestedItem.icon,
        isActive: pathname === nestedItem.url,
      })),
    })),
    isOpen:
      pathname === item.url ||
      pathname.startsWith(item.url + '/') ||
      item.items?.some((subItem: any) => {
        const subUrl = subItem.url.split('?')[0]
        return (
          pathname === subUrl ||
          pathname.startsWith(subUrl + '/') ||
          subItem.items?.some((nestedItem: any) => {
            const nestedUrl = nestedItem.url.split('?')[0]
            return pathname === nestedUrl || pathname.startsWith(nestedUrl + '/')
          })
        )
      }),
    url: item.url,
  }
}
export const company = {
  name: 'Acme Inc',
  logo: IconPhotoUp,
  plan: 'Enterprise',
}

interface AppSidebarProps {
  filterFields?: any[]
}

/**
 * Renders the application's collapsible sidebar including organization switcher, navigation items, and user menu with profile and sign-out actions.
 *
 * The sidebar adapts its active state from the current location, supports nested navigation groups, displays tenant and user information, and handles sign-out with toast notifications and navigation to the sign-in route.
 *
 * @returns The sidebar component as a JSX element
 */
export default function AppSidebar({ filterFields: propFilterFields }: AppSidebarProps = {}) {
  const location = useLocation()
  const pathname = location.pathname
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { user: authUser, logout } = useAuthStore()
  const { setOpenMobile } = useSidebar()
  const navigate = useNavigate()
  const orgs = useOrgsStore(state => state.orgs)
  const currentOrg = useOrgsStore(state => state.currentOrg)
  const fetchOrgs = useOrgsStore(state => state.fetchOrgs)
  const setCurrentOrg = useOrgsStore(state => state.setCurrentOrg)
  const { setTheme, resolvedTheme } = useTheme()

  // Fetch orgs on mount if not loaded
  React.useEffect(() => {
    if (!orgs || orgs.length === 0) {
      fetchOrgs().catch(console.error)
    }
  }, [orgs, fetchOrgs])

  // Map orgs to tenant format
  const tenants = React.useMemo(() => {
    return (
      orgs?.map(org => ({
        id: org.id,
        name: org.name,
      })) || []
    )
  }, [orgs])

  const defaultTenant = currentOrg ? { id: currentOrg.id, name: currentOrg.name } : tenants[0]

  // Tab state management for mobile - default to 'filter' and persist in localStorage
  const [activeTab, setActiveTab] = React.useState<'filter' | 'menu'>(() => {
    const stored = localStorage.getItem('mobile-sidebar-tab')
    return (stored as 'filter' | 'menu') || 'filter'
  })

  // State for dynamically loaded filter fields
  const [loadedFilterFields, setLoadedFilterFields] = React.useState<any[]>([])

  // Get filter fields from DataTableContext if available
  const dataTableContext = React.useContext(DataTableContext)
  const contextFilterFields = dataTableContext?.filterFields

  const handleTabChange = (value: string) => {
    const tab = value as 'filter' | 'menu'
    setActiveTab(tab)
    localStorage.setItem('mobile-sidebar-tab', tab)
  }

  const handleNavigation = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleSwitchTenant = (tenantId: string) => {
    // Find the org and set it as current
    const org = orgs?.find(o => o.id === tenantId)
    if (org) {
      setCurrentOrg(org)
    }
  }

  const handleSignOut = async () => {
    try {
      await logout()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Sign out error:', error)
    }
  }

  // Load filter fields for data table pages
  React.useEffect(() => {
    if (pathname.includes('/users') || pathname.includes('/dashboard/users')) {
      import('@/app/data-table/constants').then(module => {
        setLoadedFilterFields(module.filterFields || [])
      })
    } else if (pathname.includes('/logs') || pathname.includes('/dashboard/logs')) {
      import('@/app/infinite/constants').then(module => {
        setLoadedFilterFields(module.filterFields || [])
      })
    } else {
      setLoadedFilterFields([])
    }
  }, [pathname])

  // Get filter fields - priority: props > context > loaded state
  let filterFields: any[] = propFilterFields || contextFilterFields || loadedFilterFields || []

  const activeTenant = defaultTenant || tenants[0]

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isMobile])

  // Mobile version with tabs
  if (isMobile) {
    return (
      <Sidebar collapsible="icon">
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
              <SafeDataTableFilterControls filterFields={filterFields} />
            </TabsContent>

            {/* Menu Tab Content */}
            <TabsContent value="menu" className="mt-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-4">Overview</h3>
                  <div className="space-y-2">
                    {navItems.map(item => {
                      const Icon = item.icon ? Icons[item.icon] : Icons.logo
                      return item?.items && item?.items?.length > 0 ? (
                        <div key={item.title} className="mb-2">
                          <CollapseMenuButton {...getCollapseMenuProps(item, pathname, Icons)} />
                        </div>
                      ) : (
                        <Link
                          key={item.title}
                          to={item.url}
                          className="flex items-center gap-2 p-2 hover:bg-accent rounded-md"
                          onClick={handleNavigation}
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
                        <UserAvatarProfile user={authUser} />
                      </div>
                      <div className="flex-1 text-left text-sm">
                        <div className="font-semibold">{authUser?.name}</div>
                        <div className="text-xs text-muted-foreground">{authUser?.email}</div>
                      </div>
                      <IconChevronsDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" side="top" align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => {
                            navigate({ to: '/dashboard/settings' })
                            handleNavigation()
                          }}
                        >
                          <IconUserCircle className="mr-2 h-4 w-4" />
                          Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleNavigation}>
                          <IconCreditCard className="mr-2 h-4 w-4" />
                          Billing
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleNavigation}>
                          <IconBell className="mr-2 h-4 w-4" />
                          Notifications
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          handleSignOut()
                          handleNavigation()
                        }}
                      >
                        <IconLogout className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher tenants={tenants} defaultTenant={activeTenant} onTenantSwitch={handleSwitchTenant} />
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map(item => {
              const Icon = item.icon ? Icons[item.icon] : Icons.logo
              return item?.items && item?.items?.length > 0 ? (
                <CollapseMenuButton key={item.title} {...getCollapseMenuProps(item, pathname, Icons)} />
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                    <Link to={item.url} onClick={handleNavigation}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={
                  !resolvedTheme
                    ? 'Toggle theme'
                    : resolvedTheme === 'dark'
                      ? 'Switch to light mode'
                      : 'Switch to dark mode'
                }
                onClick={() => {
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                }}
              >
                {resolvedTheme === 'dark' ? <IconSun /> : <IconMoon />}
                <span>{!resolvedTheme ? 'Theme' : resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
                  {authUser && (
                    <div className="flex items-center gap-2">
                      <UserAvatarProfile user={authUser} />
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{authUser.name}</span>
                        <span className="truncate text-xs">{authUser.email}</span>
                      </div>
                    </div>
                  )}
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
                    {authUser && (
                      <div className="flex items-center gap-2">
                        <UserAvatarProfile user={authUser} />
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">{authUser.name}</span>
                          <span className="truncate text-xs">{authUser.email}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/profile' })}>
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
                  <IconUserCircle className="mr-2 h-4 w-4" />
                  <span>Home</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <IconLogout className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
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
