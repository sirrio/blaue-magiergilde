import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import createRandomString from '@/helper/createRandomString'
import { Ally, Character, CharacterClass, PageProps } from '@/types'
import { BookHeart, PlusCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'

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
}

const AllyCard: React.FC<AllyCardProps> = ({ ally, isEditing, onEdit, onSave, onCancel, onRemove }) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (key: keyof Ally, value: any) => {
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
          <div className="bg-base-200 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
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
        <div className="bg-base-200 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
          {editAvatarSrc ? (
            <img src={editAvatarSrc} alt={`${editData.name}'s avatar`} className="h-full w-full object-cover" />
          ) : (
            <div className="text-base-content flex h-full w-full items-center justify-center text-xs">N/A</div>
          )}
        </div>
        <input
          type="text"
          value={editData.name}
          placeholder="Name"
          className="input input-bordered input-xs flex-1"
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>
      <div className="mb-1">
        <label className="fieldset-label">Classes</label>
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
                <label htmlFor={id} className="fieldset-label cursor-pointer">
                  {cc.name}
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <label className="fieldset-label">Species</label>
      <input
        type="text"
        value={editData.species}
        placeholder="Species"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('species', e.target.value)}
      />
      <textarea
        value={editData.notes}
        placeholder="Notes"
        className="textarea textarea-bordered textarea-xs mb-1 w-full"
        onChange={(e) => handleChange('notes', e.target.value)}
      />
      <FileInput onChange={(e) => handleChange('avatar', e.target.files?.[0] as never)}>
        Avatar
      </FileInput>
      <label className="fieldset-label">Standing</label>
      <select
        value={editData.standing}
        onChange={(e) => handleChange('standing', e.target.value)}
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

interface NewAllyCardProps {
  isEditing: boolean
  onSave: (ally: Ally) => void
  onCancel: () => void
}

const NewAllyCard: React.FC<NewAllyCardProps> = ({ isEditing, onSave, onCancel }) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (key: keyof Ally, value: any) => {
    setEditData({ ...editData, [key]: value })
  }
  if (!isEditing) {
    return (
      <div className="card bg-base-100 hover:bg-base-200 cursor-pointer border-2 border-dashed p-4 text-center shadow-sm" onClick={onCancel}>
        <PlusCircle size={24} className="mx-auto" />
        <p className="mt-2 text-sm">Add Ally</p>
      </div>
    )
  }
  return (
    <div className="card bg-base-200 border p-2 shadow">
      <input
        type="text"
        value={editData.name}
        placeholder="Name"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('name', e.target.value)}
      />
      <div className="mb-1">
        <label className="fieldset-label">Classes</label>
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
                <label htmlFor={id} className="fieldset-label cursor-pointer">
                  {cc.name}
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <label className="fieldset-label">Species</label>
      <input
        type="text"
        value={editData.species}
        placeholder="Species"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('species', e.target.value)}
      />
      <textarea
        value={editData.notes}
        placeholder="Notes"
        className="textarea textarea-bordered textarea-xs mb-1 w-full"
        onChange={(e) => handleChange('notes', e.target.value)}
      />
      <FileInput onChange={(e) => handleChange('avatar', e.target.files?.[0] as never)}>
        Avatar
      </FileInput>
      <label className="fieldset-label">Standing</label>
      <select
        value={editData.standing}
        onChange={(e) => handleChange('standing', e.target.value)}
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
  const handleSave = (ally: Ally) => {
    if (ally.id === 0) {
      router.post(route('allies.store'), { ...ally, character_id: character.id }, { preserveScroll: true })
      const newAlly = { ...ally, id: Date.now() }
      setAllies([...allies, newAlly])
    } else {
      router.put(route('allies.update', ally.id), { ...ally, _method: 'put' }, { preserveScroll: true })
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
  const grouped = standingOrder.map((standing) => ({
    standing,
    allies: allies.filter((ally) => ally.standing === standing),
  }))
  return (
    <Modal wide>
      <ModalTrigger>
        <Button size="sm" className="w-full">
          <BookHeart size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Manage Allies</ModalTitle>
      <ModalContent>
        <div className="mb-4">
          <Button size="xs" onClick={() => setEditingId('new')}>
            <PlusCircle size={16} className="mr-1" /> Add Ally
          </Button>
        </div>
        {editingId === 'new' && (
          <div className="mb-4">
            <h3 className="text-sm font-bold">New Ally</h3>
            <NewAllyCard isEditing={true} onSave={handleSave} onCancel={handleCancel} />
          </div>
        )}
        <div className="space-y-8">
          {grouped.map(({ standing, allies: group }) => (
            <div key={standing}>
              <h3 className="text-sm font-bold capitalize">
                {standing} {group.length === 0 && <span className="text-base-content text-xs">(No allies)</span>}
              </h3>
              {group.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {group.map((ally) => (
                    <AllyCard
                      key={ally.id}
                      ally={ally}
                      isEditing={editingId === ally.id}
                      onEdit={() => setEditingId(ally.id)}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-base-content text-xs">No allies in this category.</p>
              )}
            </div>
          ))}
        </div>
      </ModalContent>
      <ModalAction onClick={() => setEditingId(null)}>Close</ModalAction>
    </Modal>
  )
}
