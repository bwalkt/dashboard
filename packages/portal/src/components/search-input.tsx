'use client'
import { IconSearch } from '@tabler/icons-react'
import { useKBar } from 'kbar'
import { Button } from './ui/button'

/**
 * Renders a full-width search button that opens or closes the kbar command bar.
 *
 * The button shows a leading search icon, the label "Search...", and a ⌘K keyboard hint.
 *
 * @returns A JSX element containing an outlined search Button configured to toggle the kbar command bar when clicked.
 */
export default function SearchInput() {
  const { query } = useKBar()
  return (
    <div className="w-full space-y-2">
      <Button
        variant="outline"
        className="bg-background text-muted-foreground relative h-9 w-full justify-start rounded-[0.5rem] text-sm font-normal shadow-none md:w-40 lg:w-64"
        onClick={query.toggle}
      >
        <IconSearch className="mr-2 h-4 w-4" />
        Search...
      </Button>
    </div>
  )
}
