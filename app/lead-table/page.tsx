//app\lead-table\page.tsx
"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getPaginationRowModel,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

import { ChevronDown, Search, Eye, Trash2, Database, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react"
import EditLeadModal from "@/components/EditLeadModal"
import { supabase } from "@/lib/supabase-client"
import { getColumns } from "./columns"
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
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ExcelActions } from "@/components/leads/ExcelActions"
import { cn } from "@/lib/utils"
import { formatUnknownError, logSupabaseError } from "@/lib/format-error"

type LeadTableColumnMeta = { thClass?: string }

function columnWidthClass(meta: unknown): string {
  return (meta as LeadTableColumnMeta | undefined)?.thClass ?? ""
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

type Lead = {
  id: string
  contact_name: string
  email: string
  phone?: string
  mobile?: string
  company?: string
  address?: string
  status?: string
  region?: string
  service_product?: string
  mode_of_service?: string
  service_price?: number
  lead_source?: string
  first_contact?: string
  last_contact?: string
  captured_by?: string
  notes?: string
  created_at?: string
}

export default function DataTablePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)


  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [capturedByFilter, setCapturedByFilter] = useState<string[]>([])
  const [regionFilter, setRegionFilter] = useState<string[]>([])
  const [serviceFilter, setServiceFilter] = useState<string[]>([])
  const [modeOfServiceFilter, setModeOfServiceFilter] = useState<string[]>([])
  const [leadSourceFilter, setLeadSourceFilter] = useState<string[]>([])
  const [firstContactFilter, setFirstContactFilter] = useState<string[]>([])

  // Table state
  const [data, setData] = React.useState<Lead[]>([])

  // Cursor Pagination State
  // cursors: Stack of 'start' cursors for previous pages.
  // Each cursor is { created_at: string, id: string } or null (for first page)
  const [cursors, setCursors] = useState<Array<{ created_at: string, id: string } | null>>([])

  // currentCursor: The cursor used to fetch the CURRENT page. 
  // null = First Page.
  const [currentCursor, setCurrentCursor] = useState<{ created_at: string, id: string } | null>(null)

  // For "Next" button availability, ideally we fetch pageSize + 1 to know if there's more.
  const [hasMore, setHasMore] = useState(false)

  const [globalFilter, setGlobalFilter] = React.useState("")
  const debouncedGlobalFilter = useDebounce(globalFilter, 300)

  const [pageSize, setPageSize] = useState(20)

  // We enforce sorting by Created At for cursor pagination
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // Modal state
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [currentUserName, setCurrentUserName] = useState<string>('Unknown')
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter Options State
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [capturedByOptions, setCapturedByOptions] = useState<string[]>([])
  const [regionOptions, setRegionOptions] = useState<string[]>([])
  const [serviceOptions, setServiceOptions] = useState<string[]>([])
  const [modeOfServiceOptions, setModeOfServiceOptions] = useState<string[]>([])
  const [leadSourceOptions, setLeadSourceOptions] = useState<string[]>([])
  const [firstContactOptions, setFirstContactOptions] = useState<string[]>([])

  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.full_name) {
        setCurrentUserName(profile.full_name);
      }
    };

    fetchCurrentUserProfile();
  }, []);

  // Fetch unique options for filters
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const [
          { data: statuses },
          { data: regions },
          { data: sources },
          { data: capturedBy },
          { data: services },
        ] = await Promise.all([
          supabase.from('lead_statuses').select('name').order('name'),
          supabase.from('regions').select('name').order('name'),
          supabase.from('lead_sources').select('name').order('name'),
          supabase.from('captured_by_settings').select('name').order('name'),
          supabase.from('services').select('name').order('name'),
        ])

        if (statuses) setStatusOptions(statuses.map(s => s.name))
        if (regions) setRegionOptions(regions.map(r => r.name))
        if (sources) setLeadSourceOptions(sources.map(s => s.name))
        if (capturedBy) setCapturedByOptions(capturedBy.map(c => c.name))
        if (services) setServiceOptions(services.map(s => s.name))

        // Mode of service is usually static but we can also get unique from data if needed
        // For now using the static ones from add-new-leads
        setModeOfServiceOptions(['Face to Face', 'E-learning', 'Online'])

        // Fetch First Contact months and years
        const { data: contactDates } = await supabase
          .from('crm_leads')
          .select('first_contact')
          .not('first_contact', 'is', null)

        if (contactDates) {
          const uniqueMonths = new Set<string>()
          contactDates.forEach(d => {
            const date = new Date(d.first_contact)
            if (!isNaN(date.getTime())) {
              const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' })
              uniqueMonths.add(monthLabel)
            }
          })
          // Sort months chronologically
          const sortedMonths = Array.from(uniqueMonths).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime() // Newest first
          })
          setFirstContactOptions(sortedMonths)
        }

      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      }
    }
    fetchFilterOptions()
  }, [])

  const fetchLeads = async (cursor: { created_at: string, id: string } | null = currentCursor) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // We fetch pageSize + 1 to check if there is a next page
      let query = supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize + 1)

      // Apply Cursor Filter
      if (cursor) {
        const ts = cursor.created_at.replace(/"/g, '\\"')
        query = query.or(
          `created_at.lt."${ts}",and(created_at.eq."${ts}",id.lt.${cursor.id})`
        )
      }

      // Global Filter (Search)
      if (debouncedGlobalFilter) {
        query = query.or(`contact_name.ilike.%${debouncedGlobalFilter}%,company.ilike.%${debouncedGlobalFilter}%,email.ilike.%${debouncedGlobalFilter}%,phone.ilike.%${debouncedGlobalFilter}%`)
      }

      // Column Filters
      if (statusFilter.length > 0) query = query.in('status', statusFilter)
      if (capturedByFilter.length > 0) query = query.in('captured_by', capturedByFilter)
      if (regionFilter.length > 0) query = query.in('region', regionFilter)
      if (serviceFilter.length > 0) query = query.in('service_product', serviceFilter)
      if (modeOfServiceFilter.length > 0) query = query.in('mode_of_service', modeOfServiceFilter)
      if (leadSourceFilter.length > 0) query = query.in('lead_source', leadSourceFilter)

      // First Contact Filter by Month/Year
      if (firstContactFilter.length > 0) {
        const filters = firstContactFilter.map(label => {
          const date = new Date(label);
          const year = date.getFullYear();
          const month = date.getMonth();
          const startDate = new Date(year, month, 1).toISOString().split('T')[0];
          const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
          return `and(first_contact.gte.${startDate},first_contact.lte.${endDate})`;
        });
        query = query.or(filters.join(','));
      }

      const { data: fetchedData, error } = await query

      if (error) {
        logSupabaseError('fetchLeads', error)
        toast.error(formatUnknownError(error) || 'Failed to fetch leads')
        return
      }

      if (fetchedData) {
        // Check if we have more than pageSize
        const hasNextPage = fetchedData.length > pageSize
        setHasMore(hasNextPage)

        // If we fetched an extra row, remove it from the display data
        const displayData = hasNextPage ? fetchedData.slice(0, pageSize) : fetchedData
        setData(displayData)
      } else {
        setData([])
        setHasMore(false)
      }

    } catch (error) {
      logSupabaseError('fetchLeads', error)
      toast.error(formatUnknownError(error) || 'Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  // Refetch when filters change — wait until auth session is available
  useEffect(() => {
    let cancelled = false

    const resetAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      setCursors([])
      setCurrentCursor(null)
      fetchLeads(null)
    }

    resetAndFetch()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || !session) return
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        resetAndFetch()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [
    debouncedGlobalFilter,
    statusFilter,
    capturedByFilter,
    regionFilter,
    serviceFilter,
    modeOfServiceFilter,
    leadSourceFilter,
    firstContactFilter,
    pageSize,
  ])

  const handleNextPage = () => {
    if (!hasMore || data.length === 0) return

    const lastItem = data[data.length - 1]
    if (!lastItem.created_at) return // Should not happen with valid data

    const nextCursor = { created_at: lastItem.created_at, id: lastItem.id }

    // Push CURRENT start cursor to stack
    setCursors(prev => [...prev, currentCursor])
    // Set NEW cursor
    setCurrentCursor(nextCursor)
    // Fetch
    fetchLeads(nextCursor)
  }

  const handlePreviousPage = () => {
    if (cursors.length === 0) return

    // Pop the last cursor from stack
    const newCursors = [...cursors]
    const prevCursor = newCursors.pop() || null // This is the start cursor of the previous page

    setCursors(newCursors)
    setCurrentCursor(prevCursor)
    fetchLeads(prevCursor)
  }


  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
        },
        (payload) => {
          // On any change, refetch to keep table strictly in sync with server state
          // For a more optimized approach, we could manually update 'data' state for some events
          fetchLeads(currentCursor)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    // Re-subscribe if filter criteria changes to ensure we are watching relevant slice? 
    // Actually we just want to know if *any* lead changed, then re-run our fetch query.
    // So we don't strictly need dependencies here unless we want to debounce re-fetches.
    // So we don't strictly need dependencies here unless we want to debounce re-fetches.
    currentCursor, pageSize, debouncedGlobalFilter, statusFilter, capturedByFilter, regionFilter, serviceFilter, modeOfServiceFilter, leadSourceFilter, firstContactFilter
  ])


  const refreshData = () => {
    // Reset to first page
    setCursors([])
    setCurrentCursor(null)
    fetchLeads(null)
  }



  const deleteSelectedLeads = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .in('id', selectedIds)

      if (error) throw error

      toast.success(`Successfully deleted ${selectedIds.length} leads`)
      setDeleteConfirmation("")
      setRowSelection({})

      // If deleting wipes out the current page, we might want to go back?
      // For simplicity, just refetch current cursor
      fetchLeads(currentCursor)
    } catch (error) {
      console.error('Error deleting leads:', error)
      toast.error('Failed to delete leads')
    } finally {
      setIsDeleting(false)
    }
  }

  const table = useReactTable({
    data,
    columns: getColumns({
      capturedByFilter, setCapturedByFilter, capturedByOptions,
      statusFilter, setStatusFilter, statusOptions,
      regionFilter, setRegionFilter, regionOptions,
      serviceFilter, setServiceFilter, serviceOptions,
      modeOfServiceFilter, setModeOfServiceFilter, modeOfServiceOptions,
      leadSourceFilter, setLeadSourceFilter, leadSourceOptions,
      firstContactFilter, setFirstContactFilter, firstContactOptions
    }),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    // pageCount: -1, // Infinite/Cursor
    getCoreRowModel: getCoreRowModel(),
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

  const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id)

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-background">
      {/* Compact header */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/dashboard"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium"
                >
                  Manage Lead
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-zinc-400 dark:text-zinc-500" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-zinc-900 dark:text-zinc-100 text-sm font-semibold">
                  Leads List
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            Leads Database
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <span>
            <span className="font-semibold text-blue-700 dark:text-blue-300 tabular-nums">{data.length}</span> on page
          </span>
          <span>
            <span className="font-semibold text-green-700 dark:text-green-300 tabular-nums">
              {table.getFilteredSelectedRowModel().rows.length}
            </span> selected
          </span>
        </div>
      </div>

      {/* Table workspace */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden px-2 py-2">
        {/* Controls */}
        <div className="shrink-0 flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between mb-2">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Search leads..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-10 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 focus:border-blue-600 dark:focus:border-blue-700"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Column Visibility */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Columns
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                  >
                    {table.getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize hover:bg-zinc-50 dark:hover:bg-zinc-700"
                          checked={column.getIsVisible()}
                          onSelect={(e) => {
                            e.preventDefault()
                            column.toggleVisibility(!column.getIsVisible())
                          }}
                        >
                          {column.id.replace(/_/g, ' ')}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Page Size */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Rows:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger className="w-20 h-9 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-800">
                      {[10, 20, 50, 100, 200, 500].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>

                  </Select>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>

                <ExcelActions showImport={false} onImportSuccess={refreshData} />

                {/* Delete Selected */}
                {selectedIds.length > 0 && (
                  <AlertDialog onOpenChange={() => setDeleteConfirmation("")}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedIds.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-900 dark:text-white">
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="text-zinc-600 dark:text-zinc-400 space-y-3">
                            <p>
                              This action cannot be undone. This will permanently delete
                              <span className="font-semibold text-red-600 dark:text-red-400"> {selectedIds.length} </span>
                              selected leads.
                            </p>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                Type <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded">Delete this lead</span> to confirm:
                              </p>
                              <Input
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                className="bg-white dark:bg-zinc-900"
                                placeholder="Delete this lead"
                              />
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          disabled={isDeleting}
                          className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deleteConfirmation !== "Delete this lead" || isDeleting}
                          onClick={(e) => {
                            e.preventDefault()
                            deleteSelectedLeads()
                          }}
                          className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* Table Container */}
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
              <div className="flex-1 min-h-0 overflow-auto">
                <Table containerClassName="overflow-visible" className="w-max min-w-full table-fixed">
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-900">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "overflow-hidden px-1.5 py-1.5 text-[11px] font-semibold border-0 last:border-r-0",
                            columnWidthClass(header.column.columnDef.meta)
                          )}
                        >
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
                    Array.from({ length: pageSize }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        {table.getAllColumns().map((col, idx) => (
                          <TableCell key={idx} className="border-0">
                            <Skeleton className="h-4 w-full bg-zinc-200 dark:bg-zinc-700" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800"
                        onClick={(e) => {
                          const isCheckbox = (e.target as HTMLElement).closest('button, input[type="checkbox"]')
                          if (isCheckbox) return

                          setSelectedLead(row.original)
                          setEditModalOpen(true)
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "overflow-hidden px-1.5 py-1.5 border-0 last:border-r-0",
                              columnWidthClass(cell.column.columnDef.meta)
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getAllColumns().length}
                        className="h-32 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <Database className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
                          <p className="text-lg font-medium">No leads found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Showing {table.getRowModel().rows.length} results
                {table.getFilteredSelectedRowModel().rows.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {table.getFilteredSelectedRowModel().rows.length} selected
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={cursors.length === 0 || loading}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore || loading}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
      </div>

        {/* Edit Modal */}
        {selectedLead && (
          <EditLeadModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            lead={selectedLead}
            currentUserName={currentUserName}
            onSave={async (updated: Partial<Lead>) => {
              const { error } = await supabase
                .from("crm_leads")
                .update(updated)
                .eq("id", updated.id)

              if (!error) {
                setData(prev =>
                  prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
                )
                setEditModalOpen(false)
                setSelectedLead(null)
              } else {
                console.error(error)
              }
            }}
          />
        )}
    </div>
  )
}