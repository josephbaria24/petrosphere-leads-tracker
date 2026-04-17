'use client'

import { useMemo } from 'react'

interface Props {
  percentage: number
  label?: string
  totalTicks?: number
  size?: number
}

export function SuccessfulDealsGauge({
  percentage,
  label = 'Successful deals',
  totalTicks = 60,
  size = 220,
}: Props) {
  const pct = Math.max(0, Math.min(100, percentage || 0))

  const { ticks, center, radiusOuter, radiusInner } = useMemo(() => {
    const width = size
    const height = size / 1.6
    const cx = width / 2
    const cy = height
    const rOuter = height - 6
    const rInner = rOuter - 18
    const activeCount = Math.round((pct / 100) * totalTicks)

    const ticksArr = Array.from({ length: totalTicks }, (_, i) => {
      const angleDeg = 180 + (i / (totalTicks - 1)) * 180
      const angleRad = (angleDeg * Math.PI) / 180
      const x1 = cx + rInner * Math.cos(angleRad)
      const y1 = cy + rInner * Math.sin(angleRad)
      const x2 = cx + rOuter * Math.cos(angleRad)
      const y2 = cy + rOuter * Math.sin(angleRad)
      return { x1, y1, x2, y2, active: i < activeCount }
    })

    return {
      ticks: ticksArr,
      center: { cx, cy, width, height },
      radiusOuter: rOuter,
      radiusInner: rInner,
    }
  }, [pct, size, totalTicks])

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <svg
        viewBox={`0 0 ${center.width} ${center.height + 8}`}
        width="100%"
        height={center.height + 8}
        role="img"
        aria-label={label}
      >
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className={
              t.active
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-300 dark:text-zinc-700'
            }
          />
        ))}

        <text
          x={center.cx}
          y={center.cy - 22}
          textAnchor="middle"
          className="fill-zinc-900 dark:fill-zinc-100 font-bold"
          style={{ fontSize: Math.round(center.width * 0.13) }}
        >
          {pct.toFixed(0)}%
        </text>
        <text
          x={center.cx}
          y={center.cy - 4}
          textAnchor="middle"
          className="fill-zinc-500 dark:fill-zinc-400"
          style={{ fontSize: Math.round(center.width * 0.055) }}
        >
          {label}
        </text>
      </svg>
    </div>
  )
}
