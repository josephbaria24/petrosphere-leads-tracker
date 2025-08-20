//page.tsx

"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { DataTable } from "./data-table";
import { getProposalColumns } from "./columns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";


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
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const handleEdit = (proposal: Proposal) => {
        setEditForm(proposal);
        toast("Editing proposal", {
          description: proposal.company_organization,
        });
      };
    const [proposals, setProposals] = useState<Proposal[]>([]);

  const [form, setForm] = useState({
    company_organization: "",
    phone: "",
    email: "",
    region: "",
    date_requested: "",
    course_requested: "",
    status: "",
    person_in_charge: "",
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!userId) return;

    const { error } = await supabase.from("proposals_tracker").insert([
      { ...form, user_id: userId },
    ]);

    if (!error) {
      fetchProposals();
      setForm({
        company_organization: "",
        phone: "",
        email: "",
        region: "",
        date_requested: "",
        course_requested: "",
        status: "",
        person_in_charge: "",
      });
    }
  };


  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        setUserId(user.id);
  
        // Fetch full_name from profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
  
        if (profile && !profileError) {
          // Set person_in_charge with full_name
          setForm((prev) => ({
            ...prev,
            person_in_charge: profile.full_name || "",
          }));
        }
      }
    };
  
    fetchUser();
  }, []);

  


  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(form).map(([key, value]) => (
            <div key={key} className="space-y-1">
                <label htmlFor={key} className="text-sm font-medium">
                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </label>
                <Input
                id={key}
                name={key}
                value={value}
                onChange={handleChange}
                />
            </div>
            ))}

        <div className="col-span-full">
          <Button onClick={handleSubmit}>Add Proposal</Button>
        </div>
      </div>

      {editForm && (
  <div className="mt-6 space-y-4 border-t pt-4">
    <h2 className="text-lg font-semibold">Edit Proposal</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(editForm).map(([key, value]) => {
        if (key === "id" || key === "user_id") return null;
        return (
          <Input
            key={key}
            name={key}
            value={value}
            onChange={(e) =>
              setEditForm((prev) =>
                prev ? { ...prev, [key]: e.target.value } : prev
              )
            }
            placeholder={key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          />
        );
      })}
      <div className="col-span-full flex gap-2">
      <Button
  onClick={async () => {
    if (!editForm) return;

    const { id, user_id, ...updateData } = editForm;

    const { error } = await supabase
      .from("proposals_tracker")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      toast("Proposal updated", {
        description: `Changes to "${editForm.company_organization}" saved.`,
      });
      setEditForm(null);
      fetchProposals();
    } else {
      toast.error("Update failed", {
        description: error.message,
      });
    }
  }}
>
  Save Changes
</Button>

        <Button
          variant="outline"
          onClick={() => setEditForm(null)}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}


{isLoading ? (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-10 w-full rounded-md" />
    ))}
  </div>
) : (
  <DataTable
    columns={getProposalColumns(handleEdit)}
    data={proposals}
  />
)}


    </div>
  );
}
