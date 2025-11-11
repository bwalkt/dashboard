import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useSecondarySidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

/**
 * Example component demonstrating how to use a secondary sidebar that auto-collapses the primary sidebar.
 * 
 * When the Sheet (secondary sidebar) opens, it will automatically collapse the main sidebar.
 */
export function SecondarySidebarExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  
  // This hook manages the interaction with the primary sidebar
  useSecondarySidebar(isOpen)
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Secondary Sidebar
      </Button>
      
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