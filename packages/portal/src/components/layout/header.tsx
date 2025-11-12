import React from 'react'
import { UserNav } from './user-nav'

/**
 * Minimal header that only contains user navigation actions.
 *
 * @returns A JSX header element containing user navigation
 */
export default function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <UserNav />
      </div>
    </header>
  )
}
