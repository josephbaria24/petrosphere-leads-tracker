// columns.tsx
import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export type Webinar = {
    id: string
    month: string
    year: string
    registration_page_views: number | null
    registered_participants: number | null
    attended_participants: number | null
    webinar_title: string | null
    presenters: string | null
    duration_planned: string | null
    actual_run_time: string | null
    average_attendance_time: string | null
    event_rating: number | null
    created_at: string
  }
  
export const columns: ColumnDef<Webinar>[] = [
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
    accessorKey: "month",
    header: "Month",
  },
  {
    accessorKey: "webinar_title",
    header: "Webinar Title",
  },
  {
    accessorKey: "presenters",
    header: "Presenter(s)",
  },
  {
    accessorKey: "registration_page_views",
    header: "Page Views",
  },
  {
    accessorKey: "registered_participants",
    header: "Registered",
  },
  {
    accessorKey: "attended_participants",
    header: "Attended",
  },
  {
    accessorKey: "duration_planned",
    header: "Duration Planned",
  },
  {
    accessorKey: "actual_run_time",
    header: "Actual Run Time",
  },
  {
    accessorKey: "average_attendance_time",
    header: "Avg Attendance",
  },
  {
    accessorKey: "event_rating",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-left"
      >
        Event Rating
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const rating = row.getValue("event_rating")
      return rating ? `${rating}/5` : "—"
    },
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
