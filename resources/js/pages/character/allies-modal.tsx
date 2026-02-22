import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/text-area'
import { getAllyDisplayName, getAllyOwnerName } from '@/helper/allyDisplay'
import createRandomString from '@/helper/createRandomString'
import { Ally, Character, CharacterClass, PageProps } from '@/types'
import { BookHeart, ChevronDown, ChevronUp, Heart, Link2, PlusCircle, User, UserPlus } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import type { FormDataConvertible } from '@inertiajs/core'

interface AlliesModalProps {
  character: Character
  guildCharacters?: Character[]
}

const getAllyAvatarSrc = (ally: Ally) => {
  if (ally.linked_character?.avatar) {
    const linkedAvatar = String(ally.linked_character.avatar || '').trim()
    return linkedAvatar.startsWith('http') ? linkedAvatar : `/storage/${linkedAvatar}`
  }
  if (ally.avatar && typeof ally.avatar === 'string') {
    const avatar = String(ally.avatar || '').trim()
    return avatar.startsWith('http') ? avatar : `/storage/${avatar}`
  }
  return ''
}

const RatingHearts = ({
  rating,
  onSelect,
}: {
  rating: number
  onSelect?: (value: number) => void
}) => {
  const normalized = Math.max(1, Math.min(5, rating || 3))
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1
        const icon = (
          <Heart
            size={16}
            className={value <= normalized ? 'fill-current text-primary' : 'text-base-content/30'}
          />
        )
        return onSelect ? (
          <button
            key={value}
            type="button"
            className="transition hover:scale-105"
            onClick={() => onSelect(value)}
            aria-label={`Set rating to ${value}`}
          >
            {icon}
          </button>
        ) : (
          <span key={value}>{icon}</span>
        )
      })}
    </div>
  )
}

interface AllyCardProps {
  ally: Ally
  guildCharacters: Character[]
  linkedCharacterIds: number[]
  isEditing: boolean
  onEdit: () => void
  onSave: (ally: Ally) => void
  onCancel: () => void
  onRemove: (ally: Ally) => void
  large?: boolean
}

const normalizeAlly = (ally: Ally): Ally => ({
  ...ally,
  name: ally.name ?? '',
  notes: ally.notes ?? '',
  avatar: ally.avatar ?? '',
  classes: ally.classes ?? '',
  species: ally.species ?? '',
  rating: ally.rating ?? 3,
  linked_character_id: ally.linked_character_id ?? null,
  linked_character: ally.linked_character ?? null,
})

const AllySkeletonCard = () => {
  return (
    <div className="card bg-base-200 border p-4 shadow min-h-[420px]" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-base-300/70" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-base-300/80" />
          <div className="h-3 w-28 rounded bg-base-300/60" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-8 w-full rounded bg-base-300/60" />
        <div className="h-24 w-full rounded bg-base-300/60" />
        <div className="h-8 w-full rounded bg-base-300/60" />
        <div className="h-8 w-1/2 rounded bg-base-300/60" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-16 rounded bg-base-300/70" />
        <div className="h-7 w-20 rounded bg-base-300/70" />
      </div>
    </div>
  )
}

