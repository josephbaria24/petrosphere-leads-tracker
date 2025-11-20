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
  ColumnDef,
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
} from "@/components/ui/alert-dialog"

import { 
  ChevronDown, 
  Search, 
  Users, 
  Eye, 
  Trash2, 
  Database, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  CheckCircle,
  Loader,
  Handshake,
  UserPlus,
  FileText,
  MessageCircle,
  BadgeCheck,
  XCircle,
} from "lucide-react"
import EditLeadModal from "@/components/EditLeadModal"
import { supabase } from "@/lib/supabase"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

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

// Define the exact order you want
const STATUS_ORDER = [
  "Lead In",
  "Contact Made",
  "Needs Defined",
  "Proposal Sent",
  "Negotiation Started",
  "For Follow up",
  "Closed Win",
  "Closed Lost",
];

const FilterHeader = ({
  title,
  accessor,
  filter,
  setFilter,
  table,
}: {
  title: string;
  accessor: keyof Lead;
  filter: string[];
  setFilter: React.Dispatch<React.SetStateAction<string[]>>;
  table: any;
}) => {
  const allRows = table.options.data as Lead[];
  const unique = React.useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((row) => set.add(String(row[accessor] ?? "(Blanks)")));
    return Array.from(set);
  }, [allRows]);

  const [open, setOpen] = React.useState(false);
  const [tempFilter, setTempFilter] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) setTempFilter(filter);
  }, [open, filter]);

  return (
    <div className="flex items-center gap-2">
      {title}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
  
        <DropdownMenuContent className="p-0 w-56">
          <div className="max-h-72 overflow-y-auto p-2 space-y-1">
            <DropdownMenuCheckboxItem
              checked={tempFilter.length === 0}
              onSelect={(e) => {
                e.preventDefault();
                if (tempFilter.length === 0) setTempFilter(unique);
                else setTempFilter([]);
              }}
            >
              Select All
            </DropdownMenuCheckboxItem>
  
            {unique.map((value) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={tempFilter.includes(value)}
                onSelect={(e) => {
                  e.preventDefault();
                  setTempFilter((prev) =>
                    prev.includes(value)
                      ? prev.filter((v) => v !== value)
                      : [...prev, value]
                  );
                }}
              >
                {value}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
  
          <div className="sticky bottom-0 bg-white dark:bg-transparent border-t border-gray-200 p-2">
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setFilter(tempFilter);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function DataTablePage() {
  const router = useRouter()
  const session = useSession()
  const [loading, setLoading] = useState(true)

  // Auth state
  const [isReady, setIsReady] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [capturedByFilter, setCapturedByFilter] = useState<string[]>([])
  const [regionFilter, setRegionFilter] = useState<string[]>([])
  const [serviceFilter, setServiceFilter] = useState<string[]>([])
  const [modeOfServiceFilter, setModeOfServiceFilter] = useState<string[]>([])
  const [leadSourceFilter, setLeadSourceFilter] = useState<string[]>([])
  
  // Table state
  const [data, setData] = React.useState<Lead[]>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pageSize, setPageSize] = React.useState(10)
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
      setLoading(true)
      const allLeads: Lead[] = []
      let from = 0
      const limit = 1000
      let done = false

      while (!done) {
        const { data, error } = await supabase
          .from("pdn_leads")
          .select("*")
          .order("created_at", { ascending: false })
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
      setLoading(false)
    }

    fetchAllLeads()
  }, [])

  // Apply filters
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

  const getColumns = ({
    capturedByFilter,
    setCapturedByFilter,
    statusFilter,
    setStatusFilter,
    regionFilter,
    setRegionFilter,
    serviceFilter,
    setServiceFilter,
    modeOfServiceFilter,
    setModeOfServiceFilter,
    leadSourceFilter,
    setLeadSourceFilter,
  }: {
    statusFilter: string[];
    setStatusFilter: React.Dispatch<React.SetStateAction<string[]>>;
    capturedByFilter: string[];
    setCapturedByFilter: React.Dispatch<React.SetStateAction<string[]>>;
    regionFilter: string[];
    setRegionFilter: React.Dispatch<React.SetStateAction<string[]>>;
    serviceFilter: string[];
    setServiceFilter: React.Dispatch<React.SetStateAction<string[]>>;
    modeOfServiceFilter: string[];
    setModeOfServiceFilter: React.Dispatch<React.SetStateAction<string[]>>;
    leadSourceFilter: string[];
    setLeadSourceFilter: React.Dispatch<React.SetStateAction<string[]>>;
  }): ColumnDef<Lead>[] => [
    
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
      header: function StatusHeader({ column, table }: { column: any, table: any }) {
        const setFilter = setStatusFilter;
        const allRows = table.options.data as Lead[];

        const unique = React.useMemo(() => {
          const set = new Set<string>();
          allRows.forEach((row) => set.add(row.status || "(Blanks)"));
        
          const blanks = set.has("(Blanks)") ? ["(Blanks)"] : [];
        
          const ordered = STATUS_ORDER.filter((s) => set.has(s));
          const leftovers = Array.from(set).filter(
            (s) => !STATUS_ORDER.includes(s) && s !== "(Blanks)"
          );
        
          return [...blanks, ...ordered, ...leftovers];
        }, [allRows]);
        const [open, setOpen] = React.useState(false);
        const [tempFilter, setTempFilter] = React.useState<string[]>([]);

        React.useEffect(() => {
          if (open) setTempFilter(statusFilter);
        }, [open]);

        return (
          <div className="flex items-center gap-2">
            Status
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="p-0 w-56">
                <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={tempFilter.length === 0}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (tempFilter.length === 0) setTempFilter(unique);
                      else setTempFilter([]);
                    }}
                  >
                    Select All
                  </DropdownMenuCheckboxItem>

                  {unique.map((value) => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={tempFilter.includes(value)}
                      onSelect={(e) => {
                        e.preventDefault();
                        setTempFilter((prev) =>
                          prev.includes(value)
                            ? prev.filter((v) => v !== value)
                            : [...prev, value]
                        );
                      }}
                    >
                      {value}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>

                <div className="sticky bottom-0 bg-white border-t dark:bg-transparent border-gray-200 p-2 z-10">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFilter(tempFilter);
                      setOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </DropdownMenuContent>

            </DropdownMenu>
            <ArrowUpDown
              className="ml-1 h-4 w-4 text-muted-foreground opacity-50 hover:opacity-100 cursor-pointer"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
          </div>
        );
      },
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
          "lead in": { label: "Lead In", className: "bg-gray-500 text-white", icon: <UserPlus className="w-3.5 h-3.5 mr-1.5" /> },
          "contact made": { label: "Contact Made", className: "bg-blue-600 text-white", icon: <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> },
          "needs defined": { label: "Needs Defined", className: "bg-yellow-500 text-white", icon: <FileText className="w-3.5 h-3.5 mr-1.5" /> },
          "proposal sent": { label: "Proposal Sent", className: "bg-purple-600 text-white", icon: <FileText className="w-3.5 h-3.5 mr-1.5" /> },
          "negotiation started": { label: "Negotiation Started", className: "bg-orange-500 text-white", icon: <Handshake className="w-3.5 h-3.5 mr-1.5" /> },
          "closed won": { label: "Closed Win", className: "bg-green-600 text-white", icon: <BadgeCheck className="w-3.5 h-3.5 mr-1.5" /> },
          "closed win": { label: "Closed Win", className: "bg-green-600 text-white", icon: <BadgeCheck className="w-3.5 h-3.5 mr-1.5" /> },
          "closed lost": { label: "Closed Lost", className: "bg-red-600 text-white", icon: <XCircle className="w-3.5 h-3.5 mr-1.5" /> },
          "in progress": { label: "In Progress", className: "bg-zinc-800 text-white border border-zinc-700", icon: <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" /> },
          "done": { label: "Done", className: "bg-black text-green-400 border border-green-700", icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" /> },
        }

        const normalized = status?.toLowerCase() || ""
        const badge = statusMap[normalized]

        return (
          <div className="flex items-center">
            <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${badge?.className || "bg-gray-400 text-white"}`}>
              {badge?.icon}
              {badge?.label || status || "—"}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "captured_by",
      header: function CapturedByHeader({ column, table }) {
        const allRows = table.options.data as Lead[];
    
        const unique = React.useMemo(() => {
          const set = new Set<string>();
          allRows.forEach((row) => set.add(row.captured_by || "(Blanks)"));
          return Array.from(set).sort();
        }, [allRows]);
    
        const [open, setOpen] = React.useState(false);
        const [tempFilter, setTempFilter] = React.useState<string[]>([]);
    
        React.useEffect(() => {
          if (open) setTempFilter(capturedByFilter);
        }, [open, capturedByFilter]);
    
        return (
          <div className="flex items-center gap-2">
            Captured By
    
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
    
              <DropdownMenuContent className="p-0 w-56">
                
                <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={tempFilter.length === 0}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (tempFilter.length === 0) {
                        setTempFilter(unique);
                      } else {
                        setTempFilter([]);
                      }
                    }}
                  >
                    Select All
                  </DropdownMenuCheckboxItem>
    
                  {unique.map((value) => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={tempFilter.includes(value)}
                      onSelect={(e) => {
                        e.preventDefault();
                        setTempFilter((prev) =>
                          prev.includes(value)
                            ? prev.filter((v) => v !== value)
                            : [...prev, value]
                        );
                      }}
                    >
                      {value}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
    
                <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700 p-2 z-10">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setCapturedByFilter(tempFilter);
                      setOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: true,
    }
    ,
    {
      accessorKey: "contact_name",
      header: ({ column }) => (
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
      header: ({ column, table }) =>
        FilterHeader({
          title: "Region",
          accessor: "region",
          filter: regionFilter,
          setFilter: setRegionFilter,
          table,
        }),
      enableSorting: true,
    },
    {
      accessorKey: "lead_source",
      header: ({ column, table }) =>
        FilterHeader({
          title: "Lead Source",
          accessor: "lead_source",
          filter: leadSourceFilter,
          setFilter: setLeadSourceFilter,
          table,
        }),
      enableSorting: true,
    },
    {
      accessorKey: "first_contact",
      header: ({ column }) => (
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Contact
          <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "service_product",
      header: ({ column, table }) =>
        FilterHeader({
          title: "Service",
          accessor: "service_product",
          filter: serviceFilter,
          setFilter: setServiceFilter,
          table,
        }),
      enableSorting: true,
    },
    {
      accessorKey: "mode_of_service",
      header: ({ column, table }) =>
        FilterHeader({
          title: "Mode of Service",
          accessor: "mode_of_service",
          filter: modeOfServiceFilter,
          setFilter: setModeOfServiceFilter,
          table,
        }),
      enableSorting: true,
    },
    {
      accessorKey: "service_price",
      header: "Service Price",
      cell: ({ row }) => {
        const val = row.getValue("service_price")
        const num = typeof val === "number" ? val : parseFloat(val as string)
        return isNaN(num) ? "—" : `₱${num.toFixed(2)}`
      },
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
  ];

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

  // Auth check
  useEffect(() => {
    if (session === null) {
      router.replace('/login')
    } else if (session) {
      setIsReady(true)
    }
  }, [session, router])

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">Loading PDN leads data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen rounded-lg bg-card from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-full mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-card backdrop-blur-sm border-0 border-zinc-200/60 dark:border-zinc-700/60 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      href="/dashboard" 
                      className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                    >
                      Manage Lead
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-zinc-400 dark:text-zinc-500" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-zinc-900 dark:text-zinc-100 font-semibold">
                      PDN Leads List
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    PDN Leads Database
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Manage and track all your PDN leads in one place
                  </p>
                </div>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {filteredData.length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Total Leads
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200/50 dark:border-green-700/50">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {table.getFilteredSelectedRowModel().rows.length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Selected
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="border-0 shadow-xl bg-white/95 dark:bg-background backdrop-blur-sm">
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-white">
                  PDN Leads Management
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            {/* Controls Section */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2 border-0 dark:border-zinc-700">
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
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-20 h-9 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-800">
                      {[10, 20, 30, 50, 100, 500, 1000].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>

                  </Select>
                </div>

                {/* Delete Selected */}
                {selectedIds.length > 0 && (
                  <AlertDialog>
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
                          Action Restricted
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400">
                          Deleting leads is restricted for data integrity. Please contact your IT administrator if you need to remove entries.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                          Close
                        </AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* Table Container */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/50">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-900">
                      {headerGroup.headers.map((header) => (
                        <TableHead 
                          key={header.id}
                          className="text-zinc-700 dark:text-zinc-300 font-semibold border-0 last:border-r-0"
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
                    Array.from({ length: 10 }).map((_, i) => (
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
                            className="text-zinc-700 dark:text-zinc-300 border-0 border-zinc-100 dark:border-zinc-800 last:border-r-0"
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

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} results
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
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {selectedLead && (
          <EditLeadModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            lead={selectedLead}
            currentUserName={currentUserName}
            onSave={async (updated: Partial<Lead>) => {
              const { error } = await supabase
                .from("pdn_leads")
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
    </div>
  )
}