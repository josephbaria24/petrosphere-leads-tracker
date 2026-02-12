//app\add-new-leads\page.tsx

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
import { cn } from "@/lib/utils"
import EditLeadModal from '@/components/EditLeadModal'
import { Badge } from '@/components/ui/badge'

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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-card backdrop-blur-sm border-0 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href="/dashboard"
                      className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                    >
                      Manage Lead
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-slate-400 dark:text-slate-500" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-slate-900 dark:text-slate-100 font-semibold">
                      Add New Lead
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <UserPlus2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Add New Lead
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Fill out the form below to add a new lead to your CRM system
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="border-0 shadow-xl bg-white/95 dark:bg-background backdrop-blur-sm">
          <CardHeader className="pb-0">
            <div className="flex items-center space-x-3">
              <div className="">
                <UserPlus2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  Lead Information
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Complete all required fields to create a new lead entry
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Duplicate Lead Modal */}
            {duplicateLead && (
              <EditLeadModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={async (updated) => {
                  try {
                    const { error } = await supabase
                      .from("crm_leads")
                      .update(updated)
                      .eq("id", duplicateLead.id)

                    if (error) {
                      toast.error("Update failed")
                    } else {
                      toast.success("Lead updated successfully")
                    }
                  } catch {
                    toast.error("Update failed")
                  }
                }}
                lead={duplicateLead}
                currentUserName={form.captured_by || "Unknown"}
              />
            )}

            {/* Contact Information Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Contact Details</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact_name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Contact Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact_name"
                    value={form.contact_name}
                    onChange={(e) => handleChange('contact_name', e.target.value)}
                    onBlur={() => checkDuplicateLead(form.contact_name, form.email)}
                    className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    placeholder="Enter contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>Email Address <span className="text-red-500">*</span></span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => checkDuplicateLead(form.contact_name, form.email)}
                    className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    placeholder="contact@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>Phone Number <span className="text-red-500">*</span></span>
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    placeholder="+63 xxx xxx xxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mobile"
                    value={form.mobile}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    placeholder="+63 9xx xxx xxxx"
                  />
                </div>
              </div>
            </div>

            {/* Company Information Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Company Information</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    placeholder="Company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>Company Address <span className="text-red-500">*</span></span>
                  </Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    placeholder="Complete address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Region <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    open={isRegionOpen}
                    onOpenChange={setIsRegionOpen}
                    onValueChange={(val) => handleChange('region', val)}
                  >
                    <SelectTrigger
                      id="region"
                      className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    >
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="flex justify-end p-2">
                      </div>
                      {regions.map((region) => (
                        <SelectItem
                          key={region}
                          value={region}
                        >
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead_source" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Lead Source <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={isLeadSourceOpen} onOpenChange={setIsLeadSourceOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <span className="truncate">{form.lead_source || "Select lead source"}</span>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600">
                      <Command className="bg-transparent">
                        <CommandInput
                          placeholder="Search lead source..."
                          className="border-0 focus:ring-0 bg-transparent"
                        />
                        <CommandEmpty>No source found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          {leadSources.map((source) => (
                            <CommandItem
                              key={source}
                              value={source}
                              onSelect={() => {
                                handleChange('lead_source', source)
                                setIsLeadSourceOpen(false)
                              }}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", form.lead_source === source ? "opacity-100" : "opacity-0")}
                              />
                              {source}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Timeline & Status</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_contact" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    First Contact <span className="text-red-500">*</span>
                  </Label>
                  <DatePicker
                    value={form.first_contact ? new Date(form.first_contact) : undefined}
                    onChange={(date) => handleChange('first_contact', date?.toISOString() || '')}

                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_contact" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Last Contact <span className="text-red-500">*</span>
                  </Label>
                  <DatePicker
                    value={form.last_contact ? new Date(form.last_contact) : undefined}
                    onChange={(date) => handleChange('last_contact', date?.toISOString() || '')}
                  />
                </div>

                <div className="space-y-5">
                  <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Current Status <span className="text-red-500">*</span>
                  </Label>
                  <Select onValueChange={(val) => handleChange('status', val)}>
                    <SelectTrigger
                      id="status"
                      className="w-full justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-800 border-slate-300 dark:border-slate-600">
                      {leadStatuses.map(stage => (
                        <SelectItem
                          key={stage}
                          value={stage}
                          className="focus:bg-zinc-50 dark:focus:bg-zinc-900/20"
                        >
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Captured By Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Assignment</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="captured_by" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Captured By <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingDropdown('captured_by_settings')}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <Select onValueChange={(val) => handleChange('captured_by', val)}>
                  <SelectTrigger
                    id="captured_by"
                    className=" justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-800 border-slate-300 dark:border-slate-600">
                    {capturedByOptions.map(person => (
                      <SelectItem
                        key={person}
                        value={person}
                        className="focus:bg-zinc-50 dark:focus:bg-zinc-900/20"
                      >
                        {person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Or manually enter name
                  </Label>
                  <Input
                    placeholder="Enter custom name..."
                    value={form.captured_by}
                    onChange={(e) => handleChange('captured_by', e.target.value)}
                    className="justify-between bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Additional Information</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notes & Comments
                </Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-zinc-500 dark:focus:border-zinc-400 transition-colors min-h-[120px] resize-none"
                  placeholder="Add any additional notes or comments about this lead..."
                />
              </div>
            </div>

            {/* Services Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                <DollarSign className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Services & Pricing</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="service_search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Search Services
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="service_search"
                        type="text"
                        placeholder="Search for services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="pl-10 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-zinc-500 dark:focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="pt-7">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddServiceModalOpen(true)}
                      className="h-10 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto border border-zinc-200 dark:border-zinc-700">
                  {filteredServices.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <p>No services found matching your search.</p>
                    </div>
                  ) : (
                    filteredServices.map((service) => {
                      const selected = serviceDetails.find((s) => s.name === service)
                      return (
                        <div key={service} className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={!!selected}
                                onChange={(e) => handleServiceToggle(service, e.target.checked)}
                                className="w-4 h-4 text-zinc-600 bg-zinc-100 border-zinc-300 rounded focus:ring-zinc-500 dark:focus:ring-zinc-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />
                              <span className="font-medium text-slate-900 dark:text-white">{service}</span>
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteService(service)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {selected && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-7 pt-2 border-t border-zinc-200 dark:border-zinc-600">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                  Service Mode
                                </Label>
                                <Select
                                  value={selected?.mode || ''}
                                  onValueChange={(value) => handleServiceModeChange(service, value)}
                                >
                                  <SelectTrigger className="h-9 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600">
                                    <SelectValue placeholder="Select mode" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600">
                                    {SERVICE_MODES.map(mode => (
                                      <SelectItem
                                        key={mode}
                                        value={mode}
                                        className="focus:bg-zinc-50 dark:focus:bg-zinc-900/20"
                                      >
                                        {mode}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                  Price (₱)
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={selected?.price || ''}
                                  onChange={(e) => handleServicePriceChange(service, Number(e.target.value))}
                                  className="h-9 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {serviceDetails.length > 0 && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/20 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center space-x-2 mb-3">
                      <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Selected Services</h4>
                    </div>

                    <div className="space-y-2 mb-4">
                      {serviceDetails.map((s) => (
                        <div key={s.name} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                          <div className="flex-1">
                            <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                            {s.mode && (
                              <Badge variant="secondary" className="ml-2 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-slate-300">
                                {s.mode}
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white">₱{s.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Amount:</span>
                      <span className="text-xl font-bold text-blue-900 dark:text-blue-100">₱{totalServicePrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                onClick={handleSubmit}

              >
                <Plus className="w-5 h-5 mr-2" />
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
                        editingDropdown === 'leadSources' ? 'lead_sources' : 'lead_statuses'

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
                        editingDropdown === 'leadSources' ? 'lead_sources' : 'lead_statuses'

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