//app\add-new-leads\page.tsx

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import EditListModal from '@/components/shared/EditListModal'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { DatePicker } from '@/components/date-picker'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronDown, User, Building2, Phone, Mail, MapPin, Calendar, DollarSign, FileText, Settings, Search, Plus, Edit3, PersonStandingIcon, UserPlus2, Trash2, X } from "lucide-react"
import { cn, formatLocalDate } from "@/lib/utils"
import EditLeadModal from '@/components/EditLeadModal'
import { Badge } from '@/components/ui/badge'
import { ExcelActions } from '@/components/leads/ExcelActions'

// Optimized debounce hook with ref
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

const INITIAL_FORM_STATE = {
  contact_name: '',
  email: '',
  phone: '',
  mobile: '',
  company: '',
  address: '',
  region: '',
  service_product: '',
  mode_of_service: '',
  service_price: 0,
  lead_source: '',
  notes: '',
  status: '',
  captured_by: '',
  first_contact: null,
  last_contact: null,
}

const CAPTURED_BY_OPTIONS = ['Ross', 'Randy', 'Michelle', 'Harthwell', 'Sergs', 'Krezel', 'Carmela', 'Cherrylene', 'Kim', 'Other']
const SERVICE_MODES = ['Face to Face', 'E-learning', 'Online']

const STATUS_COLORS: Record<string, string> = {
  'Lead In': '#64748b',
  'Contact Made': '#2563eb',
  'Needs Defined': '#b45309',
  'Proposal Sent': '#7c3aed',
  'Negotiation Started': '#ea580c',
  'In Progress': '#0891b2',
  'For Follow up': '#4f46e5',
  'Closed Win': '#16a34a',
  'Closed Lost': '#dc2626',
}

