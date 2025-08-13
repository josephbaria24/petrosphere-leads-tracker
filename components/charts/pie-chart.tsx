'use client'

import * as React from "react"
import { Pie, PieChart, Sector, Label, ResponsiveContainer, Legend } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import type { Payload } from 'recharts/types/component/DefaultLegendContent'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

type CapturedData = {
  name: string
  value: number
}

interface ChartPieCapturedByProps {
  data: CapturedData[]
}

interface CustomLegendPayload {
  color: string
  value?: number
  payload: {
    name: string
    value: number
  }
}

export function ChartPieCapturedBy({ data }: ChartPieCapturedByProps) {
  const id = "lead-captures"
  const COLORS = data.map((_, index) => `var(--chart-${(index % 5) + 1})`)
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index],
  }))

  const chartConfig: ChartConfig = {
    value: { label: "Captured" },
    ...Object.fromEntries(
      data.map((item, index) => [
        item.name,
        {
          label: `${item.name}-${item.value}`,
          color: COLORS[index],
        },
      ])
    ),
  }

  const [activeIndex, setActiveIndex] = React.useState(0)

  return (
    <Card data-chart={id} className="flex flex-col bg-card border-0 shadow-lg">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="items-center pb-0">
        <CardTitle>Lead Captures by Personnel</CardTitle>
        <CardDescription>Total Distribution</CardDescription>
      </CardHeader>

      <CardContent className="flex justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[320px]"
        >
          <div className="flex flex-col items-center w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
              <Legend content={<CustomLegend />} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                  activeIndex={activeIndex}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                    <g>
                      <Sector {...props} outerRadius={outerRadius + 10} />
                      <Sector
                        {...props}
                        outerRadius={outerRadius + 0}
                        innerRadius={outerRadius + 10}
                      />
                    </g>
                  )}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground text-sm"
                            >
                              Captured
                            </tspan>
                          </text>
                        )
                      }
                      return null
                    }}
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <ChartLegend content={<CustomLegend />} />

          </div>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function CustomLegend({ payload }: { payload?: CustomLegendPayload[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-sm">
      {payload?.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span>
            {entry.payload.name} ({entry.payload.value})
          </span>
        </div>
      ))}
    </div>
  )
}
