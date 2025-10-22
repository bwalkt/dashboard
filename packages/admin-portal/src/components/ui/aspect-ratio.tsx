'use client'

import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio'

/**
 * Wraps the Radix AspectRatio primitive and forwards all received props while adding a `data-slot="aspect-ratio"` attribute.
 *
 * @param props - Props forwarded to `AspectRatioPrimitive.Root`
 * @returns The rendered AspectRatio root element with the provided props applied
 */
function AspectRatio({ ...props }: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export { AspectRatio }
