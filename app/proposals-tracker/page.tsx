"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { DataTable } from "./data-table";
import { getProposalColumns } from "./columns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@radix-ui/react-separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type Proposal = {
  id: number;
  company_organization: string;
  phone: string;
  email: string;
  region: string;
  date_requested: string;
  course_requested: string;
  status: string;
  person_in_charge: string;
  user_id?: string;
};

export default function ProposalTrackerPage() {
  const [editForm, setEditForm] = useState<Proposal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<string[]>([]);

  const handleEdit = (proposal: Proposal) => {
    setEditForm(proposal);
    setIsEditing(true);
    toast("Editing proposal", { description: proposal.company_organization });
  };

  const handleDelete = async (proposal: Proposal) => {
    const confirm = window.confirm(`Are you sure you want to delete "${proposal.company_organization}"?`);
    if (!confirm) return;

    const { error } = await supabase
      .from("proposals_tracker")
      .delete()
      .eq("id", proposal.id);

    if (error) {
      toast.error("Delete failed", { description: error.message });
    } else {
      toast.success("Proposal deleted", { description: `${proposal.company_organization} removed.` });
      fetchProposals();
    }
  };

  // fetch proposals
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) fetchProposals();
  }, [userId]);

  const fetchProposals = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("proposals_tracker")
      .select("*")
      .eq("user_id", userId);
    if (!error && data) setProposals(data);
    setIsLoading(false);
  };

  //fetch statuses
  useEffect(() => {
    const fetchLeadStatuses = async () => {
      const { data, error } = await supabase.from("lead_statuses").select("name");
      if (!error && data) setLeadStatuses(data.map((s) => s.name));
    };
    fetchLeadStatuses();
  }, []);

  const handleSaveEdit = async () => {
    if (!editForm) return;

    const {
      id,
      company_organization,
      phone,
      email,
      region,
      date_requested,
      course_requested,
      status,
      person_in_charge
    } = editForm;

    if (!company_organization || !email || !course_requested) {
      toast.error("Missing required fields", {
        description: "Please ensure company, email, and course fields are filled.",
      });
      return;
    }

    // ✅ Update proposals_tracker
    const { error: proposalError } = await supabase
      .from("proposals_tracker")
      .update({
        company_organization,
        phone,
        email,
        region,
        date_requested,
        course_requested,
        status,
        person_in_charge
      })
      .eq("id", id);

    if (proposalError) {
      toast.error("Proposal update failed", { description: proposalError.message });
      return;
    }

    // ✅ Also update matching lead in crm_leads
    const { error: leadError } = await supabase
      .from("crm_leads")
      .update({ status })
      .ilike("company", company_organization)
      .ilike("email", email);

    if (leadError) {
      toast.warning("Proposal updated, but failed to update lead", {
        description: leadError.message
      });
    }

    toast.success("Proposal updated", {
      description: `Changes to "${company_organization}" saved.`,
    });

    setEditForm(null);
    setIsEditing(false);
    fetchProposals();
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">My Proposals</h2>
      <Separator />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <DataTable columns={getProposalColumns(handleEdit, handleDelete)} data={proposals} />
      )}

      {editForm && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Proposal</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(editForm).map(([key, value]) =>
                key === "id" || key === "user_id" ? null : (
                  <div key={key}>
                    <Label htmlFor={key}>{key.replace(/_/g, " ")}</Label>
                    {key === "status" ? (
                      <Select
                        value={String(value ?? "")}
                        onValueChange={(val) =>
                          setEditForm((prev) => prev && { ...prev, status: val })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                          {leadStatuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={key}
                        name={key}
                        value={value ?? ""}
                        onChange={(e) =>
                          setEditForm((prev) => prev && { ...prev, [key]: e.target.value })
                        }
                      />
                    )}
                  </div>
                )
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={handleSaveEdit}>Save</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
