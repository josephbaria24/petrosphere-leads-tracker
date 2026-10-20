'use client'

import { useRouter } from 'next/navigation'
import { ClipboardList, UserPlus2 } from 'lucide-react'

export default function QuickAddWidgetPage() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-dvh flex-col justify-center gap-4 overflow-hidden bg-gradient-to-b from-[#00044a] via-sky-950 to-teal-950 px-5 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(250,204,21,0.16),_transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-yellow-300/90">Petrosphere</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Quick add</h1>
          <p className="mt-1 text-sm text-sky-100/75">Choose what to capture</p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/add-new-leads')}
          className="flex w-full items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-left shadow-lg shadow-black/20 backdrop-blur-sm transition-transform active:scale-[0.98] hover:bg-white/15"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky-400 text-[#00044a] shadow-md shadow-sky-400/30">
            <UserPlus2 className="size-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold">Add new lead</span>
            <span className="block text-sm text-sky-100/70">Open the lead form</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.push('/dashboard/performance?log=1')}
          className="flex w-full items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-left shadow-lg shadow-black/20 backdrop-blur-sm transition-transform active:scale-[0.98] hover:bg-white/15"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-[#00044a] shadow-md shadow-yellow-400/35">
            <ClipboardList className="size-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold">Add log</span>
            <span className="block text-sm text-sky-100/70">Log an achievement</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mx-auto block text-center text-sm text-sky-200/70 underline-offset-2 hover:text-white hover:underline"
        >
          Open dashboard
        </button>
      </div>
    </div>
  )
}
