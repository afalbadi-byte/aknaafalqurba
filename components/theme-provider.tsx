'use client'
import { useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

/**
 * Applies the `dark` class to <html> based on the user's saved preference.
 * Handles 'system' by watching the OS colour-scheme media query.
 * This is a pure effect component — renders nothing extra.
 */
export default function ThemeProvider({
  theme,
  children,
}: {
  theme: Theme
  children: React.ReactNode
}) {
  useEffect(() => {
    const root = document.documentElement

    function apply(t: Theme) {
      if (t === 'dark') {
        root.classList.add('dark')
      } else if (t === 'light') {
        root.classList.remove('dark')
      } else {
        // system — match OS preference
        root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
    }

    apply(theme)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return <>{children}</>
}
