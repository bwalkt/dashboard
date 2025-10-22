import type React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Renders children inside a page-level layout container that can optionally be scrollable.
 *
 * @param children - Content to render inside the container.
 * @param scrollable - When `true`, wraps the content in a ScrollArea with a fixed viewport height; when `false`, renders the content in a plain div. Defaults to `true`.
 * @returns A JSX element containing the provided `children`, wrapped in a scrollable area when `scrollable` is `true`.
 */
export default function PageContainer({
  children,
  scrollable = true,
}: {
  children: React.ReactNode
  scrollable?: boolean
}) {
  return (
    <>
      {scrollable ? (
        <ScrollArea className="h-[calc(100dvh-52px)]">
          <div className="flex flex-1 p-4 md:px-6">{children}</div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 p-4 md:px-6">{children}</div>
      )}
    </>
  )
}