export default function AddNewLeadPage() {
  const router = useRouter()

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
  const [regions, setRegions] = useState<string[]>([])
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [leadStatuses, setLeadStatuses] = useState<string[]>([])
  const [capturedByOptions, setCapturedByOptions] = useState<string[]>([])
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({})
  const [editingDropdown, setEditingDropdown] = useState<string | null>(null)
  const [isRegionOpen, setIsRegionOpen] = useState(false)
  const [isLeadSourceOpen, setIsLeadSourceOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isCapturedByOpen, setIsCapturedByOpen] = useState(false)
  const [duplicateLead, setDuplicateLead] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [serviceDetails, setServiceDetails] = useState<Array<{ name: string; mode: string; price: number }>>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [form, setForm] = useState(INITIAL_FORM_STATE)
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')

  // Use refs to avoid re-renders on intermediate values
  const duplicateCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Only debounce service search, not form fields for instant feedback
  const debouncedServiceSearch = useDebounce(serviceSearch, 200)

  // Memoized filtered services
  const filteredServices = useMemo(() => {
    if (!debouncedServiceSearch) return Object.keys(servicePrices)
    const search = debouncedServiceSearch.toLowerCase()
    return Object.keys(servicePrices).filter(service =>
      service.toLowerCase().includes(search)
    )
  }, [servicePrices, debouncedServiceSearch])

  // Memoized total price
  const totalServicePrice = useMemo(() =>
    serviceDetails.reduce((sum, s) => sum + s.price, 0),
    [serviceDetails]
  )
  // Optimized form handler that doesn't recreate on every render
  const handleChange = useCallback((field: string, value: string | number) => {
    setForm(prev => {
      if (prev[field as keyof typeof prev] === value) return prev // Prevent unnecessary updates
      return { ...prev, [field]: value }
    })
  }, [])

  // Optimized duplicate check with manual debouncing
  const checkDuplicateLeadAsync = useCallback(async (name: string, email: string) => {
    if (!name.trim() || !email.trim()) return

    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .ilike("contact_name", name.trim())
        .ilike("email", email.trim())
        .limit(1)

      if (error) {
        console.warn("Duplicate check error:", error.message)
        return
      }

      if (data && data.length > 0) {
        setDuplicateLead(data[0])
        toast.warning("Lead already exists", {
          description: `This lead exists in the database.`,
        })
        setIsEditModalOpen(true)
      } else {
        setDuplicateLead(null)
      }
    } catch (err) {
      console.warn("Duplicate check failed:", err)
    }
  }, [])

  // Manual debounced duplicate check to avoid useEffect dependencies
  const checkDuplicateLead = useCallback((name: string, email: string) => {
    if (duplicateCheckTimeoutRef.current) {
      clearTimeout(duplicateCheckTimeoutRef.current)
    }

    duplicateCheckTimeoutRef.current = setTimeout(() => {
      checkDuplicateLeadAsync(name, email)
    }, 800)
  }, [checkDuplicateLeadAsync])

  // Optimized service handlers
  const handleServiceToggle = useCallback((service: string, checked: boolean) => {
    setServiceDetails(prev => {
      if (checked) {
        return [...prev, { name: service, mode: '', price: 0 }]
      } else {
        return prev.filter(s => s.name !== service)
      }
    })
  }, [])

  const handleServiceModeChange = useCallback((service: string, mode: string) => {
    setServiceDetails(prev =>
      prev.map(s => s.name === service ? { ...s, mode } : s)
    )
  }, [])

  const handleServicePriceChange = useCallback((service: string, price: number) => {
    setServiceDetails(prev =>
      prev.map(s => s.name === service ? { ...s, price } : s)
    )
  }, [])

  const handleAddService = useCallback(async () => {
    if (!newServiceName.trim()) {
      toast.error('Please enter a service name')
      return
    }

    try {
      const { error } = await supabase.from('services').insert({
        name: newServiceName.trim(),
        price: 0
      })

      if (error) {
        toast.error('Failed to add service', { description: error.message })
        return
      }

      // Refresh services
      const { data: services } = await supabase.from('services').select('*')
      if (services) {
        setServicePrices(
          services.reduce((acc, cur) => ({ ...acc, [cur.name]: cur.price }), {})
        )
      }

      toast.success('Service added successfully')
      setNewServiceName('')
      setIsAddServiceModalOpen(false)
    } catch (err) {
      toast.error('Failed to add service')
    }
  }, [newServiceName])

  const handleDeleteService = useCallback(async (serviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceName}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('name', serviceName)

      if (error) {
        toast.error('Failed to delete service', { description: error.message })
        return
      }

      // Remove from local state
      setServicePrices(prev => {
        const updated = { ...prev }
        delete updated[serviceName]
        return updated
      })

      // Remove from selected services if present
      setServiceDetails(prev => prev.filter(s => s.name !== serviceName))

      toast.success('Service deleted successfully')
    } catch (err) {
      toast.error('Failed to delete service')
    }
  }, [])

  const handleEditService = useCallback(async (oldName: string) => {
    const newName = window.prompt("Enter new service name:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;
    
    try {
      const { error } = await supabase
        .from('services')
        .update({ name: newName.trim() })
        .eq('name', oldName);

      if (error) {
        toast.error('Failed to update service', { description: error.message });
        return;
      }

      setServicePrices(prev => {
        const updated = { ...prev };
        updated[newName.trim()] = updated[oldName];
        delete updated[oldName];
        return updated;
      });

      setServiceDetails(prev => prev.map(s => s.name === oldName ? { ...s, name: newName.trim() } : s));
      toast.success('Service updated successfully');
    } catch (err) {
      toast.error('Failed to update service');
    }
  }, []);

  const validateForm = useCallback(() => {
    const requiredFields = [
      'contact_name', 'email', 'phone', 'mobile', 'company', 'address',
      'region', 'lead_source', 'status', 'captured_by', 'first_contact', 'last_contact'
    ]

    for (const field of requiredFields) {
      if (!form[field as keyof typeof form]) {
        toast.error('Missing Required Field', {
          description: `Please fill out: ${field.replace(/_/g, ' ')}`,
        })
        return false
      }
    }

    if (serviceDetails.length === 0 || serviceDetails.some(s => !s.mode || !s.price)) {
      toast.error('Incomplete Service Info', {
        description: 'Please select at least one service with mode and price.',
      })
      return false
    }

    return true
  }, [form, serviceDetails])

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!user || userError) {
        toast.error("User session error")
        return
      }

      const { data: profile } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const fullCompany = `${form.company} - ${form.address}`.trim()
      const selectedNames = serviceDetails.map(s => s.name).join(', ')
      const totalPrice = totalServicePrice
      const allModes = serviceDetails.map(s => s.mode).filter(Boolean).join(', ')
      const firstName = form.captured_by?.split(' ')[0] || form.captured_by

      const { error } = await supabase.from('crm_leads').insert([{
        ...form,
        captured_by: firstName,
        company: fullCompany,
        service_product: selectedNames,
        service_price: totalPrice,
        mode_of_service: allModes,
        user_id: user.id,
      }])

      if (error) {
        toast.error('Submission Failed', { description: error.message })
        return
      }
      // ✅ Auto-insert into proposals_tracker if applicable
      if (form.status.toLowerCase() === "proposal sent") {
        const { error: proposalError } = await supabase.from('proposals_tracker').insert([{
          company_organization: fullCompany,
          phone: form.phone,
          email: form.email,
          region: form.region,
          date_requested: new Date().toISOString().split("T")[0],
          course_requested: selectedNames,
          status: form.status,
          person_in_charge: firstName,
          user_id: user.id,
        }]);

        if (proposalError) {
          toast.warning("Lead saved, but proposal tracker update failed", {
            description: proposalError.message,
          });
        }
      }
      toast.success('Lead Submitted')
      setForm(INITIAL_FORM_STATE)
      setServiceDetails([])

      // Log activity
      if (profile?.full_name) {
        supabase.from('activity_logs').insert({
          user_name: profile.full_name,
          action: 'added',
          entity_type: 'lead',
        })
      }
    } catch (err) {
      toast.error('Submission Failed')
    }
  }, [form, serviceDetails, totalServicePrice, validateForm])

  const fetchTable = useCallback(async (table: 'regions' | 'lead_sources' | 'lead_statuses' | 'captured_by_settings') => {
    try {
      const { data, error } = await supabase.from(table).select('name')
      if (error) throw error

      let names = data.map(d => d.name)

      if (table === 'lead_statuses') {
        // Sort according to STATUS_ORDER
        names = STATUS_ORDER.filter(s => names.includes(s)).concat(
          names.filter(s => !STATUS_ORDER.includes(s)) // put leftovers at the end
        )
        setLeadStatuses(names)
      } else if (table === 'regions') {
        setRegions(names)
      } else if (table === 'lead_sources') {
        setLeadSources(names)
      } else if (table === 'captured_by_settings') {
        setCapturedByOptions(names)
      }
    } catch (err) {
      console.warn(`Failed to fetch ${table}:`, err)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      const [regionsP, sourcesP, statusesP] = await Promise.allSettled([
        fetchTable('regions'),
        fetchTable('lead_sources'),
        fetchTable('lead_statuses'),
        fetchTable('captured_by_settings'),
      ])

      try {
        const { data: services } = await supabase.from('services').select('*')
        if (services) {
          setServicePrices(
            services.reduce((acc, cur) => ({ ...acc, [cur.name]: cur.price }), {})
          )
        }
      } catch (err) {
        console.warn('Failed to fetch services:', err)
      }
    }

    initializeData()
  }, [fetchTable])


  return (
    <div className="min-h-screen rounded-lg bg-card">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-card backdrop-blur-sm border-0 rounded-xl px-5 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <UserPlus2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard" className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600">Manage Lead</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-slate-300" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-xs font-semibold text-slate-800 dark:text-slate-200">Add New Lead</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Add New Lead</h1>
              </div>
            </div>
            <ExcelActions onImportSuccess={() => router.refresh()} />
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/95 dark:bg-background backdrop-blur-sm">
          <CardContent className="p-5 space-y-5">
            {/* Duplicate Lead Modal */}
            {duplicateLead && (
              <EditLeadModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={async (updated) => {
                  try {
                    const { error } = await supabase.from("crm_leads").update(updated).eq("id", duplicateLead.id)
                    if (error) toast.error("Update failed")
                    else toast.success("Lead updated successfully")
                  } catch { toast.error("Update failed") }
                }}
                lead={duplicateLead}
                currentUserName={form.captured_by || "Unknown"}
              />
            )}

            {/* ── Contact Details ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-100 dark:border-blue-900/30">
                <User className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Contact Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Contact Name <span className="text-red-400">*</span></Label>
                  <Input id="contact_name" value={form.contact_name} onChange={(e) => handleChange('contact_name', e.target.value)} onBlur={() => checkDuplicateLead(form.contact_name, form.email)} className="h-9 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-blue-500" placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />Email <span className="text-red-400">*</span></Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => checkDuplicateLead(form.contact_name, form.email)} className="h-9 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-blue-500" placeholder="contact@example.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />Phone <span className="text-red-400">*</span></Label>
                  <Input id="phone" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className="h-9 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-blue-500" placeholder="+63 xxx xxx xxxx" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Mobile <span className="text-red-400">*</span></Label>
                  <Input id="mobile" value={form.mobile} onChange={(e) => handleChange('mobile', e.target.value)} className="h-9 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-blue-500" placeholder="+63 9xx xxx xxxx" />
                </div>
              </div>
            </div>

            {/* ── Company Information ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-100 dark:border-emerald-900/30">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Company Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Company Name <span className="text-red-400">*</span></Label>
                  <Input id="company" value={form.company} onChange={(e) => handleChange('company', e.target.value)} className="h-9 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500" placeholder="Company name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />Address <span className="text-red-400">*</span></Label>
                  <Input id="address" value={form.address} onChange={(e) => handleChange('address', e.target.value)} className="h-9 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500" placeholder="Complete address" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Region <span className="text-red-400">*</span></Label>
                  <Popover open={isRegionOpen} onOpenChange={setIsRegionOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full h-9 justify-between text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-normal">
                        <span className="truncate">{form.region || "Select region"}</span>
                        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0">
                      <Command>
                        <CommandInput placeholder="Search region..." className="h-8 text-sm" />
                        <CommandEmpty>No region found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          {regions.map((r) => (
                            <CommandItem key={r} value={r} onSelect={() => { handleChange('region', r); setIsRegionOpen(false) }}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", form.region === r ? "opacity-100" : "opacity-0")} />{r}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Lead Source <span className="text-red-400">*</span></Label>
                  <Popover open={isLeadSourceOpen} onOpenChange={setIsLeadSourceOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full h-9 justify-between text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-normal">
                        <span className="truncate">{form.lead_source || "Select source"}</span>
                        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0">
                      <Command>
                        <CommandInput placeholder="Search source..." className="h-8 text-sm" />
                        <CommandEmpty>No source found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          {leadSources.map((s) => (
                            <CommandItem key={s} value={s} onSelect={() => { handleChange('lead_source', s); setIsLeadSourceOpen(false) }}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", form.lead_source === s ? "opacity-100" : "opacity-0")} />{s}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* ── Timeline & Status ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-amber-100 dark:border-amber-900/30">
                <Calendar className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Timeline & Status</h3>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="grid grid-cols-2 gap-3 lg:w-[340px] shrink-0">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">First Contact <span className="text-red-400">*</span></Label>
                    <DatePicker value={form.first_contact ? new Date(form.first_contact) : undefined} onChange={(date) => handleChange('first_contact', date ? formatLocalDate(date) : '')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Last Contact <span className="text-red-400">*</span></Label>
                    <DatePicker value={form.last_contact ? new Date(form.last_contact) : undefined} onChange={(date) => handleChange('last_contact', date ? formatLocalDate(date) : '')} />
                  </div>
                </div>

                {/* Status Pipeline */}
                <div className="space-y-1 flex-1 min-w-0">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status <span className="text-red-400">*</span></Label>
                  <div className="relative w-full overflow-x-auto pb-0.5">
                    {/* Background track line */}
                    <div className="absolute top-[8px] left-[9px] right-[9px] h-[2px] bg-zinc-200 dark:bg-zinc-700" />
                    {/* Progress fill line */}
                    {form.status && leadStatuses.indexOf(form.status) >= 0 && (
                      <div
                        className="absolute top-[8px] left-[9px] h-[2px] transition-all duration-300"
                        style={{ width: `calc(${(leadStatuses.indexOf(form.status) / Math.max(leadStatuses.length - 1, 1)) * 100}% - 18px)`, backgroundColor: STATUS_COLORS[form.status] || '#64748b' }}
                      />
                    )}
                    {/* Dots row */}
                    <div className="relative flex items-start justify-between">
                      {leadStatuses.map((st, i) => {
                        const selectedIdx = leadStatuses.indexOf(form.status)
                        const isSelected = form.status === st
                        const isPast = selectedIdx >= 0 && i < selectedIdx

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleChange('status', st)}
                            className="flex flex-col items-center gap-0.5 group z-[1]"
                            title={st}
                          >
                            <div
                              className={cn(
                                "w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all",
                                (isSelected || isPast)
                                  ? "border-transparent"
                                  : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 group-hover:scale-105"
                              )}
                              style={(isSelected || isPast) ? { backgroundColor: STATUS_COLORS[st] || '#64748b', borderColor: STATUS_COLORS[st] || '#64748b', ...(isSelected ? { boxShadow: `0 2px 6px ${STATUS_COLORS[st]}50`, transform: 'scale(1.15)' } : {}) } : {}}
                            >
                              {(isPast || isSelected) && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span
                              className={cn(
                                "text-[10px] leading-tight text-center max-w-[64px] transition-colors whitespace-nowrap",
                                (isSelected || isPast) ? "font-bold" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600"
                              )}
                              style={(isSelected || isPast) ? { color: STATUS_COLORS[st] || '#64748b' } : {}}
                            >
                              {st}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Assignment & Notes ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-violet-100 dark:border-violet-900/30">
                <Settings className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Assignment & Notes</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDropdown('captured_by_settings')} className="ml-auto h-6 w-6 p-0 text-slate-400 hover:text-violet-600">
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Captured By <span className="text-red-400">*</span></Label>
                  <Popover open={isCapturedByOpen} onOpenChange={setIsCapturedByOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full h-9 justify-between text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-normal">
                        <span className="truncate">{form.captured_by || "Select member"}</span>
                        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0">
                      <Command>
                        <CommandInput placeholder="Search member..." className="h-8 text-sm" />
                        <CommandEmpty>No member found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          {capturedByOptions.map((p) => (
                            <CommandItem key={p} value={p} onSelect={() => { handleChange('captured_by', p); setIsCapturedByOpen(false) }}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", form.captured_by === p ? "opacity-100" : "opacity-0")} />{p}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Or enter custom name</Label>
                  <Input placeholder="Custom name..." value={form.captured_by} onChange={(e) => handleChange('captured_by', e.target.value)} className="h-9 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-violet-500" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1"><FileText className="w-3 h-3" />Notes</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} className="text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-violet-500 min-h-[36px] h-9 resize-none" placeholder="Additional notes..." />
                </div>
              </div>
            </div>

            {/* ── Services & Pricing ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-teal-100 dark:border-teal-900/30">
                <DollarSign className="w-4 h-4 text-teal-500" />
                <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Services & Pricing</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input id="service_search" type="text" placeholder="Search services..." value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} className="h-9 pl-8 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-teal-500" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddServiceModalOpen(true)} className="h-9 text-xs bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                    <Plus className="w-3.5 h-3.5 mr-1" />Add
                  </Button>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 space-y-2 max-h-[300px] overflow-y-auto border border-zinc-200 dark:border-zinc-700">
                  {filteredServices.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No services found.</div>
                  ) : (
                    filteredServices.map((service) => {
                      const selected = serviceDetails.find((s) => s.name === service)
                      return (
                        <div key={service} className={cn("group rounded-lg p-2.5 border transition-all", selected ? "bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700")}>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <input type="checkbox" checked={!!selected} onChange={(e) => handleServiceToggle(service, e.target.checked)} className="w-3.5 h-3.5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
                              <span className="text-sm font-medium text-slate-800 dark:text-white">{service}</span>
                            </label>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleEditService(service)} className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteService(service)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          {selected && (
                            <div className="grid grid-cols-2 gap-2 mt-2 ml-5">
                              <Select value={selected?.mode || ''} onValueChange={(v) => handleServiceModeChange(service, v)}>
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"><SelectValue placeholder="Mode" /></SelectTrigger>
                                <SelectContent>{SERVICE_MODES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                              </Select>
                              <Input type="number" placeholder="₱ 0.00" value={selected?.price || ''} onChange={(e) => handleServicePriceChange(service, Number(e.target.value))} className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700" />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {serviceDetails.length > 0 && (
                  <div className="bg-teal-50 dark:bg-teal-950/20 rounded-lg p-3 border border-teal-200 dark:border-teal-800">
                    <div className="space-y-1.5 mb-2">
                      {serviceDetails.map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-sm py-1 px-2 bg-white/60 dark:bg-zinc-900/40 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 dark:text-white">{s.name}</span>
                            {s.mode && <Badge variant="secondary" className="text-[10px] h-5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">{s.mode}</Badge>}
                          </div>
                          <span className="font-semibold text-teal-700 dark:text-teal-300">₱{s.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-teal-200 dark:border-teal-800">
                      <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Total:</span>
                      <span className="text-lg font-bold text-teal-800 dark:text-teal-200">₱{totalServicePrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button onClick={handleSubmit} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 h-10">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingDropdown && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex justify-center items-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden border-0">

              <button
                onClick={() => setEditingDropdown(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-medium transition-colors z-10"
              >
                ✕
              </button>

              <div className="max-h-[90vh] overflow-y-auto p-6 pt-12">
                <EditListModal
                  title={
                    editingDropdown === 'regions' ? 'Manage Regions' :
                      editingDropdown === 'leadSources' ? 'Manage Lead Sources' :
                        editingDropdown === 'captured_by_settings' ? 'Manage Team Members' : 'Manage Lead Statuses'
                  }
                  values={
                    editingDropdown === 'regions' ? regions :
                      editingDropdown === 'leadSources' ? leadSources :
                        editingDropdown === 'captured_by_settings' ? capturedByOptions : leadStatuses
                  }
                  onAdd={async (val) => {
                    if (!val) return
                    const table =
                      editingDropdown === 'regions' ? 'regions' :
                        editingDropdown === 'leadSources' ? 'lead_sources' :
                          editingDropdown === 'captured_by_settings' ? 'captured_by_settings' : 'lead_statuses'

                    const { error } = await supabase.from(table).insert({ name: val })
                    if (error) {
                      toast.error('Failed to add item', { description: error.message })
                    } else {
                      await fetchTable(table)
                      toast.success('Item added successfully')
                    }
                  }}
                  onEdit={async (oldVal, newVal) => {
                    if (!newVal) return
                    const table =
                      editingDropdown === 'regions' ? 'regions' :
                        editingDropdown === 'leadSources' ? 'lead_sources' :
                          editingDropdown === 'captured_by_settings' ? 'captured_by_settings' : 'lead_statuses'

                    const { error } = await supabase.from(table).update({ name: newVal }).eq('name', oldVal)
                    if (error) {
                      toast.error('Failed to update item', { description: error.message })
                    } else {
                      await fetchTable(table)
                      toast.success('Item updated successfully')
                    }
                  }}
                  onDelete={async (val) => {
                    const table =
                      editingDropdown === 'regions' ? 'regions' :
                        editingDropdown === 'leadSources' ? 'lead_sources' :
                          editingDropdown === 'captured_by_settings' ? 'captured_by_settings' : 'lead_statuses'

                    const { error } = await supabase.from(table).delete().eq('name', val)
                    if (error) {
                      toast.error('Failed to delete item', { description: error.message })
                    } else {
                      await fetchTable(table)
                      toast.success('Item deleted successfully')
                    }
                  }}
                  onSave={() => setEditingDropdown(null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-200 dark:border-slate-700">

            <button
              onClick={() => {
                setIsAddServiceModalOpen(false)
                setNewServiceName('')
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pt-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Add New Service</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-service-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Service Name
                  </Label>
                  <Input
                    id="new-service-name"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Enter service name"
                    className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddService()
                      }
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={handleAddService}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddServiceModalOpen(false)
                      setNewServiceName('')
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}