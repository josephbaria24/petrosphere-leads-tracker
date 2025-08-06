'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

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

const EditWebinarModal: React.FC<EditWebinarModalProps> = ({ isOpen, onClose, onSave, webinar, currentUserName }) => {
  const [edited, setEdited] = useState<Partial<Webinar>>({})

  useEffect(() => {
    if (webinar) setEdited({ ...webinar })
  }, [webinar])

  const handleChange = (key: keyof Webinar, value: string | number | null) => {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="space-y-4 max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>Edit Webinar</DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(edited)
            .filter(([key]) => key !== 'id' && key !== 'created_at')
            .map(([key, value]) => (
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
                    max="5"
                    value={value ?? ""}
                    onChange={(e) =>
                        handleChange(key as keyof Webinar, e.target.value ? parseFloat(e.target.value) : null)
                      }
                      
                      
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
                    />
                  )
                  }
                      
              </div>
            ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={async () => {
              await onSave(edited)

              // ✅ Log to activity_logs
              await supabase.from('activity_logs').insert({
                user_name: currentUserName,
                action: 'edited',
                entity_type: 'webinar',
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

export default EditWebinarModal
