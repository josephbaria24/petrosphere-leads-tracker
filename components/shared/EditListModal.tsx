import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Save } from 'lucide-react'

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
  const [newItem, setNewItem] = useState('')

  const handleChange = (oldVal: string, newVal: string) => {
    setEdits(prev => ({ ...prev, [oldVal]: newVal }))
  }

  const handleAdd = () => {
    const val = newItem.trim()
    if (val) {
      onAdd(val)
      setNewItem('')
    }
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
          <Button variant="destructive" size="sm" onClick={() => onDelete(item)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <div className="flex gap-2 mt-4">
        <Input
          placeholder={`New ${title.slice(0, -1)}`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAdd()
            }
          }}
        />
        <Button size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* ✅ Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
