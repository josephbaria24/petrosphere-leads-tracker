'use client'

import { ArrowDownRight, ArrowUpRight, Expand } from 'lucide-react'
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
}
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  trend,
  subtext,
  className,
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="rounded-xl p-4 shadow-sm border bg-card relative space-y-2">
        {/* Top-right badge */}
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


        {/* Label with custom colored badge */}
        <div
          className={cn(
            'inline-block px-2 py-1 text-xs font-medium rounded',
            className
          )}
        >
          {label}
        </div>

        {/* Value */}
        <div className="text-2xl font-bold">{value}</div>

        {/* Trend */}
          {trend && change && (
            <div className="text-sm">
              {trend === 'up' ? (
                <span className="text-green-600 font-medium">
                  Trending up
                </span>
              ) : (
                <span className="text-red-600 font-medium">
                  Trending down
                </span>
              )}
            </div>
          )}

        {/* Subtext */}
        <p className="text-xs text-muted-foreground">{subtext}</p>

        {/* Bottom-right Expand icon */}
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 hover:bg-accent"
          >
            <Expand className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>

      {/* Modal content */}
      <DialogContent>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
