'use client'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'

/**
 * Wrapper around Radix UI's Collapsible root that forwards all received props.
 *
 * @param props - Props forwarded to `CollapsiblePrimitive.Root`
 * @returns The underlying `CollapsiblePrimitive.Root` element with `data-slot="collapsible"`
 */
function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

/**
 * Wraps Radix's CollapsibleTrigger and sets a `data-slot` attribute for integration.
 *
 * @param props - Props forwarded to the underlying Radix `CollapsibleTrigger` component
 * @returns A React element for a collapsible trigger with `data-slot="collapsible-trigger"` and the provided props applied
 */
function CollapsibleTrigger({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />
}

/**
 * Renders a CollapsibleContent wrapper that forwards all received props to the underlying CollapsibleContent primitive and sets the `data-slot` attribute to `"collapsible-content"`.
 *
 * @param props - Props to apply to the underlying CollapsibleContent primitive
 * @returns The rendered CollapsibleContent element with the provided props and `data-slot="collapsible-content"`
 */
function CollapsibleContent({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
