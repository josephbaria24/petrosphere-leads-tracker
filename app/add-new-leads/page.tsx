'use client'

import { useState, useEffect  } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import EditListModal from '@/components/shared/EditListModal'

import { DatePicker } from '@/components/date-picker'





export default function AddNewLeadPage() {

  const [selectedServices, setSelectedServices] = useState<string[]>([])


  const [regions, setRegions] = useState<string[]>([])
  const [leadSources, setLeadSources] = useState<string[]>([])
  const [leadStatuses, setLeadStatuses] = useState<string[]>([])
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({})
  const [editingDropdown, setEditingDropdown] = useState<string | null>(null)

  const [form, setForm] = useState({
    contact_name: '',
    email: '',
    phone: '',
    mobile: '',
    company: '',
    address: '',
    region: '',
    service_product: '',
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
  

  const handleSubmit = async () => {
    const fullCompany = `${form.company} - ${form.address}`.trim()
  
    const { error } = await supabase.from('crm_leads').insert([
      {
        ...form,
        company: fullCompany,
      },
    ])
  
    if (error) {
      toast.error('Submission Failed', {
        description: error.message || 'Could not save lead. Please try again.',
      })
    } else {
      toast.success('Lead Submitted', {
        description: 'The new lead has been successfully added.',
      })
  
      setForm({
        contact_name: '',
        email: '',
        phone: '',
        mobile: '',
        company: '',
        address: '',
        region: '',
        service_product: '',
        service_price: 0,
        lead_source: '',
        notes: '',
        status: '',
        captured_by: '',
        first_contact: null,
        last_contact: null,
      })
    }
  }




useEffect(() => {
  const fetchOptions = async () => {
    const [regionRes, sourceRes, statusRes, serviceRes] = await Promise.all([
      supabase.from('regions').select('name'),
      supabase.from('lead_sources').select('name'),
      supabase.from('lead_statuses').select('name'),
      supabase.from('services').select('*'),
    ])

    if (regionRes.error || sourceRes.error || statusRes.error || serviceRes.error) {
      console.error('Error fetching dropdown data:', {
        region: regionRes.error,
        source: sourceRes.error,
        status: statusRes.error,
        services: serviceRes.error,
      })
      return
    }

    // ✅ These are now in the correct scope
    console.log('Regions:', regionRes.data)
    console.log('Lead Sources:', sourceRes.data)
    console.log('Statuses:', statusRes.data)
    console.log('Services:', serviceRes.data)
    console.log('Fetched Services:', serviceRes.data)
    console.log('Service Fetch Error:', serviceRes.error)


    setRegions(regionRes.data?.map(r => r.name) || [])
    setLeadSources(sourceRes.data?.map(s => s.name) || [])
    setLeadStatuses(statusRes.data?.map(s => s.name) || [])
    setServicePrices(
      serviceRes.data?.reduce((acc, cur) => {
        acc[cur.name] = cur.price
        return acc
      }, {} as Record<string, number>) || {}
    )
  }

  fetchOptions()
}, [])

  

  return (
    <div className="max-w-7xl mx-auto p-6">
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
                <Select onValueChange={(val) => handleChange('region', val)}>
                  <SelectTrigger id="region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Edit Icon */}
                    <div className="flex justify-end p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingDropdown('regions') // open modal or inline edit
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
            <div>
              <Label htmlFor="lead_source">Lead Source</Label>
              <Select onValueChange={(val) => handleChange('lead_source', val)}>
                <SelectTrigger className='cursor-pointer' id="lead_source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    {['Randy Moscoso', 'Michelle Saclet', 'Sergs Carlo Dosong', 'Krezel Guarda', 'Carmela Joice Padilla','Other'].map(person => (
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
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border p-2 rounded-md">
            {Object.keys(servicePrices).map((service) => (
                <label key={service} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...selectedServices, service]
                        : selectedServices.filter((s) => s !== service)
                    
                      const totalPrice = updated.reduce(
                        (sum, s) => sum + (servicePrices[s] || 0),
                        0
                      )
                    
                      setSelectedServices(updated)
                      handleChange('service_product', updated.join(', '))
                      handleChange('service_price', totalPrice) // 👈 store total
                    }}
                    
                  />
                  <span>{service} - ₱{servicePrices[service] || 'N/A'}</span>
                  
                </label>
              ))}
            </div>
            {selectedServices.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Total Price:</strong> ₱{form.service_price}
                  </p>
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
                  if (!error) {
                    if (editingDropdown === 'regions') setRegions(prev => [...prev, val])
                    if (editingDropdown === 'leadSources') setLeadSources(prev => [...prev, val])
                    if (editingDropdown === 'leadStatuses') setLeadStatuses(prev => [...prev, val])
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
                  if (!error) {
                    if (editingDropdown === 'regions') setRegions(prev => prev.map(r => (r === oldVal ? newVal : r)))
                    if (editingDropdown === 'leadSources') setLeadSources(prev => prev.map(s => (s === oldVal ? newVal : s)))
                    if (editingDropdown === 'leadStatuses') setLeadStatuses(prev => prev.map(s => (s === oldVal ? newVal : s)))
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
                  if (!error) {
                    if (editingDropdown === 'regions') setRegions(prev => prev.filter(r => r !== val))
                    if (editingDropdown === 'leadSources') setLeadSources(prev => prev.filter(s => s !== val))
                    if (editingDropdown === 'leadStatuses') setLeadStatuses(prev => prev.filter(s => s !== val))
                  }
                }
              }
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
