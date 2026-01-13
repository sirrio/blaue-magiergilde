import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/text-area'
import createRandomString from '@/helper/createRandomString'
import { Ally, Character, CharacterClass, PageProps } from '@/types'
import { BookHeart, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import type { RequestPayload } from '@inertiajs/core'

interface AlliesModalProps {
  character: Character
}

const standingOrder = ['best', 'good', 'normal', 'bad']

interface AllyCardProps {
  ally: Ally
  isEditing: boolean
  onEdit: () => void
  onSave: (ally: Ally) => void
  onCancel: () => void
  onRemove: (ally: Ally) => void
  large?: boolean
}

const AllyCard: React.FC<AllyCardProps> = ({ ally, isEditing, onEdit, onSave, onCancel, onRemove, large = false }) => {
  const [editData, setEditData] = useState<Ally>({ ...ally })
  const [avatarSrc, setAvatarSrc] = useState('')
  const [editAvatarSrc, setEditAvatarSrc] = useState('')
  const { classes } = usePage<PageProps>().props
  useEffect(() => {
    setEditData({ ...ally })
  }, [ally])
  useEffect(() => {
    if (!ally.avatar) {
      setAvatarSrc('')
      return
    }
    if (typeof ally.avatar === 'string') {
      setAvatarSrc(`/storage/${ally.avatar}`)
      return
    }
    const url = URL.createObjectURL(ally.avatar)
    setAvatarSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [ally.avatar])
  useEffect(() => {
    if (!editData.avatar) {
      setEditAvatarSrc('')
      return
    }
    if (typeof editData.avatar === 'string') {
      setEditAvatarSrc(`/storage/${editData.avatar}`)
      return
    }
    const url = URL.createObjectURL(editData.avatar)
    setEditAvatarSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [editData.avatar])
  const handleChange = <K extends keyof Ally>(key: K, value: Ally[K]) => {
    setEditData({ ...editData, [key]: value })
  }
  if (!isEditing) {
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
              <img src={avatarSrc} alt={`${ally.name}'s avatar`} className="h-full w-full object-cover" />
            ) : (
              <div className="text-base-content flex h-full w-full items-center justify-center text-xs">N/A</div>
            )}
          </div>
          <div className="flex-1">
            <h4 className="truncate font-bold">{ally.name || 'Unnamed Ally'}</h4>
            <p className="text-base-content text-xs">
              {ally.classes && ally.classes.trim() !== '' ? ally.classes : 'No classes'} &bull;{' '}
              {ally.species && ally.species.trim() !== '' ? ally.species : 'No species'}
            </p>
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
          value={editData.name}
          placeholder="Name"
          onChange={(e) => handleChange('name', e.target.value)}
          className="flex-1"
        >
          Name
        </Input>
      </div>
      <div className="mb-1">
        <label className="label">Classes</label>
        <div className="grid grid-cols-4 gap-1 rounded border p-1 text-xs">
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
        value={editData.species}
        placeholder="Species"
        onChange={(e) => handleChange('species', e.target.value)}
        className="mb-1"
      >
        Species
      </Input>
      <div className="mb-1">
        <TextArea
          value={editData.notes}
          placeholder="Notes"
          onChange={(e) => handleChange('notes', e.target.value)}
        >
          Notes
        </TextArea>
      </div>
      <FileInput onChange={(e) => handleChange('avatar', e.target.files?.[0] as never)}>
        Avatar
      </FileInput>
      <label className="label">Standing</label>
      <select
        value={editData.standing}
        onChange={(e) => handleChange('standing', e.target.value as Ally['standing'])}
        className="input input-bordered input-xs mb-2 w-full"
      >
        {standingOrder.map((stand) => (
          <option key={stand} value={stand}>
            {stand.charAt(0).toUpperCase() + stand.slice(1)}
          </option>
        ))}
      </select>
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
    if (!ally.avatar) {
      setAvatarSrc('')
      return
    }
    if (typeof ally.avatar === 'string') {
      setAvatarSrc(`/storage/${ally.avatar}`)
      return
    }
    const url = URL.createObjectURL(ally.avatar)
    setAvatarSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [ally.avatar])

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
            <img src={avatarSrc} alt={`${ally.name}'s avatar`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-base-content/60">N/A</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{ally.name || 'Unnamed Ally'}</p>
          <p className="truncate text-xs text-base-content/60">
            {ally.classes && ally.classes.trim() !== '' ? ally.classes : 'No classes'} •{' '}
            {ally.species && ally.species.trim() !== '' ? ally.species : 'No species'}
          </p>
        </div>
      </div>
      <span className="text-xs capitalize text-base-content/60">{ally.standing}</span>
    </button>
  )
}

interface NewAllyCardProps {
  isEditing: boolean
  onSave: (ally: Ally) => void
  onCancel: () => void
  onEdit?: () => void
}

const NewAllyCard: React.FC<NewAllyCardProps> = ({
  isEditing,
  onSave,
  onCancel,
  onEdit,
}) => {
  const [editData, setEditData] = useState<Ally>({
    character_id: 0,
    id: 0,
    name: '',
    notes: '',
      avatar: '',
    classes: '',
    species: '',
    standing: 'normal',
  })
  const { classes } = usePage<PageProps>().props
  const handleChange = <K extends keyof Ally>(key: K, value: Ally[K]) => {
    setEditData({ ...editData, [key]: value })
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
        value={editData.name}
        placeholder="Name"
        onChange={(e) => handleChange('name', e.target.value)}
        className="mb-1"
      >
        Name
      </Input>
      <div className="mb-1">
        <label className="label">Classes</label>
        <div className="grid grid-cols-4 gap-1 rounded border p-1 text-xs">
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
        value={editData.species}
        placeholder="Species"
        onChange={(e) => handleChange('species', e.target.value)}
        className="mb-1"
      >
        Species
      </Input>
      <div className="mb-1">
        <TextArea
          value={editData.notes}
          placeholder="Notes"
          onChange={(e) => handleChange('notes', e.target.value)}
        >
          Notes
        </TextArea>
      </div>
      <FileInput onChange={(e) => handleChange('avatar', e.target.files?.[0] as never)}>
        Avatar
      </FileInput>
      <label className="label">Standing</label>
      <select
        value={editData.standing}
        onChange={(e) => handleChange('standing', e.target.value as Ally['standing'])}
        className="input input-bordered input-xs mb-2 w-full"
      >
        {standingOrder.map((stand) => (
          <option key={stand} value={stand}>
            {stand.charAt(0).toUpperCase() + stand.slice(1)}
          </option>
        ))}
      </select>
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

export const AlliesModal: React.FC<AlliesModalProps> = ({ character }) => {
  const [allies, setAllies] = useState<Ally[]>(character.allies)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [search, setSearch] = useState('')
  const [standingFilter, setStandingFilter] = useState<'all' | Ally['standing']>('all')
  const [openStandings, setOpenStandings] = useState<Record<Ally['standing'], boolean>>({
    best: false,
    good: false,
    normal: false,
    bad: false,
  })
  const handleSave = (ally: Ally) => {
    const payload: RequestPayload = { ...ally }
    if (ally.id === 0) {
      payload.character_id = character.id
    } else {
      payload._method = 'put'
    }
    if (!payload.avatar || typeof payload.avatar === 'string') {
      delete payload.avatar
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
    if (window.confirm(`Are you sure you want to remove ${ally.name}?`)) {
      router.delete(route('allies.destroy', ally.id), { preserveScroll: true })
      setAllies(allies.filter((a) => a.id !== ally.id))
      setEditingId(null)
    }
  }
  const filteredAllies = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? allies.filter((ally) => {
          const haystack = [ally.name, ally.classes, ally.species].filter(Boolean).join(' ').toLowerCase()
          return haystack.includes(query)
        })
      : allies
    if (standingFilter === 'all') {
      return filtered
    }
    return filtered.filter((ally) => ally.standing === standingFilter)
  }, [allies, search, standingFilter])

  useEffect(() => {
    if (search.trim() !== '' || standingFilter !== 'all') {
      setOpenStandings({
        best: true,
        good: true,
        normal: true,
        bad: true,
      })
    }
  }, [search, standingFilter])

  const grouped = standingOrder.map((standing) => ({
    standing,
    allies: filteredAllies.filter((ally) => ally.standing === standing),
  }))
  const visibleGroups =
    standingFilter === 'all'
      ? grouped
      : grouped.filter((group) => group.standing === standingFilter)

  const toggleStanding = (standing: Ally['standing']) => {
    setOpenStandings((current) => ({ ...current, [standing]: !current[standing] }))
  }

  const setAllStandings = (isOpen: boolean) => {
    setOpenStandings({
      best: isOpen,
      good: isOpen,
      normal: isOpen,
      bad: isOpen,
    })
  }

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
        <Button size="sm" className="w-full" aria-label="Manage allies" title="Manage allies">
          <BookHeart size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Manage Allies</ModalTitle>
      <ModalContent>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-base-content/50">Assigned allies</p>
                <h3 className="text-base font-semibold">{allies.length} total</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="ghost" onClick={() => setAllStandings(true)}>
                  Expand all
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setAllStandings(false)}>
                  Collapse all
                </Button>
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
                {[
                  { label: 'All', value: 'all' as const },
                  { label: 'Best', value: 'best' as const },
                  { label: 'Good', value: 'good' as const },
                  { label: 'Normal', value: 'normal' as const },
                  { label: 'Bad', value: 'bad' as const },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      standingFilter === option.value
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-base-200 text-base-content/70 hover:border-primary/40 hover:text-primary'
                    }`}
                    onClick={() => setStandingFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="text-xs text-base-content/60">
                  {search.trim() !== '' ? `${filteredAllies.length} matches` : `${filteredAllies.length} shown`}
                </span>
              </div>
            </div>

            <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
              {visibleGroups.map(({ standing, allies: group }) => (
                <div key={standing} className="rounded-lg border border-base-200 bg-base-100">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold capitalize"
                    onClick={() => toggleStanding(standing as Ally['standing'])}
                    aria-expanded={openStandings[standing as Ally['standing']]}
                  >
                    <span className="flex items-center gap-2">
                      {openStandings[standing as Ally['standing']] ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      {standing} <span className="text-xs text-base-content/50">({group.length})</span>
                    </span>
                  </button>
                  {openStandings[standing as Ally['standing']] ? (
                    <div className="space-y-2 border-t border-base-200 px-3 pb-3 pt-2">
                      {group.length > 0 ? (
                        group.map((ally) => (
                          <AllyRow
                            key={ally.id}
                            ally={ally}
                            isSelected={editingId === ally.id}
                            onSelect={() => handleSelectAlly(ally.id)}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-base-content/60">No allies in this category.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-base-content/50">Ally details</p>
                <h3 className="text-base font-semibold">{selectedAlly ? selectedAlly.name : 'Select an ally'}</h3>
              </div>
              <Button size="xs" onClick={() => setEditingId('new')}>
                <PlusCircle size={16} className="mr-1" /> Add Ally
              </Button>
            </div>

            {editingId ? (
              editingId === 'new' ? (
                <NewAllyCard isEditing={true} onSave={handleSave} onCancel={handleCancel} />
              ) : selectedAlly ? (
                <AllyCard
                  ally={selectedAlly}
                  isEditing={true}
                  large
                  onEdit={() => setEditingId(editingId)}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onRemove={handleRemove}
                />
              ) : null
            ) : (
              <div className="rounded-lg border border-dashed border-base-200 bg-base-100 p-6 text-sm text-base-content/60">
                Select an ally on the left to edit, or add a new ally.
              </div>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}
