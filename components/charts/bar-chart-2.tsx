// components/ui/bar-chart-2.tsx
'use client'


import { TooltipProps } from 'recharts'
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import { useEffect, useState } from 'react'
import { LabelList } from "recharts" 
import { supabase } from '@/lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

type LeadStatus = 'Lead In' | 'Contact Made' | 'Needs Defined' | 'Proposal Sent' | 'Negotiation Started' | 'In Progress' | 'Closed Win' | 'Closed Lost' | 'For Follow up'

type ChartData = {
    name: string
  } & Partial<Record<LeadStatus, number>>
  
  type CRMBarChartProps = {
    selectedYear: number
    selectedMonth: string
    selectedInterval: string
    rangeIndex: number
  }
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload || payload.length === 0) return null
  
    const total = payload.reduce((sum, item) => sum + (item.value as number), 0)
  
    return (
      <div className="bg-black text-white text-sm p-2 rounded shadow-lg">
        <div className="font-semibold mb-1">{label}</div>
        <ul className="space-y-0.5">
          {payload.map((entry, idx) => (
            <li key={idx} className="flex items-center justify-between gap-2">
              <span className="flex items-center">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="ml-auto">{entry.value}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-white mt-1 pt-1 text-right text-xs opacity-80">
          Total {total}
        </div>
      </div>
    )
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

const statusColorMap: Record<LeadStatus, string> = {
  'Lead In': '#1e293b',
  'Contact Made': '#0920e8',
  'Needs Defined': '#991b1b',
  'Proposal Sent': '#a16207',
  'Negotiation Started': '#f79205',
  'In Progress': '#4d7c0f', // This color is not used in the chart
  'Closed Win': '#15803d',
  'Closed Lost': '#f44336', // Added for completeness, but not used in the chart
  'For Follow up': '#1d4ed8', // Added for completeness, but not used in the chart
}



function generateTimeLabels(interval: string, month: string, year: number, availableYears: number[]): string[] {
  switch (interval) {
    case 'weekly':
      return Array.from({ length: 52 }, (_, i) => `W${i + 1}`)
    case 'quarterly':
      return ['Q1', 'Q2', 'Q3', 'Q4']
    case 'annually':
      return availableYears.map(String)
    default: {
      if (month === 'all') {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      } else {
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
        return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'))
      }
    }
  }
}




export default function CRMBarChart({
  selectedYear,
  selectedMonth,
  selectedInterval,
  rangeIndex,
}: CRMBarChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      let startDate = new Date(selectedYear, 0, 1)
      let endDate = new Date(selectedYear + 1, 0, 1)
  
      const label = generateTimeLabels(selectedInterval, selectedMonth, selectedYear, [selectedYear])[rangeIndex]
  
      switch (selectedInterval) {
        case 'weekly': {
          const janFirst = new Date(selectedYear, 0, 1)
          startDate = new Date(janFirst)
          startDate.setDate(janFirst.getDate() + rangeIndex * 7)
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 7)
          break
        }
        case 'quarterly': {
          const startMonth = rangeIndex * 3
          startDate = new Date(selectedYear, startMonth, 1)
          endDate = new Date(selectedYear, startMonth + 3, 1)
          break
        }
        case 'annually': {
          const labelYear = parseInt(label)
          if (!label || isNaN(labelYear)) return
          startDate = new Date(labelYear, 0, 1)
          endDate = new Date(labelYear + 1, 0, 1)
          break
        }
        default: {
          if (selectedMonth !== 'all') {
            const monthIndex = new Date(`${selectedMonth} 1, ${selectedYear}`).getMonth()
            startDate = new Date(selectedYear, monthIndex, 1)
            endDate = new Date(selectedYear, monthIndex + 1, 1)
          }
        }
      }
  
      const pageSize = 1000
      let from = 0
      let to = pageSize - 1
      let allData: { captured_by: string; status: string; first_contact: string }[] = []
      let done = false
  
      while (!done) {
        const { data, error } = await supabase
          .from('crm_leads')
          .select('captured_by, status, first_contact')
          .gte('first_contact', startDate.toISOString())
          .lt('first_contact', endDate.toISOString())
          .range(from, to)
  
        if (error) {
          console.error('Error fetching CRM leads:', error)
          return
        }
  
        if (!data || data.length === 0) {
          done = true
        } else {
          allData = allData.concat(data)
          if (data.length < pageSize) {
            done = true
          } else {
            from += pageSize
            to += pageSize
          }
        }
      }
  
      const map: Record<string, ChartData> = {}
  
      allData.forEach(({ captured_by, status }) => {
        const name = captured_by?.trim() || 'Unknown'
        const normalizedStatus = status?.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) as LeadStatus
  
        if (!statuses.includes(normalizedStatus)) return
  
        if (!map[name]) map[name] = { name }
        map[name][normalizedStatus] = (map[name][normalizedStatus] || 0) + 1
      })
  
      setChartData(Object.values(map))
    }
  
    fetchData()
  }, [selectedYear, selectedMonth, selectedInterval, rangeIndex])
  


  
  return (
    <Card className="rounded-2xl p-4 w-full bg-background border-1 shadow-lg">
      <CardContent>
        <h2 className="text-xl font-semibold mb-4">Sales Pipeline by Owners</h2>
        <ResponsiveContainer width="100%" height={305}>
  <BarChart
    layout="vertical"
    data={chartData.map(row => ({
      ...row,
      total: statuses.reduce((sum, status) => sum + (row[status] || 0), 0), // Add total per row
    }))}
    margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
  >
    <CartesianGrid strokeDasharray="0 1" />
    <XAxis type="number" />
    <YAxis dataKey="name" type="category" allowDecimals={false} />
    <Tooltip content={<CustomTooltip />} cursor={false} />
    <Legend />

    {statuses.map((status, idx) => (
      <Bar
      key={status}
      dataKey={status}
      stackId="a"
      fill={statusColorMap[status]}
      name={status.replace(/\b\w/g, (c) => c.toUpperCase())}
      radius={[0, 2, 2, 0]}
    >
      {idx === statuses.length - 1 && (
        <LabelList
          position="right"
          className="text-xs"
          content={({ x, y, width, index }) => {
            if (index == null) return null
            const entry = chartData[index]
            if (!entry) return null
    
            const total = statuses.reduce(
              (sum, s) => sum + (entry[s] || 0),
              0
            )
    
            const xPos = Number(x) + Number(width) + 4
            const yPos = Number(y) + 26
    
            let color = getComputedStyle(document.documentElement)
              .getPropertyValue('--foreground')
              .trim()
    
            // If the color is in hex/rgb already, just use it
            if (color.startsWith('#') || color.startsWith('rgb')) {
              // do nothing
            } else {
              color = `hsl(${color})`
            }
    
            return (
              <text
                x={xPos}
                y={yPos}
                fontSize="12"
                fill={color} // ✅ Works in both dark & light mode
              >
                {total}
              </text>
            )
          }}
        />
      )}
    </Bar>
    


))}



  </BarChart>
</ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
