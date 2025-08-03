'use client'

import { ArrowDownRight, ArrowUpRight, Expand, Maximize, Maximize2, Maximize2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'

interface StatCardProps {
  label: string
  value: string
  subtext: string
  trend?: 'up' | 'down'
  change?: string
  className?: string
  details?: { name: string; captured_by?: string; created_at?: string }[]
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  trend,
  subtext,
  className,
  details = [],
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="rounded-xl p-4 shadow-sm border bg-card relative space-y-2">
        {trend && change && (
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="text-xs px-2 py-1">
              {trend === 'up' ? (
                <span className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  {change}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <ArrowDownRight className="h-3 w-3" />
                  {change}
                </span>
              )}
            </Badge>
          </div>
        )}

        <div className={cn('inline-block px-2 py-1 text-xs font-medium rounded', className)}>
          {label}
        </div>

        <div className="text-2xl font-bold">{value}</div>

        {trend && change && (
          <div className="text-sm">
            {trend === 'up' ? (
              <span className="text-green-600 font-medium">Trending up</span>
            ) : (
              <span className="text-red-600 font-medium">Trending down</span>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">{subtext}</p>

        {details.length > 0 && (
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 hover:bg-accent"
            >
              <Maximize2 className="h-4 w-4 transform scale-x-[-1]" />
            </Button>
          </DialogTrigger>
        )}
      </div>

      {/* Modal with scrollable list */}
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden"> {/* 🚫 prevent X-scroll */}
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
            <li
              key={i}
              className="flex justify-between border-b pb-1"
            >
              <div className="max-w-[200px] overflow-hidden">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-muted-foreground text-[10px] truncate">{item.captured_by}</div>
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
