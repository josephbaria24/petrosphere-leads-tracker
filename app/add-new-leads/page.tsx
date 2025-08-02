'use client'

import { useState, useEffect  } from 'react'
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



  const [serviceDetails, setServiceDetails] = useState<
  {
      name: string
      mode: string
      price: number
    }[]
  >([])

  const [serviceSearch, setServiceSearch] = useState('')


  const [form, setForm] = useState({
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
  })

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }
  

  const validateForm = () => {
    const requiredFields = [
      'contact_name', 'email', 'phone', 'mobile', 'company', 'address',
      'region', 'lead_source', 'status', 'captured_by', 'first_contact', 'last_contact'
    ]
  
    for (const field of requiredFields) {
      if (!form[field as keyof typeof form]) {
        toast.error('Missing Required Field', {
          description: `Please fill out or select: ${field.replace(/_/g, ' ')}`,
        })
        return false
      }
    }
  
    const hasIncompleteServices = serviceDetails.some(s => !s.mode || !s.price)
    if (serviceDetails.length === 0 || hasIncompleteServices) {
      toast.error('Incomplete Service Info', {
        description: 'Please select at least one service with mode and price.',
      })
      return false
    }
  
    return true
  }
  
  const [isLeadSourceOpen, setIsLeadSourceOpen] = useState(false)
  const handleSubmit = async () => {
    if (!validateForm()) return;
  
    const fullCompany = `${form.company} - ${form.address}`.trim();
    const selectedNames = serviceDetails.map((s) => s.name).join(', ');
    const totalPrice = serviceDetails.reduce((sum, s) => sum + s.price, 0);
    const allModes = serviceDetails.map((s) => s.mode).filter(Boolean).join(', ');
    const firstName = form.captured_by?.split(' ')[0] || form.captured_by;
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
  
    let fullName = 'Unknown';
  
    if (user && !userError) {
      const { data: profile, error: profileError } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
  
      if (profile && !profileError) {
        fullName = profile.full_name;
      }
    }
  
    const { error } = await supabase.from('crm_leads').insert([
      {
        ...form,
        captured_by: firstName,
        company: fullCompany,
        service_product: selectedNames,
        service_price: totalPrice,
        mode_of_service: allModes,
      },
    ]);
  
    if (error) {
      toast.error('Submission Failed', {
        description: error.message || 'Could not save lead. Please try again.',
      });
    } else {
      toast.success('Lead Submitted', {
        description: 'The new lead has been successfully added.',
      });
  
      // Reset form
      setForm({
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
      });
  
      // Insert activity log
      await supabase.from('activity_logs').insert({
        user_name: fullName,
        action: 'added',
        entity_type: 'lead',
      });
    }
  };
  



  const fetchTable = async (table: 'regions' | 'lead_sources' | 'lead_statuses') => {
    const { data, error } = await supabase.from(table).select('name')
    if (error) {
      toast.error(`Failed to fetch ${table}`, { description: error.message })
      return
    }
  
    const names = data.map((d) => d.name)
    if (table === 'regions') setRegions(names)
    else if (table === 'lead_sources') setLeadSources(names)
    else if (table === 'lead_statuses') setLeadStatuses(names)
  }



  useEffect(() => {
    const fetchOptions = async () => {
      await Promise.all([
        fetchTable('regions'),
        fetchTable('lead_sources'),
        fetchTable('lead_statuses'),
      ])
  
      const { data: services, error: serviceError } = await supabase.from('services').select('*')
      if (serviceError) {
        toast.error('Failed to fetch services', { description: serviceError.message })
        return
      }
  
      setServicePrices(
        services?.reduce((acc, cur) => {
          acc[cur.name] = cur.price
          return acc
        }, {} as Record<string, number>) || {}
      )
    }
  
    fetchOptions()
  }, [])
  

   // 🔐 Redirect if not logged in
   useEffect(() => {
    if (session === null) {
      router.replace('/login')
    } else if (session) {
      setIsReady(true)
    }
  }, [session, router])

  if (!isReady) {
    return <div className="p-10 text-center">Loading...</div> // Optional spinner
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Topbar */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" value={form.contact_name} onChange={(e) => handleChange('contact_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" value={form.mobile} onChange={(e) => handleChange('mobile', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={form.company} onChange={(e) => handleChange('company', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="address">Company Address</Label>
                <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                />
                </div>

            {/* Region dropdown */}
            <div>
            <Label htmlFor="region">Region</Label>
              <div className="relative">
              <Select
                  open={isRegionOpen}
                  onOpenChange={setIsRegionOpen}
                  onValueChange={(val) => handleChange('region', val)}
                >
                  <SelectTrigger id="region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Edit Icon */}
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

                    {/* Dropdown Items */}
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
           
            {/* Lead Source dropdown */}
            <div className="w-full">
              <Label htmlFor="lead_source">Lead Source</Label>
              <Popover open={isLeadSourceOpen} onOpenChange={setIsLeadSourceOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="lead_source"
                    role="combobox"
                    aria-expanded={isLeadSourceOpen}
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
                      {[...new Set(leadSources)].map((source) => (
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


            {/* first and last contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        {/* Status dropdown */}
            <div >
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(val) => handleChange('status', val) }>
                <SelectTrigger className='cursor-pointer' id="status">
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
          {/* Captured by */}
          <div>
            <Label htmlFor="captured_by">Captured By</Label>
            <div className="space-y-1">
                <Select onValueChange={(val) => handleChange('captured_by', val)}>
                <SelectTrigger className='cursor-pointer' id="captured_by">
                    <SelectValue placeholder="Select user or type below" />
                </SelectTrigger>
                <SelectContent>
                    {['Ross','Randy', 'Michelle', 'Harthwell','Sergs', 'Krezel', 'Carmela','Other'].map(person => (
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

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>
          
             {/* Service dropdown */}
             <div>
             <Label htmlFor="service_product">Service/Product</Label>

            {/* Search Bar */}
            <div className="mb-2">
              <Input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            {/* Filtered Services List */}
<div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto border p-2 rounded-md">

          {Object.keys(servicePrices)
            .filter(service =>
              service.toLowerCase().includes(serviceSearch.toLowerCase())
            )
            .map((service) => {
              const selected = serviceDetails.find((s) => s.name === service)

              return (
                <div
                  key={service}
                  className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center border-b pb-2"
                >
                  {/* Checkbox + name */}
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setServiceDetails((prev) => [
                            ...prev,
                            { name: service, mode: '', price: 0 },
                          ])
                        } else {
                          setServiceDetails((prev) =>
                            prev.filter((s) => s.name !== service)
                          )
                        }
                      }}
                    />
                    <span>{service}</span>
                  </label>

                  {/* Mode of Service Dropdown */}
                  <Select
                    value={selected?.mode || ''}
                    onValueChange={(value) => {
                      setServiceDetails((prev) =>
                        prev.map((s) =>
                          s.name === service ? { ...s, mode: value } : s
                        )
                      )
                    }}
                    disabled={!selected}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Mode of Service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Face to Face">Face to Face</SelectItem>
                      <SelectItem value="E-learning">E-learning</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                    </SelectContent>
                  </Select>

                {/* Price Input */}
                <Input
                  type="number"
                  placeholder="₱0.00"
                  value={selected?.price || ''}
                  onChange={(e) => {
                    setServiceDetails((prev) =>
                      prev.map((s) =>
                        s.name === service
                          ? { ...s, price: Number(e.target.value) }
                          : s
                      )
                    )
                  }}
                  disabled={!selected}
                />
              </div>
            )
          })}
        </div>

            {/* Summary Output */}
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
                  <strong>Total Price:</strong> ₱
                  {serviceDetails.reduce((sum, s) => sum + s.price, 0).toFixed(2)}
                </p>
              </div>
            )}
          </div>


          {/* Submit */}
          <Button onClick={handleSubmit} className='cursor-pointer'>Submit Lead</Button>
        </CardContent>
      </Card>


      {/* Editing dropdown */}
      {editingDropdown && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative overflow-hidden">
            {/* Top Close Button */}

            <div className="max-h-[90vh] overflow-y-auto p-6 pt-10">
              
           
            <button
              onClick={() => setEditingDropdown(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-lg"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Modal Content */}
            <div className="p-6 pt-10"> {/* Extra top padding for close button */}
            <EditListModal
              title={
                editingDropdown === 'regions'
                  ? 'Regions'
                  : editingDropdown === 'leadSources'
                  ? 'Lead Sources'
                  : 'Lead Statuses'
              }
              values={
                editingDropdown === 'regions'
                  ? regions
                  : editingDropdown === 'leadSources'
                  ? leadSources
                  : leadStatuses
              }
              onAdd={async (val) => {
                if (!val) return
                const table =
                  editingDropdown === 'regions'
                    ? 'regions'
                    : editingDropdown === 'leadSources'
                    ? 'lead_sources'
                    : 'lead_statuses'

                const { error } = await supabase.from(table).insert({ name: val })
                if (error) {
                  toast.error('Add failed', { description: error.message })
                } else {
                  await fetchTable(table)
                  toast.success('Added successfully')
                }
              }}
              onEdit={async (oldVal, newVal) => {
                if (!newVal) return
                const table =
                  editingDropdown === 'regions'
                    ? 'regions'
                    : editingDropdown === 'leadSources'
                    ? 'lead_sources'
                    : 'lead_statuses'

                const { error } = await supabase.from(table).update({ name: newVal }).eq('name', oldVal)
                if (error) {
                  toast.error('Update failed', { description: error.message })
                } else {
                  await fetchTable(table)
                  toast.success('Updated successfully')
                }
              }}
              onDelete={async (val) => {
                const table =
                  editingDropdown === 'regions'
                    ? 'regions'
                    : editingDropdown === 'leadSources'
                    ? 'lead_sources'
                    : 'lead_statuses'

                const { error } = await supabase.from(table).delete().eq('name', val)
                if (error) {
                  toast.error('Delete failed', { description: error.message })
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
        </div>
      )}

    </div>
  )
}
