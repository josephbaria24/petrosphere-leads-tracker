'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase-client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export type Webinar = {
    id: string
    month: string
    year: string 
    registration_page_views: number | null
    registered_participants: number | null
    attended_participants: number | null
    webinar_title: string | null
    presenters: string | null
    duration_planned: string | null
    actual_run_time: string | null
    average_attendance_time: string | null
    event_rating: number | null
    created_at: string
  }
  

interface EditWebinarModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updated: Partial<Webinar>) => void
  webinar: Webinar
  currentUserName: string
}

const numericKeys: (keyof Webinar)[] = [
    "registration_page_views",
    "registered_participants",
    "attended_participants",
    "event_rating",
  ]

const EditWebinarModal: React.FC<EditWebinarModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  webinar, 
  currentUserName 
}) => {
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [edited, setEdited] = useState<Partial<Webinar>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (webinar) setEdited({ ...webinar })
  }, [webinar])

  const handleChange = (key: keyof Webinar, value: string | number | null) => {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const isPlaceholder = edited.id?.toString().startsWith("placeholder-")

      if (isPlaceholder) {
        // CREATE: Remove id and created_at before inserting
        const { id, created_at, ...dataToInsert } = edited
        
        const { error } = await supabase
          .from("webinar_tracker")
          .insert(dataToInsert)

        if (error) throw error

        await supabase.from('activity_logs').insert({
          user_name: currentUserName,
          action: 'created',
          entity_type: 'webinar',
        })

      } else {
        // UPDATE: Keep the id for the update query
        const { id, created_at, ...dataToUpdate } = edited
        
        const { error } = await supabase
          .from("webinar_tracker")
          .update(dataToUpdate)
          .eq("id", id)

        if (error) throw error

        await supabase.from('activity_logs').insert({
          user_name: currentUserName,
          action: 'edited',
          entity_type: 'webinar',
        })
      }

      // Call the onSave callback
      await onSave(edited)
      
      onClose()
      
      // Refresh the page to show new data
      window.location.reload()
      
    } catch (error) {
      console.error('Error saving:', error)
      // Optionally show error toast here
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="space-y-4 max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>
          {edited.id?.toString().startsWith("placeholder-") ? "Create" : "Edit"} Webinar Entry
        </DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(edited)
            .filter(([key]) => key !== 'id' && key !== 'created_at')
            .map(([key, value]) => {
              // Check if field should be disabled (month/year are read-only)
              const isDisabled = key === 'month' || key === 'year'
              
              return (
                <div key={key}>
                  <Label className="text-sm font-medium capitalize block mb-1">
                    {key.replace(/_/g, ' ')}
                  </Label>
                  {(key === 'presenters' || key === 'webinar_title') ? (
                    <Textarea
                      value={value ?? ""}
                      onChange={(e) => handleChange(key as keyof Webinar, e.target.value)}
                    />
                 ) : (key === 'event_rating') ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="5"  // ✅ This limits it to 5.00
                        value={value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : null
                          // ✅ Add extra validation to ensure it doesn't exceed 5
                          if (val !== null && val > 5) {
                            handleChange(key as keyof Webinar, 5)
                          } else {
                            handleChange(key as keyof Webinar, val)
                          }
                        }}
                      />
                  ) : numericKeys.includes(key as keyof Webinar) ? (
                    <Input
                      type="number"
                      value={value ?? ""}
                      onChange={(e) =>
                        handleChange(
                          key as keyof Webinar,
                          e.target.value === "" ? null : parseInt(e.target.value, 10)
                        )
                      }
                    />
                  ) : (
                    <Input
                      value={value ?? ""}
                      onChange={(e) => handleChange(key as keyof Webinar, e.target.value)}
                      disabled={isDisabled}
                    />
                  )}
                </div>
              )
            })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditWebinarModal