'use client'

import { ChevronDown } from 'lucide-react'
import * as React from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleSection({ title, children, defaultOpen = false, className }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('w-full', className)}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md bg-sky-50 dark:bg-sky-950/30 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
        >
          <span>{title}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down overflow-hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
