'use client'

import { useMemo, useState } from 'react'

interface ServiceRow {
  service_product: string
  count: number
}

interface ServiceChartProps {
  data: ServiceRow[]
  title?: string
  subtitle?: string
  /** Max rows before enabling an internal scroll area. */
  maxVisible?: number
}

type HoverState = {
  visible: boolean
  x: number
  y: number
  name: string
  value: number
  pct: number
  rank: number
}

export function ServiceBarChart({
  data,
  title = 'Services / Products',
  subtitle = 'Most requested services by leads',
  maxVisible = 10,
}: ServiceChartProps) {
  const [hover, setHover] = useState<HoverState>({
    visible: false,
    x: 0,
    y: 0,
    name: '',
    value: 0,
    pct: 0,
    rank: 0,
  })

  const { rows, total, max } = useMemo(() => {
    const sorted = [...(data || [])].sort((a, b) => b.count - a.count)
    const totalCount = sorted.reduce((s, r) => s + (r.count || 0), 0)
    const maxVal = Math.max(1, ...sorted.map((r) => r.count || 0))
    return { rows: sorted, total: totalCount, max: maxVal }
  }, [data])

  const scrollable = rows.length > maxVisible
  const rowHeight = 34
  const listMaxHeight = scrollable ? maxVisible * rowHeight : undefined

  return (
    <div className="w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 relative">
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold leading-none tabular-nums">
            {total.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Requests
          </div>
        </div>
      </div>

      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern
            id="servicesDiag"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
            patternTransform="rotate(20)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="4"
              stroke="currentColor"
              strokeWidth="2"
              className="text-zinc-900 dark:text-zinc-200"
            />
          </pattern>
        </defs>
      </svg>

      <ul
        className="space-y-1 overflow-y-auto pr-1"
        style={{ maxHeight: listMaxHeight ? `${listMaxHeight}px` : undefined }}
        onMouseLeave={() => setHover((h) => ({ ...h, visible: false }))}
      >
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.count / total) * 100 : 0
          const widthPct = (r.count / max) * 100
          const useStripes = i % 2 === 1
          return (
            <li
              key={`${r.service_product}-${i}`}
              className="flex items-center gap-3 cursor-pointer py-1"
              onMouseEnter={(e) => {
                const card = e.currentTarget.closest(
                  '.relative',
                ) as HTMLElement | null
                const parent = card?.getBoundingClientRect()
                if (!parent) return
                setHover({
                  visible: true,
                  x: e.clientX - parent.left,
                  y: e.clientY - parent.top,
                  name: r.service_product,
                  value: r.count,
                  pct,
                  rank: i + 1,
                })
              }}
              onMouseMove={(e) => {
                const card = e.currentTarget.closest(
                  '.relative',
                ) as HTMLElement | null
                const parent = card?.getBoundingClientRect()
                if (!parent) return
                setHover((h) => ({
                  ...h,
                  x: e.clientX - parent.left,
                  y: e.clientY - parent.top,
                }))
              }}
            >
              <div className="w-5 shrink-0 text-[10px] text-muted-foreground tabular-nums text-right">
                {i + 1}
              </div>
              <div
                className="w-40 sm:w-48 shrink-0 truncate text-xs text-foreground/80"
                title={r.service_product}
              >
                {r.service_product}
              </div>
              <div className="flex-1 relative h-3 rounded-sm bg-zinc-100 dark:bg-zinc-800 overflow-hidden min-w-[60px]">
                <svg
                  className="absolute inset-0"
                  width="100%"
                  height="100%"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 10"
                >
                  <rect
                    x="0"
                    y="0"
                    width={widthPct}
                    height="10"
                    rx="1.5"
                    ry="1.5"
                    fill={useStripes ? 'url(#servicesDiag)' : 'currentColor'}
                    className={
                      useStripes ? '' : 'text-zinc-900 dark:text-zinc-100'
                    }
                  />
                </svg>
              </div>
              <div className="w-20 shrink-0 text-right">
                <span className="text-xs font-semibold tabular-nums">
                  {r.count.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1 tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </li>
          )
        })}

        {rows.length === 0 && (
          <li className="text-xs text-muted-foreground py-6 text-center">
            No services for the selected range.
          </li>
        )}
      </ul>

      {scrollable && (
        <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground text-center">
          Showing {rows.length} services — scroll list to see more
        </div>
      )}

      {hover.visible && (
        <div
          className="pointer-events-none absolute z-10 bg-zinc-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs border border-zinc-700 min-w-[180px] max-w-[260px]"
          style={{
            left: Math.max(0, hover.x + 12),
            top: Math.max(0, hover.y - 40),
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-white/50 tabular-nums">
              #{hover.rank}
            </span>
            <span className="font-semibold text-[12px] truncate">
              {hover.name}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-[3px] h-3 rounded-sm inline-block bg-white" />
              <span className="text-white/70">Requests</span>
            </div>
            <span className="font-semibold tabular-nums">
              {hover.value.toLocaleString()}
            </span>
          </div>
          <div className="border-t border-zinc-700 mt-2 pt-2 flex justify-between text-[11px] text-white/70">
            <span>Share</span>
            <span className="font-mono text-white tabular-nums">
              {hover.pct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
