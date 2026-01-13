import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Ally } from '@/types'
import React, { useMemo, useState } from 'react'

interface AdventureAllyPickerProps {
  allies: Ally[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

const AdventureAllyPicker: React.FC<AdventureAllyPickerProps> = ({ allies, selectedIds, onChange }) => {
  const [search, setSearch] = useState('')

  const selectedAllies = useMemo(
    () => allies.filter((ally) => selectedIds.includes(ally.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [allies, selectedIds],
  )

  const filteredAllies = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return allies
    }
    return allies.filter((ally) => {
      const haystack = [ally.name, ally.classes, ally.species].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [allies, search])

  const toggleAlly = (allyId: number) => {
    if (selectedIds.includes(allyId)) {
      onChange(selectedIds.filter((id) => id !== allyId))
      return
    }
    onChange([...selectedIds, allyId])
  }

  if (allies.length === 0) {
    return (
      <div className="rounded-lg border border-base-200 bg-base-100 p-3 text-sm text-base-content/60">
        No allies available yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">Played with</label>
        <span className="text-xs text-base-content/60">{selectedIds.length} selected</span>
      </div>
      <Input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search allies"
        aria-label="Search allies"
      >
        Search allies
      </Input>
      {selectedAllies.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedAllies.map((ally) => (
            <button
              key={ally.id}
              type="button"
              onClick={() => toggleAlly(ally.id)}
              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary transition hover:border-primary/60"
            >
              {ally.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-base-200 bg-base-100 p-2">
        {filteredAllies.length > 0 ? (
          filteredAllies.map((ally) => {
            const selected = selectedIds.includes(ally.id)
            return (
              <button
                key={ally.id}
                type="button"
                onClick={() => toggleAlly(ally.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm transition',
                  selected ? 'bg-primary/10 text-primary' : 'hover:bg-base-200/70',
                )}
              >
                <span className="min-w-0 truncate">{ally.name}</span>
                <span className="text-xs text-base-content/60 capitalize">{ally.standing}</span>
              </button>
            )
          })
        ) : (
          <p className="text-xs text-base-content/60">No allies found.</p>
        )}
      </div>
    </div>
  )
}

export default AdventureAllyPicker
