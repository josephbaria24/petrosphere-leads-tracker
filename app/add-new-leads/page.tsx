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
  const [isRegionOpen, setIsRegionOpen] = useState(false)

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
  

  const fetchRegions = async () => {
    const { data, error } = await supabase.from('regions').select('name')
    if (error) {
      toast.error('Failed to fetch regions', { description: error.message })
    } else {
      setRegions(data.map(r => r.name))
    }
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
