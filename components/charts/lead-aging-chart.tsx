'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface LeadAgingData {
  range: string
  count: number
  color: string
}

interface LeadAgingChartProps {
  data: LeadAgingData[]
}

export function LeadAgingChart({ data }: LeadAgingChartProps) {
  return (
    <Card className="col-span-1 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          Lead Aging (Active)
        </CardTitle>
        <CardDescription className="text-[11px]">
          Days since last activity for in-progress leads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.4)" />
              <XAxis 
                dataKey="range" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid rgba(226, 232, 240, 0.8)', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '11px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)'
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={45}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground bg-slate-50 dark:bg-zinc-800/50 p-1.5 rounded-md border border-slate-100 dark:border-zinc-700/50">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium">{item.range}:</span>
              <span className="text-foreground font-bold">{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
