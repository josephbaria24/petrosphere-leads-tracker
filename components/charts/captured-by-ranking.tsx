'use client'

import { useMemo, useState } from 'react'

type CapturedItem = { name: string; value: number }

interface Props {
  data: CapturedItem[]
  title?: string
  subtitle?: string
  maxRows?: number
}

type HoverState = {
  visible: boolean
  x: number
  y: number
  name: string
  value: number
  pct: number
}

export function CapturedByRanking({
  data,
  title = 'Lead Captures by Personnel',
  subtitle = 'Total Distribution',
  maxRows = 8,
}: Props) {
  const [hover, setHover] = useState<HoverState>({
    visible: false,
    x: 0,
    y: 0,
    name: '',
    value: 0,
    pct: 0,
  })

  const { rows, total, max } = useMemo(() => {
    const sorted = [...(data || [])].sort((a, b) => b.value - a.value)
    const top = sorted.slice(0, maxRows)
    const totalCount = sorted.reduce((s, r) => s + r.value, 0)
    const maxVal = Math.max(1, ...top.map((r) => r.value))
    return { rows: top, total: totalCount, max: maxVal }
  }, [data, maxRows])

  return (
    <div className="w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 relative">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold leading-none">
            {total.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Captured
          </div>
        </div>
      </div>

      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern
            id="capturedDiag"
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
        className="mt-3 space-y-2"
        onMouseLeave={() => setHover((h) => ({ ...h, visible: false }))}
      >
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.value / total) * 100 : 0
          const widthPct = (r.value / max) * 100
          const useStripes = i % 2 === 1
          return (
            <li
              key={r.name + i}
              className="flex items-center gap-3 cursor-pointer"
              onMouseEnter={(e) => {
                const parent = (
                  e.currentTarget.parentElement?.parentElement as HTMLElement
                )?.getBoundingClientRect()
                if (!parent) return
                setHover({
                  visible: true,
                  x: e.clientX - parent.left,
                  y: e.clientY - parent.top,
                  name: r.name,
                  value: r.value,
                  pct,
                })
              }}
              onMouseMove={(e) => {
                const parent = (
                  e.currentTarget.parentElement?.parentElement as HTMLElement
                )?.getBoundingClientRect()
                if (!parent) return
                setHover((h) => ({
                  ...h,
                  x: e.clientX - parent.left,
                  y: e.clientY - parent.top,
                }))
              }}
            >
              <div className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                {r.name}
              </div>
              <div className="flex-1 relative h-3 rounded-sm bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
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
                    fill={useStripes ? 'url(#capturedDiag)' : 'currentColor'}
                    className={
                      useStripes ? '' : 'text-zinc-900 dark:text-zinc-100'
                    }
                  />
                </svg>
              </div>
              <div className="w-20 shrink-0 text-right">
                <span className="text-xs font-semibold">
                  {r.value.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </li>
          )
        })}

        {rows.length === 0 && (
          <li className="text-xs text-muted-foreground py-4 text-center">
            No data for the selected range.
          </li>
        )}
      </ul>

      {hover.visible && (
        <div
          className="pointer-events-none absolute z-10 bg-black text-white rounded-md shadow-md px-3 py-2 text-xs"
          style={{
            left: Math.max(0, hover.x + 10),
            top: Math.max(0, hover.y - 40),
          }}
        >
          <div className="font-semibold mb-1">{hover.name}</div>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              <span>Captured</span>
            </div>
            <span className="font-mono">{hover.value}</span>
          </div>
          <div className="border-t mt-2 pt-2 flex justify-between text-[11px] text-white/70">
            <span>Share</span>
            <span className="font-mono text-white">
              {hover.pct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
