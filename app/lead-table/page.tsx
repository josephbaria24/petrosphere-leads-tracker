"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
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

import { ChevronDown } from "lucide-react"
import EditLeadModal from "@/components/EditLeadModal"
import { supabase } from "@/lib/supabase"
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
import { useSession } from '@supabase/auth-helpers-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@radix-ui/react-separator"

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
  const session = useSession()
  const [loading, setLoading] = useState(true)


  // 🔐 Redirect if not logged in
  const [isReady, setIsReady] = useState(false)

  // 🧩 Filters
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [capturedByFilter, setCapturedByFilter] = useState<string[]>([])
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [modeOfServiceFilter, setModeOfServiceFilter] = useState<string[]>([]);
  const [leadSourceFilter, setLeadSourceFilter] = useState<string[]>([]);
  
   
  // Define the Lead type based on your database schema
  const [data, setData] = React.useState<Lead[]>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pageSize, setPageSize] = React.useState(10)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [currentUserName, setCurrentUserName] = useState<string>('Unknown');


  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;
  
      const { data: profile } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
  
      if (profile?.full_name) {
        setCurrentUserName(profile.full_name);
      }
    };
  
    fetchCurrentUserProfile();
  }, []);

  React.useEffect(() => {
    const fetchAllLeads = async () => {
      setLoading(true) // ⬅ st
      const  allLeads: Lead[] = []
      let from = 0
      const limit = 1000
      let done = false

      while (!done) {
        const { data, error } = await supabase
          .from("crm_leads")
          .select("*")
          .order("created_at", { ascending: false }) // 🟢 newest first
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
      setLoading(false) // ⬅ 
    }

    fetchAllLeads()
  }, [])

  
  // 🔽 Apply BOTH filters (status + capturedBy)
  const filteredData = React.useMemo(() => {
    let result = data

    if (statusFilter.length > 0) {
      result = result.filter((row) =>
        statusFilter.includes(row.status || "(Blanks)")
      )
    }

    if (capturedByFilter.length > 0) {
      result = result.filter((row) =>
        capturedByFilter.includes(row.captured_by || "(Blanks)")
      )
    }
    if (regionFilter.length > 0) {
  result = result.filter((row) =>
    regionFilter.includes(row.region || "(Blanks)")
  );
}
if (serviceFilter.length > 0) {
  result = result.filter((row) =>
    serviceFilter.includes(row.service_product || "(Blanks)")
  );
}
if (modeOfServiceFilter.length > 0) {
  result = result.filter((row) =>
    modeOfServiceFilter.includes(row.mode_of_service || "(Blanks)")
  );
}
if (leadSourceFilter.length > 0) {
  result = result.filter((row) =>
    leadSourceFilter.includes(row.lead_source || "(Blanks)")
  );
}


return result;
}, [
  data,
  statusFilter,
  capturedByFilter,
  regionFilter,
  serviceFilter,
  modeOfServiceFilter,
  leadSourceFilter,
]);

  const table = useReactTable({
    data: filteredData,
    columns: getColumns({
      capturedByFilter, setCapturedByFilter,
      statusFilter, setStatusFilter,
      regionFilter, setRegionFilter,
      serviceFilter, setServiceFilter,
      modeOfServiceFilter, setModeOfServiceFilter,
      leadSourceFilter, setLeadSourceFilter
    }),
    
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
  const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id)


  React.useEffect(() => {
    table.setPageSize(pageSize)
  }, [pageSize, table])



   // 🔐 Redirect if not logged in
   useEffect(() => {
    if (session === null) {
      router.replace('/login')
    } else if (session) {
      setIsReady(true)
    }
  }, [session, router])

  if (!isReady) {
    return <div className="p-10 text-center">Loading...</div> // Optional spinner
  }

  

  return (
    <div className="w-full">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 pl-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Manage Lead</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Leads List</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
      <Separator className="my-4" />

      {/* Main content */}
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
                  onSelect={(e) => {
                    e.preventDefault(); // 🛑 Prevent dropdown from closing
                    column.toggleVisibility(!column.getIsVisible());
                  }}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="px-2 flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[80px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[10, 20, 30, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
    Array.from({ length: 10 }).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        {table.getAllColumns().map((col, idx) => (
          <TableCell key={idx}>
            <Skeleton className="h-4 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ))
  ) :table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="cursor-pointer hover:bg-muted"
                      onClick={(e) => {
                        // 🛑 Prevent triggering modal when clicking checkbox
                        const isCheckbox = (e.target as HTMLElement).closest('button, input[type="checkbox"]')
                        if (isCheckbox) return

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
                  colSpan={getColumns.length}
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
        {selectedIds.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete Selected
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Action Restricted</AlertDialogTitle>
              <AlertDialogDescription>
                Deleting leads is restricted. Please contact your IT administrator if you need to remove an entry.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}


      </div>
      {selectedLead && (
        <EditLeadModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          lead={selectedLead}
          currentUserName={currentUserName} // ✅ Pass the user
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


