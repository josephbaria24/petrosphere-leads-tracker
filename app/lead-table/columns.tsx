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
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
          {/* Scrollable list of filters */}
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
  
          {/* Sticky footer for the apply button */}
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


export const getColumns = ({
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
      
        // Keep blanks at top
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
  {/* Scrollable filter options */}
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

  {/* Sticky footer with Apply button */}
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
              
              {/* Scrollable list */}
              <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                <DropdownMenuCheckboxItem
                  checked={tempFilter.length === 0}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (tempFilter.length === 0) {
                      setTempFilter(unique); // select all
                    } else {
                      setTempFilter([]); // clear all
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
  
              {/* Sticky footer */}
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
]
