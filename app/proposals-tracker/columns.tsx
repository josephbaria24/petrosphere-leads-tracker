// columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Proposal } from "./page";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export function getProposalColumns(
  onEdit: (proposal: Proposal) => void,
  onDelete: (proposal: Proposal) => void
): ColumnDef<Proposal>[] {
  return [
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const proposal = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(proposal)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(proposal)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "company_organization",
      header: "Company",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "region",
      header: "Region",
    },
    {
      accessorKey: "date_requested",
      header: "Date Requested",
      cell: ({ row }) => {
        const val = row.getValue("date_requested") as string;
        return new Date(val).toLocaleDateString();
      },
    },
    {
      accessorKey: "course_requested",
      header: "Course",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      accessorKey: "person_in_charge",
      header: "Person In Charge",
    },
  ];
}
