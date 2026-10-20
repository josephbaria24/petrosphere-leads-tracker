//app\add-new-leads\page.tsx

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import EditListModal from '@/components/shared/EditListModal'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { DatePicker } from '@/components/date-picker'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronDown, User, Building2, Phone, Mail, MapPin, Calendar, DollarSign, FileText, Settings, Search, Plus, Edit3, UserPlus2, Trash2, X } from "lucide-react"
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
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

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


  const fieldClass =
    'h-10 text-sm bg-white/90 dark:bg-zinc-950/80 border-zinc-200/80 dark:border-zinc-700 focus-visible:ring-2'
  const labelClass = 'text-[11px] font-medium text-slate-600 dark:text-slate-300'

  return (
    <div className="relative min-h-screen overflow-x-hidden rounded-lg bg-gradient-to-b from-sky-50 via-slate-50 to-teal-50/40 dark:from-zinc-950 dark:via-zinc-950 dark:to-sky-950/20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.12),_transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl space-y-3 p-3 pb-28 sm:space-y-4 sm:p-4 md:pb-6">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl border border-sky-200/70 bg-gradient-to-br from-[#00044a] via-sky-900 to-teal-800 px-4 py-3.5 text-white shadow-lg shadow-sky-900/20 dark:border-sky-900/50 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Breadcrumb className="mb-1 hidden sm:block">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard" className="text-[11px] text-sky-200/80 hover:text-white">Manage Lead</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-sky-300/50" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-[11px] font-medium text-white">Add New Lead</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm sm:size-10">
                  <UserPlus2 className="size-4 text-white sm:size-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">Add New Lead</h1>
                  <p className="text-[11px] text-sky-100/80 sm:text-xs">Capture contact, company, and services</p>
                </div>
              </div>
            </div>
            <div className="shrink-0 [&_button]:border-white/25 [&_button]:bg-white/10 [&_button]:text-white [&_button]:hover:bg-white/20">
              <ExcelActions showExport={false} onImportSuccess={() => router.refresh()} />
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
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

            {/* Contact */}
            <section className="overflow-hidden rounded-2xl border border-sky-200/80 bg-white/90 shadow-sm dark:border-sky-900/40 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50/80 px-3.5 py-2.5 dark:border-sky-900/40 dark:bg-sky-950/40">
                <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/30">
                  <User className="size-3.5" />
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">Contact</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className={labelClass}>Name <span className="text-red-400">*</span></Label>
                  <Input id="contact_name" value={form.contact_name} onChange={(e) => handleChange('contact_name', e.target.value)} onBlur={() => checkDuplicateLead(form.contact_name, form.email)} className={cn(fieldClass, 'focus-visible:ring-sky-400')} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label className={cn(labelClass, 'flex items-center gap-1')}><Mail className="size-3" />Email <span className="text-red-400">*</span></Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => checkDuplicateLead(form.contact_name, form.email)} className={cn(fieldClass, 'focus-visible:ring-sky-400')} placeholder="contact@example.com" />
                </div>
                <div className="space-y-1">
                  <Label className={cn(labelClass, 'flex items-center gap-1')}><Phone className="size-3" />Phone <span className="text-red-400">*</span></Label>
                  <Input id="phone" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className={cn(fieldClass, 'focus-visible:ring-sky-400')} placeholder="+63 xxx xxx xxxx" />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Mobile <span className="text-red-400">*</span></Label>
                  <Input id="mobile" value={form.mobile} onChange={(e) => handleChange('mobile', e.target.value)} className={cn(fieldClass, 'focus-visible:ring-sky-400')} placeholder="+63 9xx xxx xxxx" />
                </div>
              </div>
            </section>

            {/* Company */}
            <section className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white/90 shadow-sm dark:border-emerald-900/40 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/80 px-3.5 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/40">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                  <Building2 className="size-3.5" />
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Company</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className={labelClass}>Company <span className="text-red-400">*</span></Label>
                  <Input id="company" value={form.company} onChange={(e) => handleChange('company', e.target.value)} className={cn(fieldClass, 'focus-visible:ring-emerald-400')} placeholder="Company name" />
                </div>
                <div className="space-y-1">
                  <Label className={cn(labelClass, 'flex items-center gap-1')}><MapPin className="size-3" />Address <span className="text-red-400">*</span></Label>
                  <Input id="address" value={form.address} onChange={(e) => handleChange('address', e.target.value)} className={cn(fieldClass, 'focus-visible:ring-emerald-400')} placeholder="Complete address" />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Region <span className="text-red-400">*</span></Label>
                  <Popover open={isRegionOpen} onOpenChange={setIsRegionOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className={cn(fieldClass, 'w-full justify-between font-normal')}>
                        <span className="truncate">{form.region || "Select region"}</span>
                        <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(100vw-2rem,220px)] p-0">
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
                  <Label className={labelClass}>Lead Source <span className="text-red-400">*</span></Label>
                  <Popover open={isLeadSourceOpen} onOpenChange={setIsLeadSourceOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className={cn(fieldClass, 'w-full justify-between font-normal')}>
                        <span className="truncate">{form.lead_source || "Select source"}</span>
                        <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(100vw-2rem,220px)] p-0">
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
            </section>

            {/* Timeline & Status */}
            <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white/90 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/80 px-3.5 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/40">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                  <Calendar className="size-3.5" />
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Timeline & Status</h3>
              </div>
              <div className="space-y-3 p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-2.5 lg:max-w-md">
                  <div className="space-y-1">
                    <Label className={labelClass}>First Contact <span className="text-red-400">*</span></Label>
                    <DatePicker value={form.first_contact ? new Date(form.first_contact) : undefined} onChange={(date) => handleChange('first_contact', date ? formatLocalDate(date) : '')} />
                  </div>
                  <div className="space-y-1">
                    <Label className={labelClass}>Last Contact <span className="text-red-400">*</span></Label>
                    <DatePicker value={form.last_contact ? new Date(form.last_contact) : undefined} onChange={(date) => handleChange('last_contact', date ? formatLocalDate(date) : '')} />
                  </div>
                </div>

                {/* Mobile: compact status select + chips */}
                <div className="space-y-1.5 md:hidden">
                  <Label className={labelClass}>Status <span className="text-red-400">*</span></Label>
                  <Select value={form.status || undefined} onValueChange={(v) => handleChange('status', v)}>
                    <SelectTrigger className={cn(fieldClass, 'w-full')}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map((st) => (
                        <SelectItem key={st} value={st}>
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[st] || '#64748b' }} />
                            {st}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {leadStatuses.map((st) => {
                      const active = form.status === st
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleChange('status', st)}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all',
                            active ? 'border-transparent text-white shadow-sm' : 'border-zinc-200 bg-white text-slate-500 dark:border-zinc-700 dark:bg-zinc-900'
                          )}
                          style={active ? { backgroundColor: STATUS_COLORS[st] || '#64748b' } : undefined}
                        >
                          {st}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Desktop pipeline */}
                <div className="hidden space-y-1 md:block">
                  <Label className={labelClass}>Status <span className="text-red-400">*</span></Label>
                  <div className="relative w-full overflow-x-auto pb-0.5">
                    <div className="absolute top-[8px] left-[9px] right-[9px] h-[2px] bg-zinc-200 dark:bg-zinc-700" />
                    {form.status && leadStatuses.indexOf(form.status) >= 0 && (
                      <div
                        className="absolute top-[8px] left-[9px] h-[2px] transition-all duration-300"
                        style={{ width: `calc(${(leadStatuses.indexOf(form.status) / Math.max(leadStatuses.length - 1, 1)) * 100}% - 18px)`, backgroundColor: STATUS_COLORS[form.status] || '#64748b' }}
                      />
                    )}
                    <div className="relative flex items-start justify-between">
                      {leadStatuses.map((st, i) => {
                        const selectedIdx = leadStatuses.indexOf(form.status)
                        const isSelected = form.status === st
                        const isPast = selectedIdx >= 0 && i < selectedIdx
                        return (
                          <button key={st} type="button" onClick={() => handleChange('status', st)} className="z-[1] flex flex-col items-center gap-0.5 group" title={st}>
                            <div
                              className={cn(
                                'flex size-[18px] items-center justify-center rounded-full border-2 transition-all',
                                (isSelected || isPast) ? 'border-transparent' : 'border-zinc-300 bg-white group-hover:scale-105 dark:border-zinc-600 dark:bg-zinc-900'
                              )}
                              style={(isSelected || isPast) ? { backgroundColor: STATUS_COLORS[st] || '#64748b', borderColor: STATUS_COLORS[st] || '#64748b', ...(isSelected ? { boxShadow: `0 2px 6px ${STATUS_COLORS[st]}50`, transform: 'scale(1.15)' } : {}) } : {}}
                            >
                              {(isPast || isSelected) && <Check className="size-2.5 text-white" />}
                            </div>
                            <span
                              className={cn('max-w-[64px] whitespace-nowrap text-center text-[10px] leading-tight transition-colors', (isSelected || isPast) ? 'font-bold' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500')}
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
            </section>

            {/* Assignment */}
            <section className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white/90 shadow-sm dark:border-violet-900/40 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 border-b border-violet-100 bg-violet-50/80 px-3.5 py-2.5 dark:border-violet-900/40 dark:bg-violet-950/40">
                <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm shadow-violet-500/30">
                  <Settings className="size-3.5" />
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">Assignment</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDropdown('captured_by_settings')} className="ml-auto size-7 p-0 text-violet-400 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-950">
                  <Settings className="size-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label className={labelClass}>Captured By <span className="text-red-400">*</span></Label>
                  <Popover open={isCapturedByOpen} onOpenChange={setIsCapturedByOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className={cn(fieldClass, 'w-full justify-between font-normal')}>
                        <span className="truncate">{form.captured_by || "Select member"}</span>
                        <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(100vw-2rem,220px)] p-0">
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
                  <Label className={labelClass}>Custom name</Label>
                  <Input placeholder="Or type a name..." value={form.captured_by} onChange={(e) => handleChange('captured_by', e.target.value)} className={cn(fieldClass, 'focus-visible:ring-violet-400')} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <Label className={cn(labelClass, 'flex items-center gap-1')}><FileText className="size-3" />Notes</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} className="min-h-[72px] resize-none border-zinc-200/80 bg-white/90 text-sm focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-zinc-700 dark:bg-zinc-950/80 sm:min-h-[40px] sm:h-10" placeholder="Additional notes..." />
                </div>
              </div>
            </section>

            {/* Services */}
            <section className="overflow-hidden rounded-2xl border border-teal-200/80 bg-white/90 shadow-sm dark:border-teal-900/40 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 border-b border-teal-100 bg-teal-50/80 px-3.5 py-2.5 dark:border-teal-900/40 dark:bg-teal-950/40">
                <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500 text-white shadow-sm shadow-teal-500/30">
                  <DollarSign className="size-3.5" />
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">Services & Pricing</h3>
              </div>
              <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <Input id="service_search" type="text" placeholder="Search services..." value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} className={cn(fieldClass, 'pl-8 focus-visible:ring-teal-400')} />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddServiceModalOpen(true)} className="h-10 shrink-0 border-teal-200 bg-teal-50 text-xs text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/30">
                    <Plus className="mr-1 size-3.5" />Add
                  </Button>
                </div>

                <div className="max-h-[240px] space-y-2 overflow-y-auto rounded-xl border border-teal-100 bg-teal-50/40 p-2 dark:border-teal-900/40 dark:bg-teal-950/20 sm:max-h-[300px] sm:p-3">
                  {filteredServices.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No services found.</div>
                  ) : (
                    filteredServices.map((service) => {
                      const selected = serviceDetails.find((s) => s.name === service)
                      return (
                        <div key={service} className={cn('group rounded-xl border p-2.5 transition-all', selected ? 'border-teal-300 bg-white shadow-sm dark:border-teal-700 dark:bg-zinc-900' : 'border-zinc-200/80 bg-white/70 dark:border-zinc-700 dark:bg-zinc-900/60')}>
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                              <input type="checkbox" checked={!!selected} onChange={(e) => handleServiceToggle(service, e.target.checked)} className="size-3.5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
                              <span className="truncate text-sm font-medium text-slate-800 dark:text-white">{service}</span>
                            </label>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleEditService(service)} className="size-7 p-0 text-slate-400 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/20">
                                <Edit3 className="size-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteService(service)} className="size-7 p-0 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20">
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          {selected && (
                            <div className="ml-5 mt-2 grid grid-cols-2 gap-2">
                              <Select value={selected?.mode || ''} onValueChange={(v) => handleServiceModeChange(service, v)}>
                                <SelectTrigger className="h-8 border-zinc-200 bg-white text-xs dark:border-zinc-700 dark:bg-zinc-900"><SelectValue placeholder="Mode" /></SelectTrigger>
                                <SelectContent>{SERVICE_MODES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                              </Select>
                              <Input type="number" placeholder="₱ 0.00" value={selected?.price || ''} onChange={(e) => handleServicePriceChange(service, Number(e.target.value))} className="h-8 border-zinc-200 bg-white text-xs dark:border-zinc-700 dark:bg-zinc-900" />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {serviceDetails.length > 0 && (
                  <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-3 dark:border-teal-800 dark:from-teal-950/40 dark:to-emerald-950/20">
                    <div className="mb-2 space-y-1.5">
                      {serviceDetails.map((s) => (
                        <div key={s.name} className="flex items-center justify-between rounded-lg bg-white/70 px-2 py-1 text-sm dark:bg-zinc-900/50">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-slate-800 dark:text-white">{s.name}</span>
                            {s.mode && <Badge variant="secondary" className="h-5 shrink-0 bg-teal-100 text-[10px] text-teal-700 dark:bg-teal-900 dark:text-teal-300">{s.mode}</Badge>}
                          </div>
                          <span className="shrink-0 font-semibold text-teal-700 dark:text-teal-300">₱{s.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-teal-200/80 pt-2 dark:border-teal-800">
                      <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Total</span>
                      <span className="text-lg font-bold text-teal-800 dark:text-teal-200">₱{totalServicePrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Desktop submit */}
            <div className="hidden border-t border-zinc-200/80 pt-4 dark:border-zinc-800 md:block">
              <Button onClick={handleSubmit} className="h-10 bg-[#00044a] text-white shadow-lg shadow-sky-900/20 hover:bg-[#0a1168]">
                <Plus className="mr-2 size-4" />
                Add Lead
              </Button>
            </div>
        </div>

        {/* Mobile sticky submit */}
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-sky-200/60 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
          <Button onClick={handleSubmit} className="h-11 w-full bg-gradient-to-r from-[#00044a] to-sky-700 text-white shadow-lg shadow-sky-900/25">
            <Plus className="mr-2 size-4" />
            Add Lead
          </Button>
        </div>

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