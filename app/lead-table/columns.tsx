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

const HEADER_LABEL =
  "min-w-0 truncate text-[11px] font-semibold leading-tight text-zinc-700 dark:text-zinc-300"

function HeaderLabel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className={HEADER_LABEL} title={title ?? (typeof children === "string" ? children : undefined)}>
      {children}
    </span>
  )
}

const FILTER_BTN = "h-5 w-5 shrink-0 p-0"
const FILTER_ICON = "h-3 w-3"
const SORT_ICON = "h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100"

const FilterHeader = ({
  title,
  shortTitle,
  accessor,
  filter,
  setFilter,
  options,
}: {
  title: string;
  shortTitle?: string;
  accessor: keyof Lead;
  filter: string[];
  setFilter: React.Dispatch<React.SetStateAction<string[]>>;
  options: string[];
}) => {
  const unique = React.useMemo(() => {
    if (options && options.length > 0) return options;
    return [];
  }, [options]);

  const [open, setOpen] = React.useState(false);
  const [tempFilter, setTempFilter] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) setTempFilter(filter);
  }, [open, filter]);

  return (
    <div className="flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden">
      <HeaderLabel title={title}>{shortTitle ?? title}</HeaderLabel>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={FILTER_BTN}>
            <ChevronDown className={FILTER_ICON} />
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

/** Compact column widths for the leads table (px). */
const COL_W = {
  select: "w-10 min-w-10 max-w-10",
  status: "w-[118px] min-w-[118px] max-w-[118px]",
  capturedBy: "w-[100px] min-w-[100px] max-w-[100px]",
  contactName: "w-[110px] min-w-[110px] max-w-[110px]",
  email: "w-[130px] min-w-[130px] max-w-[130px]",
  phone: "w-[96px] min-w-[96px] max-w-[96px]",
  mobile: "w-[96px] min-w-[96px] max-w-[96px]",
  company: "w-[110px] min-w-[110px] max-w-[110px]",
  address: "w-[110px] min-w-[110px] max-w-[110px]",
  region: "w-[88px] min-w-[88px] max-w-[88px]",
  leadSource: "w-[88px] min-w-[88px] max-w-[88px]",
  firstContact: "w-[84px] min-w-[84px] max-w-[84px]",
  lastContact: "w-[84px] min-w-[84px] max-w-[84px]",
  service: "w-[96px] min-w-[96px] max-w-[96px]",
  mode: "w-[88px] min-w-[88px] max-w-[88px]",
  price: "w-[80px] min-w-[80px] max-w-[80px]",
  notes: "w-[110px] min-w-[110px] max-w-[110px]",
  createdAt: "w-[84px] min-w-[84px] max-w-[84px]",
} as const

function TruncatedText({
  value,
  className = "",
}: {
  value?: string | null
  className?: string
}) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <div className={`truncate text-sm ${className}`} title={value}>
      {value}
    </div>
  )
}

