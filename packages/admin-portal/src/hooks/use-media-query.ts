import { useEffect, useState } from 'react'

/**
 * Exposes reactive state indicating whether the viewport width is less than or equal to 768 pixels.
 *
 * @returns An object with `isOpen` that is `true` if the viewport width is less than or equal to 768 pixels, `false` otherwise.
 */
export function useMediaQuery() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    setIsOpen(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setIsOpen(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return { isOpen }
}
