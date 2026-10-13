'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gauge, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  {
    href: '/dashboard',
    label: 'Pipeline',
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === '/dashboard',
  },
  {
    href: '/dashboard/performance',
    label: 'Performance',
    icon: Gauge,
    match: (pathname: string) => pathname.startsWith('/dashboard/performance'),
  },
] as const

export function DashboardViewTabs() {
  const pathname = usePathname()

  return (
    <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
      {tabs.map((tab) => {
        const active = tab.match(pathname)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200',
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-3.5" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
