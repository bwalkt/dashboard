'use client'

import { IconBrightness } from '@tabler/icons-react'
import { useTheme } from 'next-themes'
import * as React from 'react'

import { Button } from '@/components/ui/button'

/**
 * Renders a button that toggles the application's color theme between dark and light.
 *
 * When activated, switches the theme; if the browser supports view transitions, the change
 * is applied inside a view transition. If triggered by a click event, the click coordinates
 * are written to the root CSS variables `--x` and `--y` before the transition.
 *
 * @returns A React element: an icon button that toggles the color theme when activated.
 */
export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  const handleThemeToggle = React.useCallback(
    (e?: React.MouseEvent) => {
      const newMode = resolvedTheme === 'dark' ? 'light' : 'dark'
      const root = document.documentElement

      if (!document.startViewTransition) {
        setTheme(newMode)
        return
      }

      // Set coordinates from the click event
      if (e) {
        root.style.setProperty('--x', `${e.clientX}px`)
        root.style.setProperty('--y', `${e.clientY}px`)
      }

      document.startViewTransition(() => {
        setTheme(newMode)
      })
    },
    [resolvedTheme, setTheme],
  )

  return (
    <Button variant="secondary" size="icon" className="group/toggle size-8" onClick={handleThemeToggle}>
      <IconBrightness />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
