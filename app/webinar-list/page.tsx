"use client"

import * as React from "react"
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table"

import { ChevronDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { columns } from "./columns"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@supabase/auth-helpers-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@radix-ui/react-separator"

import type { Webinar } from "./columns"
import EditWebinarModal from "@/components/EditWebinarModal"
import { Skeleton } from "@/components/ui/skeleton"

export default function WebinarTablePage() {
  const [selectedYear, setSelectedYear] = useState<string>("2025") // default year
  const yearOptions = Array.from({ length: 10 }, (_, i) => String(2023 + i)) // 2023–2032

  const router = useRouter()
  const session = useSession()
  const [isReady, setIsReady] = useState(false)

  const [data, setData] = useState<Webinar[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [pageSize, setPageSize] = useState(20)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentUserName, setCurrentUserName] = useState<string>('Unknown')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      if (!userId) return

      const { data: profile } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

      if (profile?.full_name) {
        setCurrentUserName(profile.full_name)
      }
    }

    fetchCurrentUserProfile()
  }, [])

  useEffect(() => {
    const fetchWebinars = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("webinar_tracker")
        .select("*")
        .eq("year", selectedYear)
  
      if (error) {
        console.error("Error fetching webinars:", error)
        return
      }
  
      const MONTH_ORDER = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ]
  
      // Pad missing months with empty rows
      const paddedData = MONTH_ORDER.map((month) => {
        const match = data?.find((row) => row.month === month)
        return match || {
          id: `placeholder-${month}-${selectedYear}`,
          month,
          year: selectedYear,
          registration_page_views: null,
          registered_participants: null,
          attended_participants: null,
          webinar_title: null,
          presenters: null,
          duration_planned: null,
          actual_run_time: null,
          average_attendance_time: null,
          event_rating: null,
          created_at: null,
        }
      })
  
      setData(paddedData)
      setLoading(false)
    }
  
    fetchWebinars()
  }, [selectedYear])
  

  useEffect(() => {
    if (session === null) {
      router.replace("/login")
    } else if (session) {
      setIsReady(true)
    }
  }, [session, router])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
  })

  useEffect(() => {
    table.setPageSize(pageSize)
  }, [pageSize, table])

  if (!isReady) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 pl-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Webinars</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <Separator className="my-4" />
      <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] mr-4 ml-4">
                <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
                {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                    {year}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>

      <div className="flex items-center py-4">
        <Input
          placeholder="Search webinars..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
          {loading ? (
            // Show 12 skeleton rows (1 per month)
            Array.from({ length: 12 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((_, idx) => (
                  <TableCell key={idx}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted"
                  onClick={(e) => {
                    const isCheckbox = (e.target as HTMLElement).closest('button, input[type="checkbox"]')
                    if (isCheckbox) return

                    setSelectedWebinar(row.original)
                    setEditModalOpen(true)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of {" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>

          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[80px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {selectedWebinar && (
        <EditWebinarModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          webinar={selectedWebinar}
          currentUserName={currentUserName}
          onSave={async (updated: Partial<Webinar>) => {
            // ✅ INSERT for placeholder rows
            if (!updated.id || updated.id.toString().startsWith("placeholder-")) {
              const { data: existing } = await supabase
                .from('webinar_tracker')
                .select('id')
                .order('id', { ascending: false })
                .limit(1)
          
              const nextId = (existing?.[0]?.id ?? 0) + 1
          
              const newEntry = {
                id: nextId,
                month: updated.month,
                year: parseInt(selectedYear),
                webinar_title: updated.webinar_title?.trim() || null,
                presenters: updated.presenters?.trim() || null,
                registration_page_views: updated.registration_page_views ?? null,
                registered_participants: updated.registered_participants ?? null,
                attended_participants: updated.attended_participants ?? null,
                duration_planned: updated.duration_planned?.trim() || null,
                actual_run_time: updated.actual_run_time?.trim() || null,
                average_attendance_time: updated.average_attendance_time?.trim() || null,
                event_rating: updated.event_rating ?? null,
              }
          
              const { error: insertError } = await supabase
                .from("webinar_tracker")
                .insert(newEntry)
          
              if (insertError) {
                console.error("Insert failed:", insertError)
                return
              }
          
              setEditModalOpen(false)
              setSelectedWebinar(null)
              return
            }
          
            // ✅ UPDATE for existing rows
            const sanitizedUpdate = {
              webinar_title: updated.webinar_title?.trim() || null,
              presenters: updated.presenters?.trim() || null,
              registration_page_views: updated.registration_page_views ?? null,
              registered_participants: updated.registered_participants ?? null,
              attended_participants: updated.attended_participants ?? null,
              duration_planned: updated.duration_planned?.trim() || null,
              actual_run_time: updated.actual_run_time?.trim() || null,
              average_attendance_time: updated.average_attendance_time?.trim() || null,
              event_rating: updated.event_rating ?? null,
            }
          
            const { error } = await supabase
              .from("webinar_tracker")
              .update(sanitizedUpdate)
              .eq("id", updated.id)
          
            if (!error) {
              setData(prev =>
                prev.map((w) =>
                  w.id === updated.id ? { ...w, ...sanitizedUpdate } : w
                )
              )
              setEditModalOpen(false)
              setSelectedWebinar(null)
            } else {
              console.error("Update failed:", error)
            }
          }}          
        />
      )}
    </div>
  )
}
