'use client'

import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { Link, useLocation } from '@tanstack/react-router'
import * as React from 'react'

import { Button } from '@/components/ui/button'
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Icons } from '../icons'

interface Submenu {
  url: string
  title: string
  icon?: string
  isActive?: boolean
  items?: Submenu[] // Support for nested submenus
}

interface CollapseMenuButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  submenus: Submenu[]
  isOpen: boolean
  url?: string
}

export function CollapseMenuButton({ icon: Icon, label, active, submenus, isOpen, url }: CollapseMenuButtonProps) {
  const location = useLocation()
  const pathname = location.pathname
  const { state, isMobile, setOpenMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const handleNavigation = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Check if any submenu is currently active (including nested)
  const isSubmenuActive = React.useMemo(() => {
    const checkActive = (items: Submenu[]): boolean => {
      return items.some(item => {
        if (pathname === item.url) return true
        if (item.items) return checkActive(item.items)
        return false
      })
    }
    return checkActive(submenus)
  }, [pathname, submenus])

  const isMenuItemActive = active || isSubmenuActive || pathname === url

  // In mobile or expanded mode, use Collapsible
  if (isMobile || !isCollapsed) {
    return (
      <Collapsible open={isMenuOpen} onOpenChange={setIsMenuOpen} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={label} isActive={isMenuItemActive} className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
              <IconChevronRight
                className={cn('h-4 w-4 transition-transform duration-200', isMenuOpen && 'rotate-90')}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {submenus.map(submenu => (
                <SidebarMenuSubItem key={submenu.url}>
                  {submenu.items && submenu.items.length > 0 ? (
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuSubButton className="w-full justify-between">
                          <span>{submenu.title}</span>
                          <IconChevronRight className="h-3 w-3" />
                        </SidebarMenuSubButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 border-l pl-2">
                          {submenu.items.map(nestedItem => (
                            <SidebarMenuSubButton
                              key={nestedItem.url}
                              asChild
                              isActive={pathname === nestedItem.url}
                              size="sm"
                            >
                              <Link to={nestedItem.url} onClick={handleNavigation}>
                                <span className="text-xs">{nestedItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuSubButton asChild isActive={pathname === submenu.url}>
                      <Link to={submenu.url} onClick={handleNavigation}>
                        <span>{submenu.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  )}
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  // In collapsed mode, use DropdownMenu with Tooltip
  return (
    <SidebarMenuItem>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton isActive={isMenuItemActive} className="w-full" size="lg">
                <Icon className="h-4 w-4" />
                <span className="sr-only">{label}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-4">
            <span>{label}</span>
            {submenus.length > 0 && <IconChevronRight className="h-3 w-3 text-muted-foreground" />}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="w-64 ml-1" sideOffset={4}>
          <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {submenus.map(submenu => (
              <React.Fragment key={submenu.url}>
                {submenu.items && submenu.items.length > 0 ? (
                  <>
                    <DropdownMenuLabel className="text-xs font-normal">{submenu.title}</DropdownMenuLabel>
                    <div className="ml-2">
                      {submenu.items.map(nestedItem => (
                        <DropdownMenuItem
                          key={nestedItem.url}
                          className={cn(
                            'cursor-pointer text-xs',
                            pathname === nestedItem.url && 'bg-accent text-accent-foreground',
                          )}
                          asChild
                        >
                          <Link to={nestedItem.url} className="w-full" onClick={handleNavigation}>
                            {nestedItem.title}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    {submenus.indexOf(submenu) < submenus.length - 1 && <DropdownMenuSeparator className="my-1" />}
                  </>
                ) : (
                  <DropdownMenuItem
                    className={cn('cursor-pointer', pathname === submenu.url && 'bg-accent text-accent-foreground')}
                    asChild
                  >
                    <Link to={submenu.url} className="w-full" onClick={handleNavigation}>
                      {submenu.title}
                    </Link>
                  </DropdownMenuItem>
                )}
              </React.Fragment>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
