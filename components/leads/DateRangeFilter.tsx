'use client'

import { useMemo } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type DateField = 'first_contact' | 'last_contact' | 'created_at' | 'any'

export type DateRangeValue = {
  field: DateField
  preset: string
  from: string
  to: string
}

export const EMPTY_DATE_RANGE: DateRangeValue = {
  field: 'first_contact',
  preset: 'all',
  from: '',
  to: '',
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const day = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - day)
  return next
}

function endOfDayKey(date: Date) {
  return toDateKey(date)
}

export function resolveDateRange(value: DateRangeValue): { from: string; to: string } | null {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (value.preset === 'custom') {
    if (!value.from && !value.to) return null
    return {
      from: value.from || '1970-01-01',
      to: value.to || toDateKey(now),
    }
  }

  if (value.preset === 'all' || !value.preset) return null

  const today = toDateKey(now)
  if (value.preset === 'today') return { from: today, to: today }

  if (value.preset === 'yesterday') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const key = toDateKey(yesterday)
    return { from: key, to: key }
  }

  if (value.preset === 'this_week') {
    return { from: toDateKey(startOfWeek(now)), to: today }
  }

  if (value.preset === 'last_week') {
    const start = startOfWeek(now)
    start.setDate(start.getDate() - 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { from: toDateKey(start), to: endOfDayKey(end) }
  }

  if (value.preset === 'this_month') {
    return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: today }
  }

  if (value.preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: toDateKey(start), to: toDateKey(end) }
  }

  if (value.preset === 'this_quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    const start = new Date(now.getFullYear(), quarter * 3, 1)
    return { from: toDateKey(start), to: today }
  }

  if (value.preset === 'last_quarter') {
    const quarter = Math.floor(now.getMonth() / 3) - 1
    const year = quarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
    const q = (quarter + 4) % 4
    const start = new Date(year, q * 3, 1)
    const end = new Date(year, q * 3 + 3, 0)
    return { from: toDateKey(start), to: toDateKey(end) }
  }

  if (value.preset === 'this_year') {
    return { from: `${now.getFullYear()}-01-01`, to: today }
  }

  if (value.preset === 'last_year') {
    const year = now.getFullYear() - 1
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }

  if (value.preset === 'last_7') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { from: toDateKey(start), to: today }
  }

  if (value.preset === 'last_30') {
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    return { from: toDateKey(start), to: today }
  }

  if (value.preset === 'last_90') {
    const start = new Date(now)
    start.setDate(start.getDate() - 89)
    return { from: toDateKey(start), to: today }
  }

  return null
}

const FIELD_OPTIONS: { id: DateField; label: string }[] = [
  { id: 'first_contact', label: 'First contact' },
  { id: 'last_contact', label: 'Last contact' },
  { id: 'created_at', label: 'Created date' },
  { id: 'any', label: 'Any date field' },
]

const PRESET_GROUPS: { label: string; items: { id: string; label: string }[] }[] = [
  {
    label: 'Quick',
    items: [
      { id: 'all', label: 'All time' },
      { id: 'today', label: 'Today' },
      { id: 'yesterday', label: 'Yesterday' },
      { id: 'last_7', label: 'Last 7 days' },
      { id: 'last_30', label: 'Last 30 days' },
      { id: 'last_90', label: 'Last 90 days' },
    ],
  },
  {
    label: 'Calendar',
    items: [
      { id: 'this_week', label: 'This week' },
      { id: 'last_week', label: 'Last week' },
      { id: 'this_month', label: 'This month' },
      { id: 'last_month', label: 'Last month' },
      { id: 'this_quarter', label: 'This quarter' },
      { id: 'last_quarter', label: 'Last quarter' },
      { id: 'this_year', label: 'This year' },
      { id: 'last_year', label: 'Last year' },
    ],
  },
  {
    label: 'Custom',
    items: [{ id: 'custom', label: 'Custom range' }],
  },
]

function presetLabel(preset: string) {
  for (const group of PRESET_GROUPS) {
    const match = group.items.find((item) => item.id === preset)
    if (match) return match.label
  }
  return 'Dates'
}

function fieldLabel(field: DateField) {
  return FIELD_OPTIONS.find((item) => item.id === field)?.label || 'Date'
}

type Props = {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}

export function DateRangeFilter({ value, onChange }: Props) {
  const resolved = useMemo(() => resolveDateRange(value), [value])
  const active = !!resolved
  const summary = active
    ? `${fieldLabel(value.field)} · ${
        value.preset === 'custom'
          ? `${value.from || '…'} → ${value.to || '…'}`
          : presetLabel(value.preset)
      }`
    : 'Date filter'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800',
            active && 'border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300'
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          <span className="max-w-[180px] truncate">{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-3 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Date filter</p>
          {active && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ ...EMPTY_DATE_RANGE, field: value.field })}
            >
              <X className="size-3" />
              Clear
            </button>
          )}
        </div>

        <label className="mb-3 block text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          Apply to
          <Select
            value={value.field}
            onValueChange={(field) => onChange({ ...value, field: field as DateField })}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {PRESET_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => {
                const selected = value.preset === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'custom') {
                        onChange({
                          ...value,
                          preset: 'custom',
                          from: value.from || resolved?.from || '',
                          to: value.to || resolved?.to || toDateKey(new Date()),
                        })
                        return
                      }
                      onChange({ ...value, preset: item.id, from: '', to: '' })
                    }}
                    className={cn(
                      'rounded-md border px-2 py-1 text-[11px]',
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-100'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {value.preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              From
              <Input
                type="date"
                value={value.from}
                onChange={(event) => onChange({ ...value, preset: 'custom', from: event.target.value })}
                className="mt-1 h-9"
              />
            </label>
            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              To
              <Input
                type="date"
                value={value.to}
                onChange={(event) => onChange({ ...value, preset: 'custom', to: event.target.value })}
                className="mt-1 h-9"
              />
            </label>
          </div>
        )}

        {resolved && value.preset !== 'custom' && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {resolved.from} → {resolved.to}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function applyDateRangeToQuery<T extends { or: (filters: string) => T; gte: (column: string, value: string) => T; lte: (column: string, value: string) => T }>(
  query: T,
  value: DateRangeValue
): T {
  const range = resolveDateRange(value)
  if (!range) return query

  const bound = (column: string) => {
    if (column === 'created_at') {
      return `and(${column}.gte.${range.from}T00:00:00,${column}.lte.${range.to}T23:59:59.999)`
    }
    return `and(${column}.gte.${range.from},${column}.lte.${range.to})`
  }

  if (value.field === 'any') {
    return query.or([bound('first_contact'), bound('last_contact'), bound('created_at')].join(','))
  }

  if (value.field === 'created_at') {
    return query.gte('created_at', `${range.from}T00:00:00`).lte('created_at', `${range.to}T23:59:59.999`)
  }

  return query.gte(value.field, range.from).lte(value.field, range.to)
}
