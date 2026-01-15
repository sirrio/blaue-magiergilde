import { Input } from '@/components/ui/input'
import { getAllyDisplayName, getAllyOwnerName } from '@/helper/allyDisplay'
import { cn } from '@/lib/utils'
import { Ally, Character } from '@/types'
import { User } from 'lucide-react'
import React, { useMemo, useState } from 'react'

interface AdventureParticipantPickerProps {
  allies: Ally[]
  guildCharacters: Character[]
  selectedAllyIds: number[]
  selectedGuildCharacterIds: number[]
  onChange: (payload: { allyIds: number[]; guildCharacterIds: number[] }) => void
}

const AdventureParticipantPicker: React.FC<AdventureParticipantPickerProps> = ({
  allies,
  guildCharacters,
  selectedAllyIds,
  selectedGuildCharacterIds,
  onChange,
}) => {
  const [search, setSearch] = useState('')

  const linkedIds = useMemo(() => new Set(allies.map((ally) => ally.linked_character_id).filter(Boolean)), [allies])
  const availableGuildCharacters = useMemo(
    () => guildCharacters.filter((character) => !linkedIds.has(character.id)),
    [guildCharacters, linkedIds],
  )

  const selectedAllies = useMemo(
    () =>
      allies
        .filter((ally) => selectedAllyIds.includes(ally.id))
        .sort((a, b) => getAllyDisplayName(a).localeCompare(getAllyDisplayName(b))),
    [allies, selectedAllyIds],
  )
  const selectedGuildCharacters = useMemo(
    () =>
      availableGuildCharacters
        .filter((character) => selectedGuildCharacterIds.includes(character.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [availableGuildCharacters, selectedGuildCharacterIds],
  )

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    const allyOptions = allies.map((ally) => {
      const ownerName = getAllyOwnerName(ally)
      return {
      key: `ally-${ally.id}`,
      type: 'ally' as const,
      id: ally.id,
      label: getAllyDisplayName(ally),
      sublabel: ally.linked_character
        ? ownerName
          ? `Linked • ${ownerName}`
          : 'Linked guild member'
        : 'Custom ally',
      ownerName,
    }
    })
    const guildOptions = availableGuildCharacters.map((character) => ({
      key: `guild-${character.id}`,
      type: 'guild' as const,
      id: character.id,
      label: character.name,
      sublabel: 'Guild member',
    }))

    const combined = [...allyOptions, ...guildOptions]
    const filtered = query
      ? combined.filter((option) =>
          [option.label, option.sublabel].filter(Boolean).join(' ').toLowerCase().includes(query),
        )
      : combined
    return filtered.sort((a, b) => a.label.localeCompare(b.label))
  }, [allies, availableGuildCharacters, search])

  const toggleOption = (type: 'ally' | 'guild', id: number) => {
    if (type === 'ally') {
      if (selectedAllyIds.includes(id)) {
        onChange({ allyIds: selectedAllyIds.filter((entry) => entry !== id), guildCharacterIds: selectedGuildCharacterIds })
        return
      }
      onChange({ allyIds: [...selectedAllyIds, id], guildCharacterIds: selectedGuildCharacterIds })
      return
    }
    if (selectedGuildCharacterIds.includes(id)) {
      onChange({ allyIds: selectedAllyIds, guildCharacterIds: selectedGuildCharacterIds.filter((entry) => entry !== id) })
      return
    }
    onChange({ allyIds: selectedAllyIds, guildCharacterIds: [...selectedGuildCharacterIds, id] })
  }

  if (allies.length === 0 && guildCharacters.length === 0) {
    return (
      <div className="rounded-lg border border-base-200 bg-base-100 p-3 text-sm text-base-content/60">
        No allies or guild members available yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search allies or guild members"
        aria-label="Search participants"
      >
        Search participants
      </Input>
      {selectedAllies.length > 0 || selectedGuildCharacters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedAllies.map((ally) => (
            <button
              key={`selected-ally-${ally.id}`}
              type="button"
              onClick={() => toggleOption('ally', ally.id)}
              title={getAllyOwnerName(ally) ? `Owner: ${getAllyOwnerName(ally)}` : undefined}
              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary transition hover:border-primary/60"
            >
              {getAllyDisplayName(ally)}
            </button>
          ))}
          {selectedGuildCharacters.map((character) => (
            <button
              key={`selected-guild-${character.id}`}
              type="button"
              onClick={() => toggleOption('guild', character.id)}
              className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-1 text-xs text-secondary transition hover:border-secondary/60"
            >
              {character.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="max-h-60 overflow-y-auto rounded-lg border border-base-200 bg-base-100 p-2">
        {filteredOptions.length > 0 ? (
          <div className="space-y-1">
            {filteredOptions.map((option) => {
              const isSelected = option.type === 'ally'
                ? selectedAllyIds.includes(option.id)
                : selectedGuildCharacterIds.includes(option.id)
            return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleOption(option.type, option.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm transition',
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-200/70',
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  <span className="flex items-center gap-2 text-xs text-base-content/60">
                    {option.type === 'guild' ? <User size={12} /> : null}
                    {option.sublabel}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-base-content/60">No participants found.</p>
        )}
      </div>
    </div>
  )
}

export default AdventureParticipantPicker
