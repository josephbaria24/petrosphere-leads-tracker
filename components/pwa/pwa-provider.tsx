'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'petrosphere-pwa-install-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

export function PwaProvider() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIos, setShowIos] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const host = window.location.hostname
    const allow = process.env.NODE_ENV === 'production' || host === 'localhost' || host === '127.0.0.1'
    if (!allow) return
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    if (isIos()) {
      setShowIos(true)
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2',
        'pointer-events-none'
      )}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mt-0.5 rounded-xl bg-[#00044a] p-2 text-white">
          <Download className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Install Petrosphere CRM</p>
          {showIos && !deferred ? (
            <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
              On iPhone/iPad: tap <Share className="mx-0.5 inline size-3.5 align-text-bottom" /> Share, then <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Add it to your home screen for quick access like an app.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {deferred && (
              <Button type="button" size="sm" className="h-8 bg-[#00044a] text-white hover:bg-[#0a1168]" onClick={install}>
                Install
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button type="button" aria-label="Dismiss" className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={dismiss}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
