'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DatePicker } from '@/components/date-picker'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Circle, Clock } from 'lucide-react'
import { toast } from 'sonner'

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
  service_price?: number
  first_contact?: string
  last_contact?: string
  captured_by?: string
  mode_of_service?: string;
  notes?: string
  created_at?: string
  updated_at?: string
}

export type Service = {
  id: number
  name: string
  price?: number
  created_at?: string
}

export type LeadHistory = {
  id: string
  lead_id: string
  field_changed: string
  old_value?: string | null
  new_value?: string | null
  changed_by: string
  changed_at: string
  action: string
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

const modeOfServiceOptions = ['Face to Face', 'E-learning', 'Online']

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

export type LeadSource = {
  id: number
  name: string
  created_at?: string
}
const capturedByOptions = [
  'Ross','Randy', 'Michelle', 'Harthwell','Sergs', 'Krezel', 'Carmela','Other'
]

const EditLeadModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSave, lead, currentUserName }) => {
  const [edited, setEdited] = useState<Partial<Lead>>({})
  const [services, setServices] = useState<Service[]>([])
  const [leadSources, setLeadSources] = useState<LeadSource[]>([])
  const [leadHistory, setLeadHistory] = useState<LeadHistory[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingSources, setLoadingSources] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (lead) setEdited({ ...lead })
  }, [lead])

  // Fetch services from Supabase
  useEffect(() => {
    const fetchServices = async () => {
      if (!isOpen) return
      
      setLoadingServices(true)
      try {
        const { data, error } = await supabase
        .from('services')
        .select('id, name, price, created_at')
        .order('name')

        if (error) throw error
        setServices(data || [])
      } catch (error) {
        console.error('Error fetching services:', error)
        setServices([])
      } finally {
        setLoadingServices(false)
      }
    }

    fetchServices()
  }, [isOpen])

    // Fetch lead sources dynamically
    useEffect(() => {
      const fetchSources = async () => {
        if (!isOpen) return
        setLoadingSources(true)
        try {
          const { data, error } = await supabase
            .from('lead_sources')
            .select('id, name, created_at')
            .order('name')
          if (error) throw error
          setLeadSources(data || [])
        } catch (error) {
          console.error('Error fetching lead sources:', error)
          setLeadSources([])
        } finally {
          setLoadingSources(false)
        }
      }
      fetchSources()
    }, [isOpen])


  // Fetch lead history
  useEffect(() => {
    const fetchLeadHistory = async () => {
      if (!isOpen || !lead?.id) return
      
      setLoadingHistory(true)
      try {
        const { data, error } = await supabase
          .from('lead_history')
          .select('*')
          .eq('lead_id', lead.id)
          .order('changed_at', { ascending: false })
          .limit(20)

        if (error) throw error
        setLeadHistory(data || [])
      } catch (error) {
        console.error('Error fetching lead history:', error)
        setLeadHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchLeadHistory()
  }, [isOpen, lead?.id])

  const handleChange = (key: keyof Lead, value: string | number | undefined) => {
    setEdited(prev => ({ ...prev, [key]: value }))
  }
  

  const handleStatusChange = (newStatus: string) => {
    setEdited(prev => ({ ...prev, status: newStatus }))
  }



  const StatusTimeline = ({ currentStatus }: { currentStatus?: string }) => {
    const getStatusIndex = (status: string) => {
      return leadStages.findIndex(stage => stage === status)
    }
  
    const currentIndex = currentStatus ? getStatusIndex(currentStatus) : -1
    const mainStages = leadStages.slice(0, -2) // Exclude 'Closed Win' and 'Closed Lost'
  
    return (
      <div className="relative w-full py-8 px-4">
        {/* Main horizontal timeline */}
        <div className="flex items-center relative">
          {/* Progress background line */}
          <div className="absolute top-1/2 left-15 right-8 h-0.5 bg-gray-200 -translate-y-1/2"></div>
  
          {/* Progress fill line */}
          <div
            className="absolute top-1/2 left-15 h-0.5 bg-blue-500 -translate-y-1/2 transition-all duration-1000 ease-in-out"
            style={{
              width: currentIndex >= 0 && currentIndex < mainStages.length
                ? `${(currentIndex / (mainStages.length - 1)) * (100 - 80 / mainStages.length)}%`
                : currentStatus === "Closed Win" || currentStatus === "Closed Lost"
                ? `${(100 - 80 / mainStages.length)}%`
                : "0%",
            }}
          ></div>
  
          {/* Main timeline stages */}
          {mainStages.map((stage, index) => {
            const isActive = index === currentIndex
            const isCompleted = index < currentIndex ||
              (currentStatus === "Closed Win" || currentStatus === "Closed Lost") && index === mainStages.length - 1
  
            const labelOnTop = index % 2 === 0 // alternate
  
            return (
              <div
                key={stage}
                onClick={() => handleStatusChange(stage)}
                className="flex flex-col items-center cursor-pointer group relative z-10"
                style={{
                  flex: index === mainStages.length - 1 ? '0 0 auto' : '1',
                  marginRight: index === mainStages.length - 1 ? '80px' : '0'
                }}
              >
                {/* Label above if even index */}
                {labelOnTop && (
                  <span
                    className={`mb-2 text-xs font-medium text-center ${
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {stage}
                  </span>
                )}
  
                {/* Circle with conditional margin */}
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 shadow-sm
                    ${labelOnTop ? "mb-6" : "mt-6"}
                    ${
                      isCompleted
                        ? "bg-blue-500 text-white border-2 border-blue-500"
                        : isActive
                        ? "bg-blue-500 text-white border-2 border-blue-500"
                        : "bg-white border-2 border-gray-500 text-white group-hover:border-blue-400"
                    }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isActive ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
  
                {/* Label below if odd index */}
                {!labelOnTop && (
                  <span
                    className={`mt-2 text-xs font-medium text-center ${
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {stage}
                  </span>
                )}
              </div>
            )
          })}
  
          {/* Branch point for Closed Win/Lost */}
          <div className="relative flex flex-col items-center">
            {/* Closed Win (top branch) */}
            <div
              onClick={() => handleStatusChange("Closed Win")}
              className="flex flex-col items-center cursor-pointer group mb-2"
            >
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 shadow-sm
                  ${
                    currentStatus === "Closed Win"
                      ? "bg-green-500 text-white border-2 border-green-500"
                      : "bg-white border-2 border-gray-300 text-gray-400 group-hover:border-green-400"
                  }`}
              >
                <CheckCircle className="w-4 h-4" />
              </div>
              <span
                className={`mt-1 text-xs font-medium text-center
                  ${
                    currentStatus === "Closed Win"
                      ? "text-green-600"
                      : "text-gray-500 group-hover:text-green-600"
                  }`}
              >
                Closed Win
              </span>
            </div>
  
            {/* Closed Lost (bottom branch) */}
            <div
              onClick={() => handleStatusChange("Closed Lost")}
              className="flex flex-col items-center cursor-pointer group mt-2"
            >
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 shadow-sm
                  ${
                    currentStatus === "Closed Lost"
                      ? "bg-red-500 text-white border-2 border-red-500"
                      : "bg-white border-2 border-gray-300 text-gray-400 group-hover:border-red-400"
                  }`}
              >
                <Circle className="w-4 h-4" />
              </div>
              <span
                className={`mt-1 text-xs font-medium text-center
                  ${
                    currentStatus === "Closed Lost"
                      ? "text-red-600"
                      : "text-gray-500 group-hover:text-red-600"
                  }`}
              >
                Closed Lost
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  


  const renderField = (key: keyof Lead, value: string | number | undefined) => {

    switch (key) {
      case 'status':
        return <StatusTimeline currentStatus={typeof value === 'string' ? value : undefined} />
      case 'service_product':
        return (
          <Select value={typeof value === 'string' ? value : ''} onValueChange={(val) => handleChange(key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={loadingServices ? "Loading services..." : "Select service/product"} />
            </SelectTrigger>
            <SelectContent>
              {services.map(service => (
                <SelectItem key={service.id} value={service.name}>
                  <div>
                    <div className="font-medium">{service.name}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'region':
        return (
          <Select value={typeof value === 'string' ? value : ''} onValueChange={(val) => handleChange(key, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        )
        case 'service_price':
          return (
            <Input
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                const val = e.target.value
                if (
                  edited.service_price !== undefined &&
                  !Number.isInteger(edited.service_price)
                ) {
                  toast.error("Service price must be an integer!")
                  return
                }
                
                handleChange(key, val === '' ? undefined : Number(val))
              }}
            />
          )
        
      case 'lead_source':
        return (
          <Select value={typeof value === 'string' ? value : ''} onValueChange={(val) => handleChange(key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={loadingSources ? "Loading sources..." : "Select source"} />
            </SelectTrigger>
            <SelectContent>
              {leadSources.map(src => (
                <SelectItem key={src.id} value={src.name}>
                  {src.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
        case 'mode_of_service':
        return (
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={(val) => handleChange(key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mode of service" />
            </SelectTrigger>
            <SelectContent>
              {modeOfServiceOptions.map(mode => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'captured_by':
        return (
          <>
            <Select value={typeof value === 'string' ? value : ''} onValueChange={(val) => handleChange(key, val)}>
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
              onChange={(e) => handleChange(key, e.target.value)}
            />
          </>
        )
      case 'first_contact':
      case 'last_contact':
        return (
          <DatePicker
            value={value ? new Date(value) : undefined}
            onChange={(date) => handleChange(key, date?.toISOString() || '')}
          />
        )
      case 'notes':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className="min-h-20"
          />
        )
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        )
    }
  }

  useEffect(() => {
    if (lead) {
      setEdited({ ...lead, mode_of_service: lead.mode_of_service ?? '' })
    }
  }, [lead])
  

  const formatHistoryValue = (value: string | null) => {
    if (!value) return 'N/A'
    if (value.includes('T') && value.includes('Z')) {
      // Looks like a date
      return new Date(value).toLocaleDateString()
    }
    return value
  }

  const handleSave = async () => {
    try {
      await onSave(edited)
      if (edited.service_price && !Number.isInteger(Number(edited.service_price))) {
        alert("Service price must be an integer!")
        return
      }
      // Record history changes
      const normalize = (val: any) => (val === undefined || val === null ? '' : String(val))

      const changes = Object.entries(edited).filter(([key, value]) => {
        return normalize(value) !== normalize(lead[key as keyof Lead])
      })
      
      if (changes.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        const displayName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.email ||
          'Unknown User'
        // Prepare history entries with proper data sanitization
        const historyEntries = changes.map(([field, newValue]) => {
          const oldValue = lead[field as keyof Lead]
          
          // Convert date values to readable format for history
          const formatValueForHistory = (value: any) => {
            if (value === undefined || value === null) return null
            
            // Handle date fields specifically
            if ((field === 'first_contact' || field === 'last_contact') && value) {
              try {
                const date = new Date(value)
                return date.toISOString().split('T')[0] // Convert to YYYY-MM-DD format
              } catch (e) {
                return String(value)
              }
            }
            
            return String(value)
          }
          
          return {
            lead_id: lead.id,
            field_changed: field,
            old_value: formatValueForHistory(oldValue),
            new_value: formatValueForHistory(newValue),
            changed_by: displayName,
            changed_at: new Date().toISOString(),
            action: 'edited'
          }
        })

        // Insert history entries one by one to identify problematic entries
        for (const entry of historyEntries) {
          try {
            console.log("Trying to insert history entry:", entry)
        
            const { data, error } = await supabase.from('lead_history').insert(historyEntries)
        
            if (error) {
              console.error(`Error inserting history for field ${entry.field_changed}:`, error)
            } else {
              console.log(`History inserted successfully for field ${entry.field_changed}:`, data)
            }
          } catch (insertError) {
            console.error(`Exception inserting history for field ${entry.field_changed}:`, insertError, entry)
          }
        }
        
      }

      // Sync proposal tracker based on new status
      const fullCompanyName = `${edited.company ?? ''}`;
      const { data: existingProposal, error: findError } = await supabase
        .from('proposals_tracker')
        .select('id')
        .ilike('company_organization', fullCompanyName)
        .ilike('email', edited.email || '')
        .maybeSingle();

      if (findError) {
        console.error('Error finding existing proposal:', findError)
      }

      if (edited.status?.toLowerCase() === 'proposal sent') {
        if (!existingProposal) {
          const { error: insertProposalError } = await supabase.from('proposals_tracker').insert([{
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

          if (insertProposalError) {
            console.error('Error inserting proposal:', insertProposalError)
          }
        } else {
          const { error: updateProposalError } = await supabase.from('proposals_tracker').update({
            phone: edited.phone || '',
            region: edited.region || '',
            course_requested: edited.service_product || '',
            status: edited.status,
            person_in_charge: edited.captured_by || '',
          }).eq('id', existingProposal.id);

          if (updateProposalError) {
            console.error('Error updating proposal:', updateProposalError)
          }
        }
      } else if (existingProposal) {
        const { error: updateStatusError } = await supabase.from('proposals_tracker').update({
          status: edited.status,
        }).eq('id', existingProposal.id);

        if (updateStatusError) {
          console.error('Error updating proposal status:', updateStatusError)
        }
      }
    // ✅ Show success toast
    toast.success("Lead updated successfully")

      onClose()
    } catch (error) {
      console.error('Error in handleSave:', error)
      // Don't prevent closing the modal, but log the error
      toast.error("Failed to update lead. Please try again.")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
<DialogContent className="w-[60vw] rounded-xl max-h-[90vh] overflow-hidden">

        <DialogTitle>Edit Lead - {lead?.contact_name}</DialogTitle>

        <Tabs defaultValue="edit" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="edit">Edit Lead</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 gap-6">
              {/* Status Timeline - Full Width */}
              <div className="col-span-full">
                <Label className="text-sm font-medium capitalize block mb-3">Lead Status</Label>
                <div className="border rounded-lg p-4 bg-card">
                  {renderField('status', edited.status)}
                </div>
              </div>

              {/* Other Fields in Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(edited)
                  .filter(([key]) => key !== 'id' && key !== 'status')
                  .map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-sm font-medium capitalize block mb-1">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      {renderField(key as keyof Lead, value as string | number)}

                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <div className="space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="overflow-y-auto max-h-[70vh]">
            {loadingHistory ? (
              <div className="text-center py-8">Loading history...</div>
            ) : leadHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No history available</div>
            ) : (
              <div className="space-y-4">
                {leadHistory.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm">
                        {entry.field_changed.replace(/_/g, ' ')} updated
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.changed_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Changed by:</span> {entry.changed_by}
                    </div>
                    <div className="text-sm mt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-red-600">From:</span>
                          <div className="bg-red-50 dark:bg-red-950 p-2 rounded mt-1">
                          {formatHistoryValue(entry.old_value ?? null)}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-green-600">To:</span>
                          <div className="bg-green-50  dark:bg-green-950 p-2 rounded mt-1">
                          {formatHistoryValue(entry.new_value ?? null)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default EditLeadModal