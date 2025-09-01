'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { DatePicker } from '@/components/date-picker'
import { supabase } from '@/lib/supabase'


export type Lead = {
  id: string
  contact_name: string
  email: string
  phone?: string
  mobile?: string
  company?: string
  status?: string
  region?: string
  service_product?: string
  lead_source?: string
  first_contact?: string
  last_contact?: string
  captured_by?: string
  notes?: string
  created_at?: string
  updated_at?: string
}


interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updated: Partial<Lead>) => void
  lead: Lead
  currentUserName: string
}

const leadStages = [
  'Lead In', 'Contact Made', 'Needs Defined', 'Proposal Sent','Negotiation Started','For Follow up',
  'Closed Win', 'Closed Lost'
]

const regions = [
  'N/A', 'Region I - Ilocos Region', 'Region II - Cagayan Valley',
  'Region III - Central Luzon', 'Region IV-A - CALABARZON', 'MIMAROPA Region',
  'Region V - Bicol Region', 'Region VI - Western Visayas', 'Region VII - Central Visayas',
  'Region VIII - Eastern Visayas', 'Region IX - Zamboanga Peninsula', 'Region X - Northern Mindanao',
  'Region XI - Davao Region', 'Region XII - SOCCSKSARGEN', 'Region XIII - Caraga',
  'NCR - National Capital Region', 'CAR - Cordillera Administrative Region', 'BARMM - Bangsamoro Autonomous Region in Muslim Mindanao',
  'NIR - Negros Island Region'
]

const leadSources = [
  'facebook', 'viber', 'teams', 'phone call', 'tawk.to', 'unknown',
  'phone Text', 'site Visit', 'peza', 'e-mail', 'google'
]

const capturedByOptions = [
  'Ross','Randy', 'Michelle', 'Harthwell','Sergs', 'Krezel', 'Carmela','Other'
]



const EditLeadModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSave, lead,currentUserName  }) => {
  const [edited, setEdited] = useState<Partial<Lead>>({})

  useEffect(() => {
    if (lead) setEdited({ ...lead })
  }, [lead])

  const handleChange = (key: keyof Lead, value: string) => {
    setEdited(prev => ({ ...prev, [key]: value }))
  }

  const renderField = (key: keyof Lead, value: string | undefined) => {
    switch (key) {
      case 'status':
        return (
          <Select value={value || ''} onValueChange={(val) => handleChange(key as keyof Lead, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {leadStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )
      case 'region':
        return (
          <Select value={value || ''} onValueChange={(val) => handleChange(key as keyof Lead, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        )
      case 'lead_source':
        return (
          <Select value={value || ''} onValueChange={(val) => handleChange(key as keyof Lead, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {leadSources.map(src => <SelectItem key={src} value={src}>{src}</SelectItem>)}
            </SelectContent>
          </Select>
        )
      case 'captured_by':
        return (
          <>
            <Select value={value || ''} onValueChange={(val) => handleChange(key as keyof Lead, val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {capturedByOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="mt-1"
              placeholder="Or type name"
              value={value || ''}
              onChange={(e) => handleChange(key as keyof Lead, e.target.value)}
            />
          </>
        )
      case 'first_contact':
      case 'last_contact':
        return (
          <DatePicker
            value={value ? new Date(value) : undefined}
            onChange={(date) => handleChange(key as keyof Lead, date?.toISOString() || '')}
          />
        )
      case 'notes':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(key as keyof Lead, e.target.value)}
          />
        )
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(key as keyof Lead, e.target.value)}
          />
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="space-y-4 max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
    <DialogTitle>Edit Lead</DialogTitle>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Put status dropdown first */}
      <div>
        <Label className="text-sm font-medium capitalize block mb-1">Status</Label>
        {renderField('status', edited.status)}
      </div>

      {/* Render the rest except status and id */}
      {Object.entries(edited)
        .filter(([key]) => key !== 'id' && key !== 'status')
        .map(([key, value]) => (
          <div key={key}>
            <Label className="text-sm font-medium capitalize block mb-1">
              {key.replace(/_/g, ' ')}
            </Label>
            {renderField(key as keyof Lead, value)}
          </div>
        ))}
    </div>

    <div className="flex justify-end pt-2">
    <Button
      onClick={async () => {
        await onSave(edited)

        // ✅ Sync proposal tracker based on new status
        const fullCompanyName = `${edited.company ?? ''}`;
        const { data: existingProposal, error: findError } = await supabase
          .from('proposals_tracker')
          .select('id')
          .ilike('company_organization', fullCompanyName)
          .ilike('email', edited.email || '')
          .maybeSingle();

        if (edited.status?.toLowerCase() === 'proposal sent') {
          // If status is now "Proposal Sent" and no matching proposal exists, insert it
          if (!existingProposal) {
            await supabase.from('proposals_tracker').insert([{
              company_organization: fullCompanyName,
              phone: edited.phone || '',
              email: edited.email || '',
              region: edited.region || '',
              date_requested: new Date().toISOString().split("T")[0],
              course_requested: edited.service_product || '',
              status: edited.status,
              person_in_charge: edited.captured_by || '',
              user_id: (await supabase.auth.getUser()).data.user?.id,
            }]);
          } else {
            // Proposal exists, just update status and other fields
            await supabase.from('proposals_tracker').update({
              phone: edited.phone || '',
              region: edited.region || '',
              course_requested: edited.service_product || '',
              status: edited.status,
              person_in_charge: edited.captured_by || '',
            }).eq('id', existingProposal.id);
          }
        } else if (existingProposal) {
          // If status is now NOT "Proposal Sent" but a proposal exists, update its status
          await supabase.from('proposals_tracker').update({
            status: edited.status,
          }).eq('id', existingProposal.id);
        }

        // ✅ Log the activity
        await supabase.from('activity_logs').insert({
          user_name: currentUserName,
          action: 'edited',
          entity_type: 'lead',
        })

        onClose()
      }}
    >
      Save Changes
    </Button>

    </div>
  </DialogContent>
</Dialog>

  )
}
export default EditLeadModal