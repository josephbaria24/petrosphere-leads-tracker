'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { DatePicker } from '@/components/date-picker'



// Status stages
const leadStages = [
  'Lead In',
  'Contact Made',
  'Needs Defined',
  'Proposal Sent',
  'Negotiation Started',
  'Closed Win',
  'Closed Lost',
]

// Sample region list (customize as needed)
const regions = [
    'N/A',
    'Region I - Ilocos Region',
    'Region II - Cagayan Valley',
    'Region III - Central Luzon',
    'Region IV-A - CALABARZON',
    'MIMAROPA Region',
    'Region V - Bicol Region',
    'Region VI - Western Visayas',
    'Region VII - Central Visayas',
    'Region VIII - Eastern Visayas',
    'Region IX - Zamboanga Peninsula',
    'Region X - Northern Mindanao',
    'Region XI - Davao Region',
    'Region XII - SOCCSKSARGEN',
    'Region XIII - Caraga',
    'NCR - National Capital Region',
    'CAR - Cordillera Administrative Region',
    'BARMM - Bangsamoro Autonomous Region in Muslim Mindanao',
  ]
  

// Services from your list
const services = [
  'BOSH SO2', 'MESH', 'COSH', 'BOSH SO1', 'UNKNOWN', 'SAFETY COURSES',
  'FOOD SAFETY', 'SFAT', 'ACLS', 'FST', 'LCM', 'ACLS AND BLS', 'NEBOSH',
  'IOSH', 'BLS', 'MANDATORY COURSES', 'BLS & ACLS', 'PCO', 'TOT', 'WAH',
  'FIRST AID DOLE COURSES', 'BOSH SO3', 'CONFINED SPACE ENTRY', 'CSC', 'OFAT',
  'BFAT', 'FIRS AID DOLE COURSES', 'OIL AND GAS', 'ISO COURSES',
  'ADVANCED FOOD SAFETY', 'ISO:9001', 'FOOD SAFETY, SPA', 'SPA', 'BOSH',
  'LOTO', 'CONFINED SPACE', 'IELTS', 'SCAFFOLDING TRAINING', 'RIG MEDIC'
]

// Lead sources
const leadSources = [
  'facebook', 'viber', 'teams', 'phone call', 'tawk.to', 'unknown',
  'phone Text', 'site Visit', 'peza', 'e-mail', 'google'
]

export default function AddNewLeadPage() {
  const [form, setForm] = useState({
    contact_name: '',
    email: '',
    phone: '',
    mobile: '',
    company: '',
    address: '',
    region: '',
    service_product: '',
    lead_source: '',
    notes: '',
    status: '',
    captured_by: '',
    first_contact: null,
    last_contact: null,
  })

  const handleChange = (field: string, value: string) => {
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
        lead_source: '',
        notes: '',
        status: '',
        captured_by: '',
        first_contact: null,
        last_contact: null,
      })
    }
  }
  

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
              <Label htmlFor="phone">Mobile</Label>
              <Input id="phone" value={form.mobile} onChange={(e) => handleChange('phone', e.target.value)} />
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
              <Select onValueChange={(val) => handleChange('region', val)}>
                <SelectTrigger className='cursor-pointer' id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Service dropdown */}
            <div>
              <Label htmlFor="service_product">Service/Product</Label>
              <Select onValueChange={(val) => handleChange('service_product', val)}>
                <SelectTrigger className='cursor-pointer' id="service_product">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {services.map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {leadStages.map(stage => (
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

          {/* Submit */}
          <Button onClick={handleSubmit} className='cursor-pointer'>Submit Lead</Button>
        </CardContent>
      </Card>
    </div>
  )
}
