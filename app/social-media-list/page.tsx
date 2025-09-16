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

import type { SocialMedia } from "./columns"
import EditSocialMediaModal from "@/components/EditSocialMediaModal"
import { Skeleton } from "@/components/ui/skeleton"

export default function SocialMediaTablePage() {
  const [selectedYear, setSelectedYear] = useState<string>("2025")
  const yearOptions = Array.from({ length: 10 }, (_, i) => String(2023 + i))

  const router = useRouter()
  const session = useSession()
  const [isReady, setIsReady] = useState(false)

  const [data, setData] = useState<SocialMedia[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [pageSize, setPageSize] = useState(20)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const [selectedRow, setSelectedRow] = useState<SocialMedia | null>(null)
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
    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("social_media_tracker")
        .select("*")
        .eq("year", selectedYear)

      if (error) {
        console.error("Error fetching social media tracker:", error)
        return
      }

      const MONTH_ORDER = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ]

      const paddedData = MONTH_ORDER.map((month) => {
        const match = data?.find((row) => row.month === month)
        return match || {
          id: `placeholder-${month}-${selectedYear}`,
          month,
          year: selectedYear,
          post_reach: null,
          post_engagement: null,
          new_page_likes: null,
          new_page_followers: null,
          reactions: null,
          comments: null,
          shares: null,
          photo_views: null,
          link_clicks: null,
          created_at: null,
        }
      })

      setData(paddedData)
      setLoading(false)
    }

    fetchData()
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
                <BreadcrumbPage>Social Media Tracker</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <Separator className="my-4" />
      <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="w-[120px] mr-4">
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
          placeholder="Search..."
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

                    setSelectedRow(row.original)
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

      {selectedRow && (
        <EditSocialMediaModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          rowData={selectedRow}
          currentUserName={currentUserName}
        />
      )}
    </div>
  )
}
