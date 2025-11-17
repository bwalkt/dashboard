import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useSecondarySidebar } from '@/components/ui/sidebar'

/**
 * Example component demonstrating how to use a secondary sidebar that auto-collapses the primary sidebar.
 *
 * When the Sheet (secondary sidebar) opens, it will automatically collapse the main sidebar.
 *
 * The feature is already implemented in:
 * 1. DataTableSheetDetails - when clicking on table rows to view details
 * 2. ControlsProvider - when the filters panel is open
 *
 * To use with custom components, simply call:
 * useSecondarySidebar(isSecondaryOpen)
 */
export function SecondarySidebarExample() {
  const [isOpen, setIsOpen] = React.useState(false)

  // This hook manages the interaction with the primary sidebar
  useSecondarySidebar(isOpen)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Secondary Sidebar</Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Secondary Sidebar</SheetTitle>
            <SheetDescription>
              This is a secondary sidebar. When it opens, the primary sidebar automatically collapses.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <h3 className="text-lg font-medium">Content Area</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You can add any content here. The primary sidebar will remain collapsed while this is open.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
