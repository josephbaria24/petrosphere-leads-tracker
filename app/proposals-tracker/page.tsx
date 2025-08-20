// Updated ProposalTrackerPage with edit & services dropdown

"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { DataTable } from "./data-table";
import { getProposalColumns } from "./columns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@radix-ui/react-separator";

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
  const [regions, setRegions] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]); // store service names

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

  const handleEdit = (proposal: Proposal) => {
    setEditForm(proposal);
    setIsEditing(true);
    toast("Editing proposal", { description: proposal.company_organization });
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

  // fetch regions
  useEffect(() => {
    const fetchRegions = async () => {
      const { data, error } = await supabase.from("regions").select("name");
      if (!error && data) setRegions(data.map((r) => r.name));
    };
    fetchRegions();
  }, []);

  // fetch services
  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase.from("services").select("name");
      if (!error && data) setServices(data.map((s) => s.name));
    };
    fetchServices();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!userId) return;
    const { error } = await supabase.from("proposals_tracker").insert([
      { ...form, user_id: userId },
    ]);
    if (!error) {
      fetchProposals();
      setForm((prev) => ({
        company_organization: "",
        phone: "",
        email: "",
        region: "",
        date_requested: "",
        course_requested: "",
        status: "",
        person_in_charge: prev.person_in_charge,
      }));
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile) {
          setForm((prev) => ({ ...prev, person_in_charge: profile.full_name || "" }));
        }
      }
    };
    fetchUser();
  }, []);

  const handleSaveEdit = async () => {
    if (!editForm) return;
    const { id, user_id, ...updateData } = editForm;
    const { error } = await supabase
      .from("proposals_tracker")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      toast("Proposal updated", { description: `Changes to "${editForm.company_organization}" saved.` });
      setEditForm(null);
      setIsEditing(false);
      fetchProposals();
    } else {
      toast.error("Update failed", { description: error.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Add Proposal Form */}
        <h2 className="text-2xl font-semibold mb-4">My Proposals</h2>
        <Separator className="" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(form).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key}>{key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</Label>

            {key === "date_requested" ? (
              // Date Picker
              <div className="relative flex gap-2">
                <Input
                  id={key}
                  name={key}
                  value={value ? new Date(value).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" }) : ""}
                  placeholder="June 01, 2025"
                  className="bg-background pr-10"
                  onChange={(e) => {
                    const inputDate = new Date(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      date_requested: !isNaN(inputDate.getTime()) ? inputDate.toISOString().split("T")[0] : e.target.value,
                    }));
                  }}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
                      <CalendarIcon className="size-3.5" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="end" sideOffset={10}>
                    <Calendar
                      mode="single"
                      selected={value ? new Date(value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setForm((prev) => ({ ...prev, date_requested: date.toISOString().split("T")[0] }));
                        }
                      }}
                      initialFocus
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : key === "region" ? (
              // Region Dropdown
              <select
                id={key}
                name={key}
                value={value}
                onChange={handleChange}
                className="border rounded-md p-2 bg-background max-w-xs"
              >
                <option value="">Select a region</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : key === "course_requested" ? (
              // Services Dropdown
              <select
                id={key}
                name={key}
                value={value}
                onChange={handleChange}
                className="border rounded-md p-2 bg-background max-w-xs"
              >
                <option value="">Select a service</option>
                {services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              // Default Input
              <Input
                id={key}
                name={key}
                value={value}
                onChange={handleChange}
                disabled={key === "person_in_charge"}
                className={key === "person_in_charge" ? "opacity-70 cursor-not-allowed" : ""}
              />
            )}
          </div>
        ))}

        <div className="col-span-full flex justify-start pt-2">
          <Button onClick={handleSubmit}>Add Proposal</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}</div>
      ) : (
        <DataTable columns={getProposalColumns(handleEdit)} data={proposals} />
      )}

      {/* Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Proposal</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {editForm && Object.entries(editForm).map(([key, value]) =>
              key === "id" || key === "user_id" ? null : (
                <div key={key} className="flex flex-col">
                  <Label htmlFor={key} className="mb-1 text-sm font-medium text-muted-foreground">
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>

                  {key === "date_requested" ? (
                    // Date Picker
                    <div className="relative flex gap-2">
                      <Input
                        id={key}
                        name={key}
                        value={value ? new Date(value).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" }) : ""}
                        placeholder="June 01, 2025"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const inputDate = new Date(e.target.value);
                          setEditForm((prev) => prev ? {
                            ...prev,
                            date_requested: !isNaN(inputDate.getTime()) ? inputDate.toISOString().split("T")[0] : e.target.value,
                          } : null);
                        }}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
                            <CalendarIcon className="size-3.5" />
                            <span className="sr-only">Select date</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="end" sideOffset={10}>
                          <Calendar
                            mode="single"
                            selected={value ? new Date(value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setEditForm((prev) => prev ? { ...prev, date_requested: date.toISOString().split("T")[0] } : null);
                              }
                            }}
                            initialFocus
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : key === "region" ? (
                    // Region Dropdown
                    <select
                      id={key}
                      name={key}
                      value={value}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, region: e.target.value } : prev)}
                      className="border rounded-md p-2 bg-background max-w-xs"
                    >
                      <option value="">Select a region</option>
                      {regions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : key === "course_requested" ? (
                    // Services Dropdown
                    <select
                      id={key}
                      name={key}
                      value={value}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, course_requested: e.target.value } : prev)}
                      className="border rounded-md p-2 bg-background max-w-xs"
                    >
                      <option value="">Select a service</option>
                      {services.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={key}
                      name={key}
                      value={value}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      disabled={key === "person_in_charge"}
                      className={key === "person_in_charge" ? "opacity-70 cursor-not-allowed" : ""}
                    />
                  )}
                </div>
              )
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-6">
            <Button onClick={handleSaveEdit}>Save Changes</Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
