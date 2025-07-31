"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Loader, LoaderIcon, LucideLoader, } from "lucide-react"
import {
  CheckCircle,
  Loader2,
  Handshake,
  UserPlus,
  FileText,
  MessageCircle,
  BadgeCheck,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"




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

export const columns: ColumnDef<Lead>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-left group"
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
  
      const statusMap: Record<
        string,
        { label: string; className: string; icon: React.ReactNode }
      > = {
        "lead in": {
          label: "Lead In",
          className: "bg-muted text-white",
          icon: <UserPlus className="w-3.5 h-3.5 mr-1.5" />,
        },
        "contact made": {
          label: "Contact Made",
          className: "bg-blue-600 text-white",
          icon: <MessageCircle className="w-3.5 h-3.5 mr-1.5" />,
        },
        "needs defined": {
          label: "Needs Defined",
          className: "bg-yellow-500 text-white",
          icon: <FileText className="w-3.5 h-3.5 mr-1.5" />,
        },
        "proposal sent": {
          label: "Proposal Sent",
          className: "bg-purple-600 text-white",
          icon: <FileText className="w-3.5 h-3.5 mr-1.5" />,
        },
        "negotiation started": {
          label: "Negotiation Started",
          className: "bg-orange-500 text-white",
          icon: <Handshake className="w-3.5 h-3.5 mr-1.5" />,
        },
        "closed won": {
          label: "Closed Win",
          className: "bg-green-600 text-white",
          icon: <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />,
        },
        "closed win": {
          label: "Closed Win",
          className: "bg-green-600 text-white",
          icon: <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />,
        },
        "closed lost": {
          label: "Closed Lost",
          className: "bg-red-600 text-white",
          icon: <XCircle className="w-3.5 h-3.5 mr-1.5" />,
        },
        "in progress": {
          label: "In Progress",
          className: "bg-zinc-800 text-white border border-zinc-700",
          icon: <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />,
        },
        "done": {
          label: "Done",
          className: "bg-black text-green-400 border border-green-700",
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" />,
        },
      }
  
      const normalized = status?.toLowerCase() || ""
      const badge = statusMap[normalized]
  
      return (
        <div className="flex items-center">
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${
              badge?.className || "bg-gray-400 text-white"
            }`}
          >
            {badge?.icon}
            {badge?.label || status || "—"}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "contact_name",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Contact Name
        <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ),
    enableSorting: true,
  },
  
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "mobile",
    header: "Mobile",
  },
  {
    accessorKey: "company",
    header: "Company",
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "region",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Region
        <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "lead_source",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Lead Source
        <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "first_contact",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        First Contact
        <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "last_contact",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Last Contact
        <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "service_product",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Service
        <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "mode_of_service",
    header: "Mode of Service",
  },
  {
    accessorKey: "service_price",
    header: "Service Price",
    cell: ({ row }) => {
      const val = row.getValue("service_price")
      const num = typeof val === 'number' ? val : parseFloat(val as string)
      return isNaN(num) ? "—" : `₱${num.toFixed(2)}`
    },
  },
  {
    accessorKey: "captured_by",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Captured By
        <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <span className="line-clamp-2 max-h-[3em] overflow-hidden block">
        {row.getValue("notes")}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-left"
      >
        Created At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("created_at")
      return date ? new Date(date as string).toLocaleDateString() : "—"
    },
  },
  
]

export default function DataTableDemo() {

  // Initialize state for global filter and data
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [data, setData] = React.useState<Lead[]>([])


  React.useEffect(() => {
    const fetchAllLeads = async () => {
      let allLeads: Lead[] = []
      let from = 0
      const limit = 1000
      let done = false
    
      while (!done) {
        const { data, error } = await supabase
          .from('crm_leads')
          .select('*')
          .range(from, from + limit - 1)
    
        if (error) {
          console.error('Error fetching leads:', error)
          break
        }
    
        if (data && data.length > 0) {
          allLeads.push(...data)
          from += limit
        }
    
        if (!data || data.length < limit) {
          done = true
        }
      }
    
      setData(allLeads)
    }
    
  
    fetchAllLeads()
  }, [])
  
  
  const [pageSize, setPageSize] = React.useState(10)
  

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: false }
  ])
  
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

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
  React.useEffect(() => {
    table.setPageSize(pageSize)
  }, [pageSize, table])
  
  
  return (
    <div className="w-full">
      <div className="flex items-center py-4">
      <Input
        placeholder="Search leads..."
        value={globalFilter ?? ""}
        onChange={(event) => setGlobalFilter(event.target.value)}
        className="max-w-sm"
      />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
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
    {table.getFilteredSelectedRowModel().rows.length} of{" "}
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

    </div>
  )
}
