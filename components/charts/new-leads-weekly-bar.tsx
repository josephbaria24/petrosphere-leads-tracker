'use client'

import { useMemo, useState } from 'react'

type WeeklyDatum = { day: string; count: number }

interface Props {
  data: WeeklyDatum[]
  title?: string
  height?: number
}

type HoverState = {
  visible: boolean
  x: number
  y: number
  label: string
  count: number
}

export function NewLeadsWeeklyBar({
  data,
  title = 'New Leads',
  height = 180,
}: Props) {
  const [hover, setHover] = useState<HoverState>({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    count: 0,
  })

  const { bars, ticks, maxY } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.count))
    const niceMax = Math.ceil(max / 5) * 5 || 5
    const tickValues = [0, niceMax / 2, niceMax]
    return { bars: data, ticks: tickValues, maxY: niceMax }
  }, [data])

  const chartWidth = 520
  const chartHeight = height
  const paddingLeft = 32
  const paddingRight = 16
  const paddingTop = 12
  const paddingBottom = 28
  const innerW = chartWidth - paddingLeft - paddingRight
  const innerH = chartHeight - paddingTop - paddingBottom

  const barGap = 0.35
  const barBand = innerW / Math.max(bars.length, 1)
  const barWidth = barBand * (1 - barGap)

  const yFor = (v: number) => paddingTop + innerH - (v / maxY) * innerH

  return (
    <div className="w-full relative">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        height={chartHeight}
        role="img"
        aria-label={title}
        onMouseLeave={() => setHover((h) => ({ ...h, visible: false }))}
      >
        <defs>
          <pattern
            id="diagLines"
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

        {ticks.map((t) => (
          <g key={t}>
            <text
              x={paddingLeft - 8}
              y={yFor(t) + 3}
              textAnchor="end"
              className="fill-zinc-500 dark:fill-zinc-400 text-[10px]"
            >
              {t}
            </text>
            <line
              x1={paddingLeft}
              x2={chartWidth - paddingRight}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-800"
              strokeDasharray={t === 0 ? '0' : '2 4'}
            />
          </g>
        ))}

        {bars.map((d, i) => {
          const x = paddingLeft + barBand * i + (barBand - barWidth) / 2
          const y = yFor(d.count)
          const h = paddingTop + innerH - y
          const useStripes = i % 2 === 1
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={3}
                ry={3}
                fill={useStripes ? 'url(#diagLines)' : 'currentColor'}
                className={
                  (useStripes ? '' : 'text-zinc-900 dark:text-zinc-100 ') +
                  'cursor-pointer'
                }
                onMouseEnter={(e) => {
                  const rect = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  )?.getBoundingClientRect()
                  const parent = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  )?.parentElement?.getBoundingClientRect()
                  if (!rect || !parent) return
                  setHover({
                    visible: true,
                    x: e.clientX - parent.left,
                    y: e.clientY - parent.top,
                    label: d.day,
                    count: d.count,
                  })
                }}
                onMouseMove={(e) => {
                  const parent = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  )?.parentElement?.getBoundingClientRect()
                  if (!parent) return
                  setHover((h) => ({
                    ...h,
                    x: e.clientX - parent.left,
                    y: e.clientY - parent.top,
                  }))
                }}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight - paddingBottom + 16}
                textAnchor="middle"
                className="fill-zinc-500 dark:fill-zinc-400 text-[11px]"
              >
                {d.day}
              </text>
            </g>
          )
        })}
      </svg>

      {hover.visible && (
        <div
          className="pointer-events-none absolute z-10 bg-black text-white rounded-md shadow-md px-3 py-2 text-xs"
          style={{
            left: Math.max(0, hover.x + 10),
            top: Math.max(0, hover.y - 36),
          }}
        >
          <div className="font-semibold mb-1">{hover.label}</div>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              <span>New Leads</span>
            </div>
            <span className="font-mono">{hover.count}</span>
          </div>
        </div>
      )}
    </div>
  )
}