const AllyCard: React.FC<AllyCardProps> = ({
  ally,
  guildCharacters,
  linkedCharacterIds,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  large = false,
}) => {
  const [editData, setEditData] = useState<Ally>(() => normalizeAlly(ally))
  const [avatarSrc, setAvatarSrc] = useState('')
  const [editAvatarSrc, setEditAvatarSrc] = useState('')
  const { classes } = usePage<PageProps>().props
  const linkedCharacterLookup = useMemo(() => {
    return new Map(guildCharacters.map((character) => [character.id, character]))
  }, [guildCharacters])
  useEffect(() => {
    setEditData(normalizeAlly(ally))
  }, [ally])
  useEffect(() => {
    const avatar = getAllyAvatarSrc(ally)
    if (!avatar) {
      setAvatarSrc('')
      return
    }
    setAvatarSrc(avatar)
  }, [ally])
  useEffect(() => {
    const linkedCharacter =
      editData.linked_character ??
      (editData.linked_character_id ? linkedCharacterLookup.get(editData.linked_character_id) ?? null : null)
    const linkedAvatar = linkedCharacter?.avatar
      ? (String(linkedCharacter.avatar || '').trim().startsWith('http')
        ? String(linkedCharacter.avatar || '').trim()
        : `/storage/${linkedCharacter.avatar}`)
      : ''
    if (linkedAvatar) {
      setEditAvatarSrc(linkedAvatar)
      return
    }
    if (!editData.avatar) {
      setEditAvatarSrc('')
      return
    }
    if (typeof editData.avatar === 'string') {
      const avatar = String(editData.avatar || '').trim()
      setEditAvatarSrc(avatar.startsWith('http') ? avatar : `/storage/${avatar}`)
      return
    }
    const url = URL.createObjectURL(editData.avatar)
    setEditAvatarSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [editData.avatar, editData.linked_character, editData.linked_character_id, linkedCharacterLookup])
  const handleChange = <K extends keyof Ally>(key: K, value: Ally[K]) => {
    setEditData((current) => ({ ...current, [key]: value }))
  }
  const linkedOptions = useMemo(() => {
    const linkedSet = new Set(linkedCharacterIds)
    return guildCharacters.filter((character) => {
      if (character.id === ally.character_id) {
        return false
      }
      if (ally.linked_character_id === character.id) {
        return true
      }
      return !linkedSet.has(character.id)
    })
  }, [guildCharacters, linkedCharacterIds, ally.character_id, ally.linked_character_id])
  if (!isEditing) {
    const displayName = getAllyDisplayName(ally)
    const ownerName = getAllyOwnerName(ally)
    return (
      <div
        className={`card bg-base-100 cursor-pointer border p-2 shadow-sm hover:shadow-md ${ally.notes && ally.notes.trim() !== '' ? 'tooltip tooltip-info' : ''}`}
        data-tip={ally.notes && ally.notes.trim() !== '' ? ally.notes : ''}
        onClick={onEdit}
      >
        <div className="flex items-center gap-2">
          <div
            className={`bg-base-200 flex-shrink-0 overflow-hidden rounded-full ${large ? 'h-20 w-20' : 'h-10 w-10'}`}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={`${displayName}'s avatar`} className="h-full w-full object-cover" />
            ) : (
              <div className="text-base-content flex h-full w-full items-center justify-center text-xs">N/A</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-bold">
                {displayName}
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full border border-base-200 px-2 py-0.5 text-[10px] uppercase text-base-content/60">
                {ally.linked_character_id ? <User size={10} /> : <Link2 size={10} />}
                {ally.linked_character_id ? 'Linked' : 'Custom'}
              </span>
            </div>
            <p className="text-base-content text-xs">
              {ally.classes && ally.classes.trim() !== '' ? ally.classes : 'No classes'} &bull;{' '}
              {ally.species && ally.species.trim() !== '' ? ally.species : 'No species'}
            </p>
            {ownerName ? (
              <p className="text-xs text-base-content/50">Owner: {ownerName}</p>
            ) : null}
            <RatingHearts rating={ally.rating} />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="card bg-base-200 border p-2 shadow">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`bg-base-200 flex-shrink-0 overflow-hidden rounded-full ${large ? 'h-20 w-20' : 'h-10 w-10'}`}
        >
          {editAvatarSrc ? (
            <img src={editAvatarSrc} alt={`${editData.name}'s avatar`} className="h-full w-full object-cover" />
          ) : (
            <div className="text-base-content flex h-full w-full items-center justify-center text-xs">N/A</div>
          )}
        </div>
        <Input
          type="text"
          value={editData.name ?? ''}
          placeholder="Name"
          onChange={(e) => handleChange('name', e.target.value)}
          className="flex-1"
        >
          Name
        </Input>
      </div>
      <div className="mb-1">
        <label className="label">Linked guild member</label>
        <select
          value={editData.linked_character_id ?? ''}
          onChange={(e) => {
            const value = e.target.value ? Number(e.target.value) : null
            const linked = linkedOptions.find((entry) => entry.id === value) ?? null
            setEditData((current) => ({
              ...current,
              linked_character_id: value as Ally['linked_character_id'],
              linked_character: linked as Ally['linked_character'],
              name:
                linked && (!current.name || current.name.trim() === '')
                  ? (linked.name as Ally['name'])
                  : current.name,
            }))
          }}
          className="input input-bordered input-sm mb-2 w-full md:input-xs"
        >
          <option value="">Custom ally (no link)</option>
          {linkedOptions.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-1">
        <label className="label">Classes</label>
        <div className="grid grid-cols-2 gap-1 rounded border p-1 text-xs sm:grid-cols-4">
          {classes.map((cc: CharacterClass) => {
            const id = createRandomString(24)
            const selected = editData.classes
              ? editData.classes.split(',').map((c) => c.trim()).includes(cc.name)
              : false
            return (
              <div className="flex items-center gap-1" key={cc.id}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  id={id}
                  checked={selected}
                  onChange={(e) => {
                    const list = editData.classes
                      ? editData.classes.split(',').map((c) => c.trim()).filter(Boolean)
                      : []
                    const updated = e.target.checked
                      ? [...list, cc.name]
                      : list.filter((n) => n !== cc.name)
                    handleChange('classes', updated.join(', '))
                  }}
                />
                <label htmlFor={id} className="label cursor-pointer">
                  {cc.name}
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <Input
        type="text"
        value={editData.species ?? ''}
        placeholder="Species"
        onChange={(e) => handleChange('species', e.target.value)}
        className="mb-1"
      >
        Species
      </Input>
      <div className="mb-1">
        <TextArea
          value={editData.notes ?? ''}
          placeholder="Notes"
          onChange={(e) => handleChange('notes', e.target.value)}
        >
          Notes
        </TextArea>
      </div>
      <FileInput onChange={(e) => handleChange('avatar', e.target.files?.[0] as never)}>
        Avatar
      </FileInput>
      <div className="mb-2">
        <label className="label">Rating</label>
        <RatingHearts rating={editData.rating} onSelect={(value) => handleChange('rating', value as Ally['rating'])} />
      </div>
      <div className="flex gap-2">
        <Button size="xs" onClick={() => onSave(editData)}>
          Save
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button className={'ml-auto'} size="xs" color="error" onClick={() => onRemove(ally)}>
          Remove
        </Button>
      </div>
    </div>
  )
}

interface AllyRowProps {
  ally: Ally
  isSelected: boolean
  onSelect: () => void
}

const AllyRow: React.FC<AllyRowProps> = ({ ally, isSelected, onSelect }) => {
  const [avatarSrc, setAvatarSrc] = useState('')
  useEffect(() => {
    const avatar = getAllyAvatarSrc(ally)
    if (!avatar) {
      setAvatarSrc('')
      return
    }
    setAvatarSrc(avatar)
  }, [ally])
  const displayName = getAllyDisplayName(ally)
  const ownerName = getAllyOwnerName(ally)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
        isSelected ? 'border-primary/60 bg-primary/10' : 'border-base-200 hover:bg-base-200/60'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-base-200 flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
          {avatarSrc ? (
            <img src={avatarSrc} alt={`${displayName}'s avatar`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-base-content/60">N/A</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {displayName}
          </p>
          <p className="truncate text-xs text-base-content/60">
            {ally.classes && ally.classes.trim() !== '' ? ally.classes : 'No classes'} •{' '}
            {ally.species && ally.species.trim() !== '' ? ally.species : 'No species'}
          </p>
          {ownerName ? (
            <p className="truncate text-xs text-base-content/50">Owner: {ownerName}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-1 rounded-full border border-base-200 px-2 py-0.5 text-[10px] uppercase text-base-content/60">
          {ally.linked_character_id ? <User size={10} /> : <Link2 size={10} />}
          {ally.linked_character_id ? 'Linked' : 'Custom'}
        </span>
        <RatingHearts rating={ally.rating} />
      </div>
    </button>
  )
}

interface NewAllyCardProps {
  isEditing: boolean
  guildCharacters: Character[]
  ownerCharacterId: number
  linkedCharacterIds: number[]
  onSave: (ally: Ally) => void
  onCancel: () => void
  onEdit?: () => void
}

const NewAllyCard: React.FC<NewAllyCardProps> = ({
  isEditing,
  guildCharacters,
  ownerCharacterId,
  linkedCharacterIds,
  onSave,
  onCancel,
  onEdit,
}) => {
  const [editData, setEditData] = useState<Ally>({
    character_id: ownerCharacterId,
    id: 0,
    name: '',
    notes: '',
    avatar: '',
    classes: '',
    species: '',
    rating: 3,
    linked_character_id: null,
    linked_character: null,
  })
  const { classes } = usePage<PageProps>().props
  const linkedOptions = useMemo(
    () => {
      const linkedSet = new Set(linkedCharacterIds)
      return guildCharacters.filter((entry) => entry.id !== ownerCharacterId && !linkedSet.has(entry.id))
    },
    [guildCharacters, linkedCharacterIds, ownerCharacterId],
  )
  const handleChange = <K extends keyof Ally>(key: K, value: Ally[K]) => {
    setEditData((current) => ({ ...current, [key]: value }))
  }
  if (!isEditing) {
    return (
      <div
        className="card bg-base-100 hover:bg-base-200 cursor-pointer border-2 border-dashed p-4 text-center shadow-sm"
        onClick={onEdit}
      >
        <PlusCircle size={24} className="mx-auto" />
        <p className="mt-2 text-sm">Add Ally</p>
      </div>
    )
  }
  return (
    <div className="card bg-base-200 border p-2 shadow">
      <Input
        type="text"
        value={editData.name ?? ''}
        placeholder="Name"
        onChange={(e) => handleChange('name', e.target.value)}
        className="mb-1"
      >
        Name
      </Input>
      <div className="mb-1">
        <label className="label">Linked guild member</label>
        <select
          value={editData.linked_character_id ?? ''}
          onChange={(e) => {
            const value = e.target.value ? Number(e.target.value) : null
            const linked = linkedOptions.find((entry) => entry.id === value) ?? null
            setEditData((current) => ({
              ...current,
              linked_character_id: value as Ally['linked_character_id'],
              linked_character: linked as Ally['linked_character'],
              name:
                linked && (!current.name || current.name.trim() === '')
                  ? (linked.name as Ally['name'])
                  : current.name,
            }))
          }}
          className="input input-bordered input-sm mb-2 w-full md:input-xs"
        >
          <option value="">Custom ally (no link)</option>
          {linkedOptions.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-1">
        <label className="label">Classes</label>
        <div className="grid grid-cols-2 gap-1 rounded border p-1 text-xs sm:grid-cols-4">
          {classes.map((cc: CharacterClass) => {
            const id = createRandomString(24)
            const selected = editData.classes
              ? editData.classes.split(',').map((c) => c.trim()).includes(cc.name)
              : false
            return (
              <div className="flex items-center gap-1" key={cc.id}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  id={id}
                  checked={selected}
                  onChange={(e) => {
                    const list = editData.classes
                      ? editData.classes.split(',').map((c) => c.trim()).filter(Boolean)
                      : []
                    const updated = e.target.checked
                      ? [...list, cc.name]
                      : list.filter((n) => n !== cc.name)
                    handleChange('classes', updated.join(', '))
                  }}
                />
                <label htmlFor={id} className="label cursor-pointer">
                  {cc.name}
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <Input
        type="text"
        value={editData.species ?? ''}
        placeholder="Species"
        onChange={(e) => handleChange('species', e.target.value)}
        className="mb-1"
      >
        Species
      </Input>
      <div className="mb-1">
        <TextArea
          value={editData.notes ?? ''}
          placeholder="Notes"
          onChange={(e) => handleChange('notes', e.target.value)}
        >
          Notes
        </TextArea>
      </div>
      <FileInput onChange={(e) => handleChange('avatar', e.target.files?.[0] as never)}>
        Avatar
      </FileInput>
      <div className="mb-2">
        <label className="label">Rating</label>
        <RatingHearts rating={editData.rating} onSelect={(value) => handleChange('rating', value as Ally['rating'])} />
      </div>
      <div className="flex gap-2">
        <Button size="xs" onClick={() => onSave(editData)}>
          Save
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export const AlliesModal: React.FC<AlliesModalProps> = ({ character, guildCharacters = [] }) => {
  const [allies, setAllies] = useState<Ally[]>(character.allies)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [search, setSearch] = useState('')
  const linkedCharacterIds = useMemo(
    () => allies.map((ally) => ally.linked_character_id).filter(Boolean) as number[],
    [allies],
  )
  const handleSave = (ally: Ally) => {
    const { linked_character: linkedCharacter, avatar, ...rest } = ally
    void linkedCharacter
    const payload: Record<string, FormDataConvertible> = { ...rest }
    if (ally.id === 0) {
      payload.character_id = character.id
    } else {
      payload._method = 'put'
    }
    if (avatar instanceof File) {
      payload.avatar = avatar
    }

    if (ally.id === 0) {
      router.post(route('allies.store'), payload, { preserveScroll: true })
      const newAlly = { ...ally, id: Date.now() }
      setAllies([...allies, newAlly])
    } else {
      router.post(route('allies.update', ally.id), payload, { preserveScroll: true })
      setAllies(allies.map((a) => (a.id === ally.id ? ally : a)))
    }
    setEditingId(null)
  }
  const handleCancel = () => {
    setEditingId(null)
  }
  const handleRemove = (ally: Ally) => {
    const label = getAllyDisplayName(ally)
    if (window.confirm(`Are you sure you want to remove ${label}?`)) {
      router.delete(route('allies.destroy', ally.id), { preserveScroll: true })
      setAllies(allies.filter((a) => a.id !== ally.id))
      setEditingId(null)
    }
  }
  const filteredAllies = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? allies.filter((ally) => {
          const haystack = [
            getAllyDisplayName(ally),
            ally.linked_character?.user?.name,
            ally.classes,
            ally.species,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(query)
        })
      : allies
    return [...filtered].sort((a, b) =>
      getAllyDisplayName(a).localeCompare(getAllyDisplayName(b)),
    )
  }, [allies, search])

  const selectedAlly = useMemo(() => {
    if (editingId === null || editingId === 'new') {
      return null
    }
    return allies.find((ally) => ally.id === editingId) ?? null
  }, [allies, editingId])

  const handleSelectAlly = (allyId: number) => {
    setEditingId(allyId)
  }
  return (
    <Modal wide>
      <ModalTrigger>
        <Button size="sm" className="w-full justify-center gap-1" aria-label="Manage allies" title="Manage allies">
          <BookHeart size={14} />
          <span className="md:hidden">Allies</span>
        </Button>
      </ModalTrigger>
      <ModalTitle>Manage Allies</ModalTitle>
      <ModalContent>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-base-content/50">Assigned allies</p>
                <h3 className="text-base font-semibold">{allies.length} total</h3>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search allies"
                aria-label="Search allies"
              >
                Search allies
              </Input>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-base-content/60">
                  {search.trim() !== '' ? `${filteredAllies.length} matches` : `${filteredAllies.length} shown`}
                </span>
              </div>
            </div>

            <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
              {filteredAllies.length > 0 ? (
                filteredAllies.map((ally) => (
                  <AllyRow
                    key={ally.id}
                    ally={ally}
                    isSelected={editingId === ally.id}
                    onSelect={() => handleSelectAlly(ally.id)}
                  />
                ))
              ) : (
                <p className="text-xs text-base-content/60">No allies found.</p>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col space-y-4 md:min-h-[520px]">
            <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-base-content/50">Ally details</p>
                <h3 className="text-base font-semibold">{selectedAlly ? getAllyDisplayName(selectedAlly) : 'Select an ally'}</h3>
              </div>
              <Button size="sm" className="w-full sm:w-auto" onClick={() => setEditingId('new')}>
                <PlusCircle size={16} className="mr-1" /> Add Ally
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="min-h-0 md:min-h-[420px]">
                {editingId ? (
                  editingId === 'new' ? (
                    <NewAllyCard
                      isEditing={true}
                      guildCharacters={guildCharacters}
                      ownerCharacterId={character.id}
                      linkedCharacterIds={linkedCharacterIds}
                      onSave={handleSave}
                      onCancel={handleCancel}
                    />
                  ) : selectedAlly ? (
                    <AllyCard
                      ally={selectedAlly}
                      isEditing={true}
                      large
                      guildCharacters={guildCharacters}
                      linkedCharacterIds={linkedCharacterIds}
                      onEdit={() => setEditingId(editingId)}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      onRemove={handleRemove}
                    />
                  ) : null
                ) : (
                  <div className="space-y-3">
                    <AllySkeletonCard />
                    <p className="text-center text-xs text-base-content/60">
                      Select an ally on the left to edit, or add a new ally.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}
