import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export type SocialMedia = {
  id: string
  month: string
  year: string
  post_reach: number | null
  post_engagement: number | null
  new_page_likes: number | null
  new_page_followers: number | null
  reactions: number | null
  comments: number | null
  shares: number | null
  photo_views: number | null
  link_clicks: number | null
  created_at: string
}

export const columns: ColumnDef<SocialMedia>[] = [
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
  { accessorKey: "month", header: "Month" },
  { accessorKey: "post_reach", header: "Post Reach" },
  { accessorKey: "post_engagement", header: "Post Engagement" },
  { accessorKey: "new_page_likes", header: "New Page Likes" },
  { accessorKey: "new_page_followers", header: "New Page Followers" },
  { accessorKey: "reactions", header: "Reactions" },
  { accessorKey: "comments", header: "Comments" },
  { accessorKey: "shares", header: "Shares" },
  { accessorKey: "photo_views", header: "Photo Views" },
  { accessorKey: "link_clicks", header: "Link Clicks" },
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
