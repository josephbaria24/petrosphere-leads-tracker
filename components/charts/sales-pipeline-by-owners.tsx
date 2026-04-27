'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Loader2 } from 'lucide-react'

type LeadStatus =
  | 'Lead In'
  | 'Contact Made'
  | 'Needs Defined'
  | 'Proposal Sent'
  | 'Negotiation Started'
  | 'In Progress'
  | 'Closed Win'
  | 'Closed Lost'
  | 'For Follow up'

type RowData = { name: string } & Partial<Record<LeadStatus, number>>

type Props = {
  startDate: string
  endDate: string
}

const statuses: LeadStatus[] = [
  'Lead In',
  'Contact Made',
  'Needs Defined',
  'Proposal Sent',
  'Negotiation Started',
  'In Progress',
  'Closed Win',
  'Closed Lost',
  'For Follow up',
]

const statusColor: Record<LeadStatus, string> = {
  'Lead In': '#64748b',
  'Contact Made': '#2563eb',
  'Needs Defined': '#b45309',
  'Proposal Sent': '#7c3aed',
  'Negotiation Started': '#ea580c',
  'In Progress': '#0891b2',
  'Closed Win': '#16a34a',
  'Closed Lost': '#dc2626',
  'For Follow up': '#4f46e5',
}

type HoverState = {
  visible: boolean
  x: number
  y: number
  name: string
  total: number
  breakdown: { status: LeadStatus; value: number }[]
}

export default function SalesPipelineByOwners({
  startDate,
  endDate,
}: Props) {
  const [chartData, setChartData] = useState<RowData[]>([])
  const [hover, setHover] = useState<HoverState>({
    visible: false,
    x: 0,
    y: 0,
    name: '',
    total: 0,
    breakdown: [],
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return
      setIsLoading(true)

      const pageSize = 1000
      let from = 0
      let to = pageSize - 1
      let allData: {
        captured_by: string
        status: string
      }[] = []
      const { count } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .gte('first_contact', startDate)
        .lt('first_contact', endDate)

      if (count) {
        const pageSize = 1000
        const pages = Math.ceil(count / pageSize)
        const promises = []
        for (let i = 0; i < pages; i++) {
          promises.push(
            supabase
              .from('crm_leads')
              .select('captured_by, status')
              .gte('first_contact', startDate)
              .lt('first_contact', endDate)
              .range(i * pageSize, (i + 1) * pageSize - 1)
          )
        }
        const results = await Promise.all(promises)
        results.forEach(r => {
          if (r.data) allData = allData.concat(r.data)
        })
      }

      const map: Record<string, RowData> = {}
      allData.forEach(({ captured_by, status }) => {
        const name = captured_by?.trim() || 'Unknown'
        const normalized = status
          ?.toLowerCase()
          .replace(/\b\w/g, (c: string) => c.toUpperCase()) as LeadStatus
        if (!statuses.includes(normalized)) return
        if (!map[name]) map[name] = { name }
        map[name][normalized] = (map[name][normalized] || 0) + 1
      })

      setChartData(Object.values(map))
      setIsLoading(false)
    }

    fetchData()
  }, [startDate, endDate])

  const { rows, maxTotal, activeStatuses } = useMemo(() => {
    const ordered = [...chartData]
      .map((row) => ({
        ...row,
        total: statuses.reduce((s, k) => s + (row[k] || 0), 0),
      }))
      .sort((a, b) => b.total - a.total)

    const maxT = Math.max(1, ...ordered.map((r) => r.total))

    const seen = new Set<LeadStatus>()
    ordered.forEach((r) =>
      statuses.forEach((s) => {
        if ((r[s] || 0) > 0) seen.add(s)
      }),
    )
    const active = statuses.filter((s) => seen.has(s))

    return { rows: ordered, maxTotal: maxT, activeStatuses: active }
  }, [chartData])

  return (
    <div className="w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 relative min-h-[200px]">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Sales Pipeline by Owners
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Stacked by lead status
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/50 backdrop-blur-[1px] rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <ul
        className="space-y-2"
        onMouseLeave={() => setHover((h) => ({ ...h, visible: false }))}
      >
        {rows.map((r) => {
          const totalRow = r.total as number
          const widthPct = (totalRow / maxTotal) * 100
          const breakdown = statuses
            .map((s) => ({ status: s, value: (r[s] as number) || 0 }))
            .filter((b) => b.value > 0)
          const showHover = (e: React.MouseEvent<HTMLElement>) => {
            const container = e.currentTarget.closest(
              '.relative',
            ) as HTMLElement | null
            const parent = container?.getBoundingClientRect()
            if (!parent) return
            setHover({
              visible: true,
              x: e.clientX - parent.left,
              y: e.clientY - parent.top,
              name: r.name,
              total: totalRow,
              breakdown,
            })
          }
          const moveHover = (e: React.MouseEvent<HTMLElement>) => {
            const container = e.currentTarget.closest(
              '.relative',
            ) as HTMLElement | null
            const parent = container?.getBoundingClientRect()
            if (!parent) return
            setHover((h) => ({
              ...h,
              x: e.clientX - parent.left,
              y: e.clientY - parent.top,
            }))
          }
          return (
            <li
              key={r.name}
              className="flex items-center gap-3 cursor-pointer"
              onMouseEnter={showHover}
              onMouseMove={moveHover}
            >
              <div className="w-20 shrink-0 truncate text-xs text-muted-foreground">
                {r.name}
              </div>
              <div className="flex-1 relative h-3.5 rounded-sm bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="flex h-full"
                  style={{ width: `${widthPct}%` }}
                >
                  {statuses.map((s) => {
                    const v = (r[s] as number) || 0
                    if (v <= 0) return null
                    const segPct = (v / totalRow) * 100
                    return (
                      <div
                        key={s}
                        style={{
                          width: `${segPct}%`,
                          backgroundColor: statusColor[s],
                        }}
                      />
                    )
                  })}
                </div>
              </div>
              <div className="w-10 shrink-0 text-right text-xs font-semibold">
                {totalRow.toLocaleString()}
              </div>
            </li>
          )
        })}

        {rows.length === 0 && (
          <li className="text-xs text-muted-foreground py-4 text-center">
            No pipeline data for the selected range.
          </li>
        )}
      </ul>

      {activeStatuses.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          {activeStatuses.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-[2px] inline-block"
                style={{ backgroundColor: statusColor[s] }}
              />
              <span className="text-[10px] text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      )}

      {hover.visible && (
        <div
          className="pointer-events-none absolute z-10 bg-black text-white rounded-md shadow-md px-3 py-2 text-xs min-w-[180px]"
          style={{
            left: Math.max(
              0,
              Math.min(hover.x + 10, 520),
            ),
            top: Math.max(0, hover.y - 10),
          }}
        >
          <div className="font-semibold mb-2">{hover.name}</div>
          {hover.breakdown.map((b) => (
            <div
              key={b.status}
              className="flex justify-between items-center gap-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: statusColor[b.status] }}
                />
                <span>{b.status}</span>
              </div>
              <span className="font-mono">{b.value}</span>
            </div>
          ))}
          <div className="border-t mt-2 pt-2 flex justify-between text-[11px] font-medium text-white/70">
            <span>Total</span>
            <span className="font-mono text-white">{hover.total}</span>
          </div>
        </div>
      )}
    </div>
  )
}
