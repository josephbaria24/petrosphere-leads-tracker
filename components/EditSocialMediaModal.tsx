'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import type { SocialMedia } from '@/app/social-media-list/columns'

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
  const [edited, setEdited] = useState<Partial<SocialMedia>>({})

  useEffect(() => {
    if (rowData) setEdited({ ...rowData })
  }, [rowData])

  const handleChange = (key: keyof SocialMedia, value: string | number | null) => {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="space-y-4 max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>Edit Social Media Entry</DialogTitle>
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
                  />
                ) : (
                  <Input
                    value={value ?? ""}
                    onChange={(e) => handleChange(key as keyof SocialMedia, e.target.value)}
                  />
                )}
              </div>
            ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={async () => {
              if (edited.id?.toString().startsWith("placeholder-")) {
                await supabase.from("social_media_tracker").insert(edited)
              } else {
                await supabase
                  .from("social_media_tracker")
                  .update(edited)
                  .eq("id", edited.id)
              }

              await supabase.from('activity_logs').insert({
                user_name: currentUserName,
                action: 'edited',
                entity_type: 'social_media_tracker',
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

export default EditSocialMediaModal
