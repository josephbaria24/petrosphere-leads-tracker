import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Save, Loader2, Edit2 } from 'lucide-react'
import { Label } from '@/components/ui/label'

type Props = {
  title: string
  values: string[]
  onAdd: (val: string) => Promise<void> | void
  onEdit: (oldVal: string, newVal: string) => Promise<void> | void
  onDelete: (val: string) => Promise<void> | void
  onSave: () => void
}

export default function EditListModal({ title, values, onAdd, onEdit, onDelete, onSave }: Props) {
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [newItem, setNewItem] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

  const handleChange = (oldVal: string, newVal: string) => {
    setEdits(prev => ({ ...prev, [oldVal]: newVal }))
  }

  const handleAdd = async () => {
    const val = newItem.trim()
    if (val) {
      setIsAdding(true)
      await onAdd(val)
      setNewItem('')
      setIsAdding(false)
    }
  }

  const handleDelete = async (item: string) => {
    setDeletingItems(prev => new Set(prev).add(item))
    await onDelete(item)
    setDeletingItems(prev => {
      const next = new Set(prev)
      next.delete(item)
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const promises = []
    for (const oldVal in edits) {
      const newVal = edits[oldVal]
      if (newVal && newVal !== oldVal) {
        promises.push(onEdit(oldVal, newVal))
      }
    }
    await Promise.all(promises)
    setIsSaving(false)
    onSave()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col space-y-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-blue-500" />
          {title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add, rename, or remove items from this list.
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder={`Add new ${title.toLowerCase().replace('manage ', '').slice(0, -1)}...`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isAdding) {
              handleAdd()
            }
          }}
        />
        <Button size="sm" onClick={handleAdd} disabled={isAdding || !newItem.trim()} className="bg-blue-600 hover:bg-blue-700">
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Add
        </Button>
      </div>

      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {values.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No items available. Add one above.
          </div>
        ) : (
          values.map((item) => {
            const isDeleting = deletingItems.has(item)
            return (
              <div key={item} className="flex items-center gap-2 group bg-white dark:bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 shadow-sm transition-all hover:border-blue-200 dark:hover:border-blue-900/50">
                <Input
                  defaultValue={item}
                  onChange={(e) => handleChange(item, e.target.value)}
                  className="h-8 text-sm border-transparent bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(item)}
                  disabled={isDeleting}
                  className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            )
          })
        )}
      </div>

      <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
