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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@radix-ui/react-separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from '@supabase/auth-helpers-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [leadStatuses, setLeadStatuses] = useState<string[]>([]);

  const [services, setServices] = useState<string[]>([]); // store service names
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const session = useSession();


  const [duplicateLead, setDuplicateLead] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);


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

  //fetch statuses
  useEffect(() => {
    const fetchLeadStatuses = async () => {
      const { data, error } = await supabase.from("lead_statuses").select("name");
      if (!error && data) setLeadStatuses(data.map((s) => s.name));
    };
    fetchLeadStatuses();
  }, []);


  // Check for duplicate leads when company or email changes

  useEffect(() => {
    const checkDuplicateLead = async () => {
      if (form.company_organization && form.email) {
        const { data, error } = await supabase
          .from("crm_leads")
          .select("*")
          .ilike("company", form.company_organization)
          .ilike("email", form.email)
          .maybeSingle();
  
        if (data) {
          setDuplicateLead(data);
          setShowDuplicateDialog(true);
        } else {
          setDuplicateLead(null);
          setShowDuplicateDialog(false);
        }
      }
    };
  
    checkDuplicateLead();
  }, [form.company_organization, form.email]);

  



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  
  const handleSubmit = async () => {
    if (!form.company_organization || !form.email || !form.course_requested) {
      toast.error("Missing required fields", {
        description: "Please fill in company, email, and at least one course.",
      });
      return;
    }
  
    if (duplicateLead) {
      toast.error("Duplicate lead", {
        description: "This lead already exists. Update via Leads List.",
      });
      return;
    }
  
  
    const user = session?.user;
  
    if (!user) {
      toast.error("Not logged in", { description: "Please login to submit proposal." });
      return;
    }
  
    const { error: proposalError } = await supabase.from("proposals_tracker").insert([
      {
        ...form,
        user_id: user.id,
      },
    ]);
  
    if (proposalError) {
      toast.error("Proposal submission failed", {
        description: proposalError.message || "Could not save proposal.",
      });
      return;
    }
  
    // 🆕 Insert to crm_leads
    const { error: leadError } = await supabase.from("crm_leads").insert([
      {
        contact_name: form.company_organization || "",
        email: form.email,
        phone: form.phone,
        company: form.company_organization,
        address: "", // Optional: extract if needed
        region: form.region,
        service_product: form.course_requested,
        status: form.status,
        captured_by: form.person_in_charge || "",
        user_id: user.id,
        notes: `Imported from proposals-tracker`,
      },
    ]);
  
    if (leadError) {
      toast.error("Lead creation failed", {
        description: leadError.message,
      });
      return;
    }
  
    toast.success("Proposal and Lead Submitted");
  
    setForm({
      company_organization: "",
      phone: "",
      email: "",
      region: "",
      date_requested: "",
      course_requested: "",
      status: "",
      person_in_charge: form.person_in_charge || "",
    });
  
    fetchProposals(); // Reload proposals
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
  
    // Validate required fields
    if (!company_organization || !email || !course_requested) {
      toast.error("Missing required fields", {
        description: "Please ensure company, email, and course fields are filled.",
      });
      return;
    }
  
    const { error } = await supabase
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
  
    if (error) {
      toast.error("Update failed", { description: error.message });
    } else {
      toast.success("Proposal updated", {
        description: `Changes to "${company_organization}" saved.`,
      });
      setEditForm(null);
      setIsEditing(false);
      fetchProposals();
    }
  };
  

  const handleCheckboxChange = (service: string, checked: boolean, isEdit = false) => {
     if (isEdit && editForm) {
         const selected = editForm.course_requested ? editForm.course_requested.split(",") 
         : []; const newSelected = checked ? [...selected, service] : selected.filter((s) => s !== service); setEditForm({ ...editForm, course_requested: newSelected.join(",") }); } else { const selected = form.course_requested ? form.course_requested.split(",") : []; const newSelected = checked ? [...selected, service] : selected.filter((s) => s !== service); setForm({ ...form, course_requested: newSelected.join(",") }); } };


return (
  <div className="p-6 space-y-6">
    <h2 className="text-2xl font-semibold mb-4">My Proposals</h2>
    <Separator className="" />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(form).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={key}>
            {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </Label>

          {key === "date_requested" ? (
            <div className="relative flex gap-2">
              <Input
                id={key}
                name={key}
                value={
                  value
                    ? new Date(value).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : ""
                }
                placeholder="June 01, 2025"
                className="bg-background pr-10"
                onChange={(e) => {
                  const inputDate = new Date(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    date_requested: !isNaN(inputDate.getTime())
                      ? inputDate.toISOString().split("T")[0]
                      : e.target.value,
                  }));
                }}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                  >
                    <CalendarIcon className="size-3.5" />
                    <span className="sr-only">Select date</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="end"
                  sideOffset={10}
                >
                  <Calendar
                    mode="single"
                    selected={value ? new Date(value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setForm((prev) => ({
                          ...prev,
                          date_requested: date.toISOString().split("T")[0],
                        }));
                      }
                    }}
                    initialFocus
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : key === "region" ? (
            <Select
              value={value ?? ""}
              onValueChange={(val) =>
                setForm((prev) => ({ ...prev, region: val }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : key === "status" ? (
            <Select
              value={value ?? ""}
              onValueChange={(val) =>
                setForm((prev) => ({ ...prev, status: val }))
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
          ) : key === "course_requested" ? (
            <>
              <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                <DialogTrigger asChild>
                  <Input
                    id={key}
                    name={key}
                    value={value ?? ""}
                    placeholder="Select services"
                    readOnly
                    className="cursor-pointer"
                  />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Services</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {services.map((service) => {
                      const selected = value ? String(value).split(",") : [];
                      return (
                        <label key={service} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selected.includes(service)}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(service, !!checked)
                            }
                          />
                          <span>{service}</span>
                        </label>
                      );
                    })}
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={() => setIsCourseDialogOpen(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Input
              id={key}
              name={key}
              value={value ?? ""}
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
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    ) : (
      <DataTable columns={getProposalColumns(handleEdit, handleDelete)} data={proposals} />
    )}
    {showDuplicateDialog && (
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Lead Found</DialogTitle>
            <p className="text-sm text-muted-foreground">
              A lead already exists with this company and email.
            </p>
          </DialogHeader>
          <div className="py-2 space-y-1 text-sm">
            <p><strong>Company:</strong> {duplicateLead?.company}</p>
            <p><strong>Email:</strong> {duplicateLead?.email}</p>
            <p className="text-destructive">Please update the status from the Leads List.</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDuplicateDialog(false)}>
              Close
            </Button>
            <a href="/lead-table" className="ml-2">
              <Button>Go to Leads List</Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              <Input
                id={key}
                name={key}
                value={value ?? ""}
                onChange={(e) =>
                  setEditForm((prev) => prev && { ...prev, [key]: e.target.value })
                }
              />
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
