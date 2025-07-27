import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Ally, Character } from '@/types'
import { BookHeart, PlusCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import RichTextEditor from '@/components/ui/rich-text-editor'

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
  useEffect(() => {
    setEditData({ ...ally })
  }, [ally])
  const handleChange = (key: keyof Ally, value: string) => {
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
            {ally.avatar ? (
              <img src={ally.avatar} alt={`${ally.name}'s avatar`} className="h-full w-full object-cover" />
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
          {editData.avatar ? (
            <img src={editData.avatar} alt={`${editData.name}'s avatar`} className="h-full w-full object-cover" />
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
      <input
        type="text"
        value={editData.classes}
        placeholder="Classes"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('classes', e.target.value)}
      />
      <input
        type="text"
        value={editData.species}
        placeholder="Species"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('species', e.target.value)}
      />
      <RichTextEditor
        placeholder="Notes"
        value={editData.notes}
        onChange={(content) => handleChange('notes', content)}
      >
        Notes
      </RichTextEditor>
      <input
        type="text"
        value={editData.avatar}
        placeholder="Avatar URL"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('avatar', e.target.value)}
      />
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
  const handleChange = (key: keyof Ally, value: string) => {
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
      <input
        type="text"
        value={editData.classes}
        placeholder="Classes"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('classes', e.target.value)}
      />
      <input
        type="text"
        value={editData.species}
        placeholder="Species"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('species', e.target.value)}
      />
      <RichTextEditor
        placeholder="Notes"
        value={editData.notes}
        onChange={(content) => handleChange('notes', content)}
      >
        Notes
      </RichTextEditor>
      <input
        type="text"
        value={editData.avatar}
        placeholder="Avatar URL"
        className="input input-bordered input-xs mb-1 w-full"
        onChange={(e) => handleChange('avatar', e.target.value)}
      />
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
