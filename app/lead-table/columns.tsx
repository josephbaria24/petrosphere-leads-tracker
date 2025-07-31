// columns.tsx
import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export type Lead = {
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
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
      const num = typeof val === "number" ? val : parseFloat(val as string)
      return isNaN(num) ? "—" : `₱${num.toFixed(2)}`
    },
  },
  {
    accessorKey: "captured_by",
    header: ({ column }) => (
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