export const getColumns = ({
  capturedByFilter,
  setCapturedByFilter,
  capturedByOptions,
  statusFilter,
  setStatusFilter,
  statusOptions,
  regionFilter,
  setRegionFilter,
  regionOptions,
  serviceFilter,
  setServiceFilter,
  serviceOptions,
  modeOfServiceFilter,
  setModeOfServiceFilter,
  modeOfServiceOptions,
  leadSourceFilter,
  setLeadSourceFilter,
  leadSourceOptions,
  firstContactFilter,
  setFirstContactFilter,
  firstContactOptions,
}: {
  statusFilter: string[];
  setStatusFilter: React.Dispatch<React.SetStateAction<string[]>>;
  statusOptions: string[];
  capturedByFilter: string[];
  setCapturedByFilter: React.Dispatch<React.SetStateAction<string[]>>;
  capturedByOptions: string[];
  regionFilter: string[];
  setRegionFilter: React.Dispatch<React.SetStateAction<string[]>>;
  regionOptions: string[];
  serviceFilter: string[];
  setServiceFilter: React.Dispatch<React.SetStateAction<string[]>>;
  serviceOptions: string[];
  modeOfServiceFilter: string[];
  setModeOfServiceFilter: React.Dispatch<React.SetStateAction<string[]>>;
  modeOfServiceOptions: string[];
  leadSourceFilter: string[];
  setLeadSourceFilter: React.Dispatch<React.SetStateAction<string[]>>;
  leadSourceOptions: string[];
  firstContactFilter: string[];
  setFirstContactFilter: React.Dispatch<React.SetStateAction<string[]>>;
  firstContactOptions: string[];
}): ColumnDef<Lead>[] => [

    {
      id: "select",
      meta: { thClass: COL_W.select },
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
      meta: { thClass: COL_W.status },
      header: function StatusHeader({ column }: { column: any }) {
        const setFilter = setStatusFilter;

        const unique = React.useMemo(() => {
          const set = new Set<string>(statusOptions);

          // Keep blanks at top
          const blanks = set.has("(Blanks)") ? ["(Blanks)"] : [];

          const ordered = STATUS_ORDER.filter((s) => set.has(s));
          const leftovers = Array.from(set).filter(
            (s) => !STATUS_ORDER.includes(s) && s !== "(Blanks)"
          );

          return [...blanks, ...ordered, ...leftovers];
        }, [statusOptions]);
        const [open, setOpen] = React.useState(false);
        const [tempFilter, setTempFilter] = React.useState<string[]>([]);

        React.useEffect(() => {
          if (open) setTempFilter(statusFilter);
        }, [open, statusFilter]);

        return (
          <div className="flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden">
            <HeaderLabel title="Status">Status</HeaderLabel>
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={FILTER_BTN}>
                  <ChevronDown className={FILTER_ICON} />
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
              className={`${SORT_ICON} cursor-pointer`}
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
          <div className="flex items-center max-w-full overflow-hidden">
            <span className={`inline-flex items-center max-w-full truncate px-2 py-0.5 text-xs rounded-full font-medium ${badge?.className || "bg-gray-400 text-white"}`}>
              {badge?.icon}
              <span className="truncate">{badge?.label || status || "—"}</span>
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "captured_by",
      meta: { thClass: COL_W.capturedBy },
      header: function CapturedByHeader({ column, table }) {
        const unique = React.useMemo(() => {
          return capturedByOptions;
        }, [capturedByOptions]);

        const [open, setOpen] = React.useState(false);
        const [tempFilter, setTempFilter] = React.useState<string[]>([]);

        React.useEffect(() => {
          if (open) setTempFilter(capturedByFilter);
        }, [open, capturedByFilter]);

        return (
          <div className="flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden">
            <HeaderLabel title="Captured By">Captured</HeaderLabel>
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={FILTER_BTN}>
                  <ChevronDown className={FILTER_ICON} />
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
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("captured_by") as string} />
      ),
    }
    ,
    {
      accessorKey: "contact_name",
      meta: { thClass: COL_W.contactName },
      header: ({ column }) => (
        <div
          className="group flex min-w-0 max-w-full cursor-pointer items-center gap-0.5 overflow-hidden"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <HeaderLabel title="Contact Name">Contact</HeaderLabel>
          <ArrowUpDown className={`${SORT_ICON} transition-opacity`} />
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("contact_name") as string} />
      ),
    },
    {
      accessorKey: "email",
      meta: { thClass: COL_W.email },
      header: () => <HeaderLabel>Email</HeaderLabel>,
      cell: ({ row }) => (
        <TruncatedText
          value={(row.getValue("email") as string)?.toLowerCase()}
          className="lowercase font-mono text-xs"
        />
      ),
    },
    {
      accessorKey: "phone",
      meta: { thClass: COL_W.phone },
      header: () => <HeaderLabel>Phone</HeaderLabel>,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("phone") as string} className="text-xs" />
      ),
    },
    {
      accessorKey: "mobile",
      meta: { thClass: COL_W.mobile },
      header: () => <HeaderLabel>Mobile</HeaderLabel>,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("mobile") as string} className="text-xs" />
      ),
    },
    {
      accessorKey: "company",
      meta: { thClass: COL_W.company },
      header: () => <HeaderLabel>Company</HeaderLabel>,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("company") as string} />
      ),
    },
    {
      accessorKey: "service_product",
      meta: { thClass: COL_W.service },
      header: ({ column, table }) =>
        FilterHeader({
          title: "Service",
          accessor: "service_product",
          filter: serviceFilter,
          setFilter: setServiceFilter,
          options: serviceOptions,
        }),
      enableSorting: true,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("service_product") as string} className="text-xs" />
      ),
    },
    {
      accessorKey: "mode_of_service",
      meta: { thClass: COL_W.mode },
      header: ({ column, table }) =>
        FilterHeader({
          title: "Mode of Service",
          shortTitle: "Mode",
          accessor: "mode_of_service",
          filter: modeOfServiceFilter,
          setFilter: setModeOfServiceFilter,
          options: modeOfServiceOptions,
        }),
      enableSorting: true,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("mode_of_service") as string} className="text-xs" />
      ),
    },
    {
      accessorKey: "service_price",
      meta: { thClass: COL_W.price },
      header: () => <HeaderLabel title="Service Price">Price</HeaderLabel>,
      cell: ({ row }) => {
        const val = row.getValue("service_price")
        const num = typeof val === "number" ? val : parseFloat(val as string)
        return (
          <span className="text-xs whitespace-nowrap tabular-nums">
            {isNaN(num) ? "—" : `₱${num.toFixed(2)}`}
          </span>
        )
      },
    },
    {
      accessorKey: "first_contact",
      meta: { thClass: COL_W.firstContact },
      header: ({ column, table }) =>
        FilterHeader({
          title: "First Contact",
          shortTitle: "1st Cntct",
          accessor: "first_contact",
          filter: firstContactFilter,
          setFilter: setFirstContactFilter,
          options: firstContactOptions,
        }),
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue("first_contact")
        return (
          <span className="text-xs whitespace-nowrap">
            {date ? new Date(date as string).toLocaleDateString() : "—"}
          </span>
        )
      },
    },
    {
      accessorKey: "last_contact",
      meta: { thClass: COL_W.lastContact },
      header: ({ column }) => (
        <div
          className="group flex min-w-0 max-w-full cursor-pointer items-center gap-0.5 overflow-hidden"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <HeaderLabel title="Last Contact">Last Cntct</HeaderLabel>
          <ArrowUpDown className={`${SORT_ICON} transition-opacity`} />
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue("last_contact")
        return (
          <span className="text-xs whitespace-nowrap">
            {date ? new Date(date as string).toLocaleDateString() : "—"}
          </span>
        )
      },
    },
    {
      accessorKey: "region",
      meta: { thClass: COL_W.region },
      header: ({ column, table }) =>
        FilterHeader({
          title: "Region",
          accessor: "region",
          filter: regionFilter,
          setFilter: setRegionFilter,
          options: regionOptions,
        }),
      enableSorting: true,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("region") as string} className="text-xs" />
      ),
    },
    {
      accessorKey: "lead_source",
      meta: { thClass: COL_W.leadSource },
      header: ({ column, table }) =>
        FilterHeader({
          title: "Lead Source",
          shortTitle: "Source",
          accessor: "lead_source",
          filter: leadSourceFilter,
          setFilter: setLeadSourceFilter,
          options: leadSourceOptions,
        }),
      enableSorting: true,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("lead_source") as string} className="text-xs" />
      ),
    },
    {
      accessorKey: "address",
      meta: { thClass: COL_W.address },
      header: () => <HeaderLabel>Address</HeaderLabel>,
      cell: ({ row }) => (
        <TruncatedText value={row.getValue("address") as string} />
      ),
    },
    {
      accessorKey: "notes",
      meta: { thClass: COL_W.notes },
      header: () => <HeaderLabel>Notes</HeaderLabel>,
      cell: ({ row }) => {
        const notes = row.getValue("notes") as string
        if (!notes) return <span className="text-muted-foreground">—</span>
        return (
          <span className="line-clamp-2 text-xs leading-snug overflow-hidden block" title={notes}>
            {notes}
          </span>
        )
      },
    },
    {
      accessorKey: "created_at",
      meta: { thClass: COL_W.createdAt },
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="group flex min-w-0 max-w-full items-center gap-0.5 overflow-hidden hover:bg-transparent"
        >
          <HeaderLabel title="Created At">Created</HeaderLabel>
          <ArrowUpDown className={SORT_ICON} />
        </button>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue("created_at")
        return (
          <span className="text-xs whitespace-nowrap">
            {date ? new Date(date as string).toLocaleDateString() : "—"}
          </span>
        )
      },
    },
  ]
