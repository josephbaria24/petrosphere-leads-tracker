//components\EditSocialMediaModal.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase-client'
import type { SocialMedia } from '@/app/social-media-list/columns'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Props {
  isOpen: boolean
  onClose: () => void
  rowData: SocialMedia
  currentUserName: string
}

const numericKeys: (keyof SocialMedia)[] = [
  "post_reach",
  "post_engagement",
  "new_page_likes",
  "new_page_followers",
  "reactions",
  "comments",
  "shares",
  "photo_views",
  "link_clicks"
]

const EditSocialMediaModal: React.FC<Props> = ({ isOpen, onClose, rowData, currentUserName }) => {
   const supabase = useMemo(() => createClientComponentClient(), [])
  const [edited, setEdited] = useState<Partial<SocialMedia>>({})
  const [isSaving, setIsSaving] = useState(false)
  // const { toast } = useToast() // Uncomment if you want to show notifications

  useEffect(() => {
    if (rowData) setEdited({ ...rowData })
  }, [rowData])

  const handleChange = (key: keyof SocialMedia, value: string | number | null) => {
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
          .from("social_media_tracker")
          .insert(dataToInsert)

        if (error) throw error

        await supabase.from('activity_logs').insert({
          user_name: currentUserName,
          action: 'created',
          entity_type: 'social_media_tracker',
        })

        // toast({ title: "Success", description: "Entry created successfully" })
      } else {
        // UPDATE: Keep the id for the update query
        const { id, created_at, ...dataToUpdate } = edited
        
        const { error } = await supabase
          .from("social_media_tracker")
          .update(dataToUpdate)
          .eq("id", id)

        if (error) throw error

        await supabase.from('activity_logs').insert({
          user_name: currentUserName,
          action: 'edited',
          entity_type: 'social_media_tracker',
        })

        // toast({ title: "Success", description: "Entry updated successfully" })
      }

      onClose()
      // Optionally trigger a refresh of the parent table here
      window.location.reload() // Simple but not ideal - better to use a callback
    } catch (error) {
      console.error('Error saving:', error)
      // toast({ title: "Error", description: "Failed to save entry", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="space-y-4 max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>
          {edited.id?.toString().startsWith("placeholder-") ? "Create" : "Edit"} Social Media Entry
        </DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(edited)
            .filter(([key]) => key !== 'id' && key !== 'created_at')
            .map(([key, value]) => (
              <div key={key}>
                <Label className="text-sm font-medium capitalize block mb-1">
                  {key.replace(/_/g, ' ')}
                </Label>
                {numericKeys.includes(key as keyof SocialMedia) ? (
                  <Input
                    type="number"
                    value={value ?? ""}
                    onChange={(e) =>
                      handleChange(
                        key as keyof SocialMedia,
                        e.target.value === "" ? null : parseInt(e.target.value, 10)
                      )
                    }
                    disabled={key === 'month' || key === 'year'} // Make month/year read-only for new entries
                  />
                ) : (
                  <Input
                    value={value ?? ""}
                    onChange={(e) => handleChange(key as keyof SocialMedia, e.target.value)}
                    disabled={key === 'month' || key === 'year'} // Make month/year read-only for new entries
                  />
                )}
              </div>
            ))}
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

export default EditSocialMediaModal