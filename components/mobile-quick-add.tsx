'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ClipboardList, Plus, UserPlus2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileQuickAdd() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname === '/add-new-leads' ||
    pathname === '/quick-add'
  ) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] md:hidden">
      {open && (
        <button
          type="button"
          aria-label="Close quick add"
          className="pointer-events-auto absolute inset-0 h-[100dvh] w-full bg-black/35 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="pointer-events-none relative mx-auto flex w-full max-w-lg flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          className={cn(
            'pointer-events-auto mb-3 w-full origin-bottom transition-all duration-200',
            open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-95 opacity-0'
          )}
        >
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3.5 text-left transition-colors hover:bg-sky-50 dark:border-zinc-800 dark:hover:bg-sky-950/40"
              onClick={() => {
                setOpen(false)
                router.push('/add-new-leads')
              }}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <UserPlus2 className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add new lead</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">Open the lead form</span>
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={() => {
                setOpen(false)
                router.push('/dashboard/performance?log=1')
              }}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <ClipboardList className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add log</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">Log an achievement</span>
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close quick add' : 'Quick add'}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'pointer-events-auto flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-yellow-400 ring-offset-2 ring-offset-white transition-all duration-200 hover:scale-110 hover:ring-yellow-300 hover:ring-offset-[3px] active:scale-95 dark:ring-offset-zinc-950',
            open
              ? 'bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white'
              : 'bg-[#00044a] shadow-[#00044a]/35 hover:bg-[#0a1168] hover:shadow-yellow-400/40'
          )}
        >
          {open ? <X className="size-6" /> : <Plus className="size-7" />}
        </button>
      </div>
    </div>
  )
}
