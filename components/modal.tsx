'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open, onClose, title, children, size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-brand-900 rounded-2xl shadow-2xl dark:shadow-brand-950 w-full ${sizes[size]} max-h-[90vh] flex flex-col border border-brand-100/60 dark:border-brand-700`}>
        <div className="px-5 py-4 border-b border-brand-100 dark:border-brand-700 flex items-center justify-between">
          <h3 className="font-bold text-brand-950 dark:text-brand-50">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-800 rounded-lg text-brand-700 dark:text-brand-300">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
