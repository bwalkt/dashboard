import React from 'react'
import { Breadcrumbs } from '../breadcrumbs'
import SearchInput from '../search-input'
import { ThemeSelector } from '../theme-selector'
import { Separator } from '../ui/separator'
import { SidebarTrigger } from '../ui/sidebar'
import { ModeToggle } from './ThemeToggle/theme-toggle'
import { UserNav } from './user-nav'

/**
 * Top navigation header that groups sidebar controls, breadcrumbs, search, user actions, and theme controls.
 *
 * The header renders a left cluster with the sidebar trigger, a vertical separator, and breadcrumbs, and a right cluster with a responsive search input (hidden on small screens), user navigation, theme mode toggle, and theme selector.
 *
 * @returns A JSX header element containing the app's top navigation and control clusters
 */
export default function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2 px-4">
        <div className="hidden md:flex">
          <SearchInput />
        </div>
        <UserNav />
        <ModeToggle />
        <ThemeSelector />
      </div>
    </header>
  )
}
