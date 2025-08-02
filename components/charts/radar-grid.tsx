'use client'

import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type CapturedData = {
  name: string
  value: number
}

interface ChartPieCapturedByProps {
  data: CapturedData[]
}

export function ChartPieCapturedBy({ data }: ChartPieCapturedByProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: `var(--chart-${(index % 5) + 1})`, // Rotate through chart colors
  }))

  const chartConfig: ChartConfig = {
    value: { label: "Captured" },
    ...Object.fromEntries(
      data.map((item, index) => [
        item.name,
        {
          label: `${item.name}-${item.value}`, // Append count to label
          color: `var(--chart-${(index % 5) + 1})`,
        },
      ])
    ),
  }

  return (
    <Card className="flex flex-col bg-background">
      <CardHeader className="items-center pb-0">
        <CardTitle>Lead Captures by Personnel</CardTitle>
        <CardDescription>Total Distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
