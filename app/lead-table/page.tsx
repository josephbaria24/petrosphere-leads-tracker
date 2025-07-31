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
import EditLeadModal from "@/components/EditLeadModal"
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
  const [data, setData] = React.useState<Lead[]>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pageSize, setPageSize] = React.useState(10)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: false },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
  const [editModalOpen, setEditModalOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchAllLeads = async () => {
      const  allLeads: Lead[] = []
      let from = 0
      const limit = 1000
      let done = false

      while (!done) {
        const { data, error } = await supabase
          .from("crm_leads")
          .select("*")
          .range(from, from + limit - 1)

        if (error) {
          console.error("Error fetching leads:", error)
          break
        }

        if (data?.length) {
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

  const table = useReactTable({
    data,
    columns: columns,
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => {
                        setSelectedLead(row.original)
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
      {selectedLead && (
        <EditLeadModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          lead={selectedLead}
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
