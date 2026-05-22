'use client'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

/**
 * Standalone dark mode toggle for public pages (landing, login, register).
 * Reads/writes to localStorage so the preference persists across visits.
 * The anti-flash script in layout.tsx applies the class before first paint.
 */
export default function DarkToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme')
    const isDark =
      saved === 'dark' ||
      (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDark(isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    const root = document.documentElement
    if (next) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) return <div className={`w-9 h-9 ${className}`} />

  return (
    <button
      onClick={toggle}
      title={dark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
      className={`p-2 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-800 text-brand-600 dark:text-brand-300 transition ${className}`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
