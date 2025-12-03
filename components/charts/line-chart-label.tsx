"use client"

import { useTheme } from 'next-themes'
import { TrendingUp, TrendingDown } from "lucide-react"
import { 
  ResponsiveContainer,
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  LabelList,
  TooltipProps 
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type OverallLeadsData = {
  label: string
  totalLeads: number
}

type OverallLeadsLineChartProps = {
  data: OverallLeadsData[]
  selectedYear: number
  selectedMonth: string
  selectedInterval: string
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-black bg-opacity-90 text-white text-xs rounded shadow-md p-3 min-w-[120px]">
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div className="flex justify-between items-center">
        <span>Total Leads:</span>
        <span className="font-semibold ml-2">{payload[0]?.value}</span>
      </div>
    </div>
  )
}

export function OverallLeadsLineChart({ 
  data, 
  selectedYear, 
  selectedMonth, 
  selectedInterval 
}: OverallLeadsLineChartProps) {
  const { theme } = useTheme()

  const strokeColor = theme === 'dark' ? '#FFD700' : '#000080' // yellow or navy
  const dotColor = theme === 'dark' ? '#000080' : '#ffb800'    // blue or gold
  const labelColor = theme === 'dark' ? '#ddd' : '#333'        // light gray or dark gray

  const getTrend = () => {
    if (data.length < 2) return { direction: 'neutral' as const, percentage: 0 }
    
    const lastValue = data[data.length - 1]?.totalLeads || 0
    const previousValue = data[data.length - 2]?.totalLeads || 0
    
    if (previousValue === 0) return { direction: 'neutral' as const, percentage: 0 }
    
    const change = ((lastValue - previousValue) / previousValue) * 100
    return {
      direction: (change >= 0 ? 'up' : 'down') as 'up' | 'down',
      percentage: Math.abs(change).toFixed(1)
    }
  }

  const trend = getTrend()
  const totalCount = data.reduce((sum, item) => sum + item.totalLeads, 0)

  const getDescription = () => {
    if (selectedInterval === 'annually') return `Annual overview of leads`
    if (selectedInterval === 'quarterly') return `Quarterly breakdown for ${selectedYear}`
    if (selectedInterval === 'weekly') return `Weekly breakdown for ${selectedYear}`
    if (selectedMonth === 'all') return `Monthly breakdown for ${selectedYear}`
    return `Daily breakdown for ${selectedMonth} ${selectedYear}`
  }

  return (
    <Card className="flex-1 bg-background border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Overall Leads Trend</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data}
            margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" opacity={0.5} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: labelColor }}
              angle={selectedMonth !== 'all' && selectedInterval === 'monthly' ? -45 : 0}
              textAnchor={selectedMonth !== 'all' && selectedInterval === 'monthly' ? "end" : "middle"}
              height={selectedMonth !== 'all' && selectedInterval === 'monthly' ? 60 : 30}
              interval={selectedMonth !== 'all' && selectedInterval === 'monthly' ? 2 : 'preserveStartEnd'}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: labelColor }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="totalLeads"
              stroke={strokeColor}
              strokeWidth={2.5}
              dot={{ fill: dotColor, r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            >
              <LabelList
  dataKey="totalLeads"
  position="top"
  offset={10}
  style={{ fill: labelColor, fontSize: '11px', fontWeight: 600 }}
/>

            </Line>
          </LineChart>
        </ResponsiveContainer>
        
        {/* Trend Indicator */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            {trend.direction === 'up' ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-600">
                  Up {trend.percentage}%
                </span>
              </>
            ) : trend.direction === 'down' ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-600">
                  Down {trend.percentage}%
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No change</span>
            )}
            <span className="text-muted-foreground">from previous period</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> leads
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
