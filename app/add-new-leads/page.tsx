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
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useSession } from '@supabase/auth-helpers-react'
import { DatePicker } from '@/components/date-picker'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import EditLeadModal from '@/components/EditLeadModal'

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

const CAPTURED_BY_OPTIONS = ['Ross', 'Randy', 'Michelle', 'Harthwell', 'Sergs', 'Krezel', 'Carmela', 'Other']
const SERVICE_MODES = ['Face to Face', 'E-learning', 'Online']

export default function AddNewLeadPage() {
  const router = useRouter()
  const session = useSession()

  const [isReady, setIsReady] = useState(false)
  const [regions, setRegions] = useState<string[]>([])
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [leadStatuses, setLeadStatuses] = useState<string[]>([])
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({})
  const [editingDropdown, setEditingDropdown] = useState<string | null>(null)
  const [isRegionOpen, setIsRegionOpen] = useState(false)
  const [isLeadSourceOpen, setIsLeadSourceOpen] = useState(false)
  const [duplicateLead, setDuplicateLead] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [serviceDetails, setServiceDetails] = useState<Array<{ name: string; mode: string; price: number }>>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [form, setForm] = useState(INITIAL_FORM_STATE)
  
  // Use refs to avoid re-renders on intermediate values
  const duplicateCheckTimeoutRef = useRef<NodeJS.Timeout| null>(null)
  
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

  const fetchTable = useCallback(async (table: 'regions' | 'lead_sources' | 'lead_statuses') => {
    try {
      const { data, error } = await supabase.from(table).select('name')
      if (error) throw error

      const names = data.map(d => d.name)
      if (table === 'regions') setRegions(names)
      else if (table === 'lead_sources') setLeadSources(names)
      else if (table === 'lead_statuses') setLeadStatuses(names)
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

  // Auth check
  useEffect(() => {
    if (session === null) {
      router.replace('/login')
    } else if (session) {
      setIsReady(true)
    }
  }, [session, router])

  if (!isReady) {
    return <div className="p-10 text-center">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 pl-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Manage Lead</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Add New Lead</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
      <Separator className="my-4" />
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                onBlur={() => checkDuplicateLead(form.contact_name, form.email)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => checkDuplicateLead(form.contact_name, form.email)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={form.phone} 
                onChange={(e) => handleChange('phone', e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input 
                id="mobile" 
                value={form.mobile} 
                onChange={(e) => handleChange('mobile', e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input 
                id="company" 
                value={form.company} 
                onChange={(e) => handleChange('company', e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="address">Company Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <Select
                open={isRegionOpen}
                onOpenChange={setIsRegionOpen}
                onValueChange={(val) => handleChange('region', val)}
              >
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <div className="flex justify-end p-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsRegionOpen(false)
                        setEditingDropdown('regions')
                      }}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      ✎ Edit
                    </button>
                  </div>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
           
            <div className="w-full">
              <Label htmlFor="lead_source">Lead Source</Label>
              <Popover open={isLeadSourceOpen} onOpenChange={setIsLeadSourceOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="lead_source"
                    role="combobox"
                    className="w-full p-2 border rounded-md text-left flex items-center justify-between"
                  >
                    <span>{form.lead_source || "Select source"}</span>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search lead source..." />
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

            <div className="grid grid-cols-2 gap-4 col-span-full">
              <div>
                <Label htmlFor="first_contact">First Contact</Label>
                <DatePicker
                  value={form.first_contact ? new Date(form.first_contact) : undefined}
                  onChange={(date) => handleChange('first_contact', date?.toISOString() || '')}
                />
              </div>
              <div>
                <Label htmlFor="last_contact">Last Contact</Label>
                <DatePicker
                  value={form.last_contact ? new Date(form.last_contact) : undefined}
                  onChange={(date) => handleChange('last_contact', date?.toISOString() || '')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(val) => handleChange('status', val)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {leadStatuses.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="captured_by">Captured By</Label>
            <div className="space-y-1">
              <Select onValueChange={(val) => handleChange('captured_by', val)}>
                <SelectTrigger id="captured_by">
                  <SelectValue placeholder="Select user or type below" />
                </SelectTrigger>
                <SelectContent>
                  {CAPTURED_BY_OPTIONS.map(person => (
                    <SelectItem key={person} value={person}>
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or manually enter name"
                value={form.captured_by}
                onChange={(e) => handleChange('captured_by', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              value={form.notes} 
              onChange={(e) => handleChange('notes', e.target.value)} 
            />
          </div>
          
          <div>
            <Label htmlFor="service_product">Service/Product</Label>
            <div className="mb-2">
              <Input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto border p-2 rounded-md">
              {filteredServices.map((service) => {
                const selected = serviceDetails.find((s) => s.name === service)
                return (
                  <div key={service} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center border-b pb-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={(e) => handleServiceToggle(service, e.target.checked)}
                      />
                      <span>{service}</span>
                    </label>

                    <Select
                      value={selected?.mode || ''}
                      onValueChange={(value) => handleServiceModeChange(service, value)}
                      disabled={!selected}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Mode of Service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_MODES.map(mode => (
                          <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="₱0.00"
                      value={selected?.price || ''}
                      onChange={(e) => handleServicePriceChange(service, Number(e.target.value))}
                      disabled={!selected}
                    />
                  </div>
                )
              })}
            </div>

            {serviceDetails.length > 0 && (
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <strong>Selected:</strong>
                <ul className="list-disc list-inside">
                  {serviceDetails.map((s) => (
                    <li key={s.name}>
                      {s.name} – {s.mode} – ₱{s.price.toFixed(2)}
                    </li>
                  ))}
                </ul>
                <p>
                  <strong>Total Price:</strong> ₱{totalServicePrice.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <Button onClick={handleSubmit}>Submit Lead</Button>
        </CardContent>
      </Card>

      {editingDropdown && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative overflow-hidden">
            <button
              onClick={() => setEditingDropdown(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-lg"
            >
              ✕
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-6 pt-10">
              <EditListModal
                title={
                  editingDropdown === 'regions' ? 'Regions' :
                  editingDropdown === 'leadSources' ? 'Lead Sources' : 'Lead Statuses'
                }
                values={
                  editingDropdown === 'regions' ? regions :
                  editingDropdown === 'leadSources' ? leadSources : leadStatuses
                }
                onAdd={async (val) => {
                  if (!val) return
                  const table = 
                    editingDropdown === 'regions' ? 'regions' :
                    editingDropdown === 'leadSources' ? 'lead_sources' : 'lead_statuses'

                  const { error } = await supabase.from(table).insert({ name: val })
                  if (error) {
                    toast.error('Add failed')
                  } else {
                    await fetchTable(table)
                    toast.success('Added successfully')
                  }
                }}
                onEdit={async (oldVal, newVal) => {
                  if (!newVal) return
                  const table = 
                    editingDropdown === 'regions' ? 'regions' :
                    editingDropdown === 'leadSources' ? 'lead_sources' : 'lead_statuses'

                  const { error } = await supabase.from(table).update({ name: newVal }).eq('name', oldVal)
                  if (error) {
                    toast.error('Update failed')
                  } else {
                    await fetchTable(table)
                    toast.success('Updated successfully')
                  }
                }}
                onDelete={async (val) => {
                  const table = 
                    editingDropdown === 'regions' ? 'regions' :
                    editingDropdown === 'leadSources' ? 'lead_sources' : 'lead_statuses'

                  const { error } = await supabase.from(table).delete().eq('name', val)
                  if (error) {
                    toast.error('Delete failed')
                  } else {
                    await fetchTable(table)
                    toast.success('Deleted successfully')
                  }
                }}
                onSave={() => setEditingDropdown(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}