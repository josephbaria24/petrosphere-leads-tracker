import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  values: string[]
  onAdd: (val: string) => void
  onEdit: (oldVal: string, newVal: string) => void
  onDelete: (val: string) => void
  onSave: () => void
}

export default function EditListModal({ title, values, onAdd, onEdit, onDelete, onSave }: Props) {
  const [edits, setEdits] = useState<Record<string, string>>({})

  const handleChange = (oldVal: string, newVal: string) => {
    setEdits(prev => ({ ...prev, [oldVal]: newVal }))
  }

  const handleSave = () => {
    for (const oldVal in edits) {
      const newVal = edits[oldVal]
      if (newVal && newVal !== oldVal) {
        onEdit(oldVal, newVal)
      }
    }
    onSave()
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      
      {values.map((item) => (
        <div key={item} className="flex items-center gap-2">
          <Input
            defaultValue={item}
            onChange={(e) => handleChange(item, e.target.value)}
          />
          <Button variant="destructive" onClick={() => onDelete(item)}>🗑</Button>
        </div>
      ))}

      <div className="flex gap-2 mt-4">
        <Input
          placeholder={`New ${title.slice(0, -1)}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = (e.target as HTMLInputElement).value.trim()
              if (val) {
                onAdd(val)
                ;(e.target as HTMLInputElement).value = ''
              }
            }
          }}
        />
        <Button>➕</Button>
      </div>

      {/* ✅ Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave}>💾 Save Changes</Button>
      </div>
    </div>
  )
}
