'use client'

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface StatCardProps {
  label: string
  value: string
  subtext: string
  trend?: 'up' | 'down'
  change?: string
  chartData?: { value: number }[] // Data for sparkline
  className?: string
  details?: { name: string; captured_by?: string; created_at?: string }[]
  icon?: React.ReactNode

}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  icon,
  value,
  change,
  trend,
  subtext,
  chartData = [],
  className,
  details = [],
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer bg-card border-0 text-black dark:text-white rounded-2xl p-6 relative overflow-hidden shadow-lg flex flex-col h-38 transition hover:opacity-90">
          {/* Top-right icon */}
          {trend && change && (
            <div
              className={`absolute top-4 right-4 p-2 rounded-full bg-white/20 ${
                trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
          )}

          {/* Title */}
          <div className="text-sm opacity-80 flex items-center gap-2">
            {icon}
            <span>{label}</span>
          </div>

          {/* Main number + sparkline */}
          <div className="pt-2 flex items-center gap-2">
            <div className="text-4xl font-semibold">{value}</div>
            {chartData.length > 0 && (
              <div className="w-16 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={trend === 'up' ? '#4ade80' : '#f87171'}
                    strokeWidth={2}
                    dot={false}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        {/* Subtitle at bottom */}
        <div className="mt-auto flex items-center text-xs pt-2 overflow-hidden whitespace-nowrap text-ellipsis">
          {trend && change && (
            <span className="bg-zinc-200 dark:bg-white/20 px-1 py-0.5 rounded-full shrink-0">
              {trend === 'up' ? '↑' : '↓'} {change}
            </span>
          )}
          <span className="overflow-hidden text-ellipsis whitespace-nowrap pl-1">
            {subtext}
          </span>
        </div>

        </div>
      </DialogTrigger>

      {/* Modal content */}
      <DialogContent className="max-h-[90vh] lg:max-w-[25vw] md:max-w-[50vw] sm:max-w-[80vw] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{label} Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-3xl font-bold">{value}</div>
          <div>
            <span className="text-muted-foreground">{subtext}</span>
          </div>

          {trend && change && (
            <div className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
              {trend === 'up' ? 'Trending upward' : 'Trending downward'} ({change})
            </div>
          )}

          {details.length > 0 && (
            <div className="pt-4">
              <div className="font-semibold text-sm mb-2">Leads:</div>
              <ul className="max-h-[300px] overflow-y-auto space-y-1 text-xs">
                {details.map((item, i) => (
                  <li key={i} className="flex justify-between border-b pb-1">
                    <div className="max-w-[200px] overflow-hidden">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-muted-foreground text-[10px] truncate">
                        {item.captured_by}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground whitespace-nowrap min-w-[60px] pl-2">
                      {new Date(item.created_at || '').toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
