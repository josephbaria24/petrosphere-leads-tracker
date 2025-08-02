'use client'

import { ResponsiveHeatMap } from '@nivo/heatmap'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type HeatmapDatum = {
  id: string
  data: { x: string; y: number }[]
}

interface HeatmapChartProps {
  data: HeatmapDatum[]
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState<boolean>(false)

  useEffect(() => {
    setIsDark(theme === 'dark')
  }, [theme])

  return (
    <div className="h-[400px] w-full bg-background">
      <ResponsiveHeatMap

        data={data}
        valueFormat=">-.2s"
        margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
        axisTop={{
          tickRotation: -45,
          tickSize: 5,
          tickPadding: 5,
          legend: '',
          legendOffset: 36,
        }}
        axisRight={{
          legend: '',
          legendOffset: 70,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          legend: '',
          legendOffset: 40,
        }}
        colors={{
          type: 'diverging',
          scheme: 'red_yellow_blue',
          divergeAt: 0.5,
          minValue: -100,
          maxValue: 100,
        }}
        emptyColor={isDark ? '#1f2937' : '#e5e7eb'}
        borderColor="#2d2d2d"
        enableLabels
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', isDark ? 2.4 : 1.6]],
        }}
        animate
        motionConfig="wobbly"
        theme={{
          background: isDark ? '#09090b' : '#ffffff',
          axis: {
            ticks: {
              line: {
                stroke: isDark ? '#e2e8f0' : '#1e293b',
              },
              text: {
                fill: isDark ? '#e2e8f0' : '#1e293b',
                fontSize: 11,
              },
            },
          },
          tooltip: {
            container: {
              background: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f9fafb' : '#111827',
              fontSize: 12,
              borderRadius: 6,
              padding: 8,
            },
          },
          legends: {
            text: {
              fill: isDark ? '#f3f4f6' : '#111827',
            },
          },
        }}
        legends={[
          {
            anchor: 'bottom',
            translateX: 0,
            translateY: 30,
            length: 400,
            thickness: 8,
            direction: 'row',
            tickPosition: 'after',
            tickSize: 3,
            tickSpacing: 4,
            tickOverlap: false,
            tickFormat: '>-.2s',
            title: 'Volume →',
            titleAlign: 'start',
            titleOffset: 4,
          },
        ]}
      />
    </div>
  )
}
