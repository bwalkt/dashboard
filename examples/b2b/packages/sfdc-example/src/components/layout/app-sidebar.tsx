// User management imports
import {
  IconBell,
  IconChevronRight,
  IconChevronsDown,
  IconCreditCard,
  IconLogout,
  IconPhotoUp,
  IconUserCircle,
} from '@tabler/icons-react'
import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
} from '@/components/ui/sidebar'
import { UserAvatarProfile } from '@/components/user-avatar-profile'
import { navItems } from '@/constants/data'
import { useUser } from '@/hooks/use-auth'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Icons } from '../icons'
import { OrgSwitcher } from '../org-switcher'
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

export default function AppSidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { isOpen } = useMediaQuery()
  const { data: authUser, signOut } = useUser()
  const navigate = useNavigate()

  const handleSwitchTenant = (_tenantId: string) => {
    // Tenant switching functionality would be implemented here
  }

  const handleSignOut = async () => {
    try {
      console.log('[AppSidebar] Starting sign out...')
      await signOut()
      console.log('[AppSidebar] Sign out successful')
      toast.success('Signed out successfully')
      navigate('/auth/sign-in')
    } catch (error) {
      console.error('[AppSidebar] Sign out error:', error)
      toast.error('Failed to sign out: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleRefresh = () => {
    document.cookie.split(';').forEach(cookie => {
      document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/')
    })
    localStorage.clear()
    sessionStorage.clear()
    location.reload()
  }

  // Debug logging

  const activeTenant = tenants[0]

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen])

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
              const Icon = item.icon ? Icons[item.icon as keyof typeof Icons] : Icons.logo
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
                        {item.items?.map((subItem: any) => (
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
                  <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
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
                <DropdownMenuItem onClick={handleSignOut}>
                  <IconLogout className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefresh}>
                  <IconLogout className="mr-2 h-4 w-4" />
                  <span>Refresh</span>
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
