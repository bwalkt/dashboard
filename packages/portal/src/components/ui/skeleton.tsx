import { cn } from '@/lib/utils'

/**
 * Renders a pulsing skeleton placeholder div for use as a loading UI.
 *
 * Combines default skeleton styling with any provided classes and forwards all other div props to the element.
 *
 * @param className - Additional CSS class names to apply to the skeleton container
 * @param props - Other standard div props to pass through to the rendered element
 * @returns A div element styled as a pulsing skeleton with any provided props applied
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('bg-accent animate-pulse rounded-md', className)} {...props} />
}

export { Skeleton }
