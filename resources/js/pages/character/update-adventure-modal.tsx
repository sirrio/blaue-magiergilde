import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import AdventureParticipantPicker from '@/pages/character/adventure-ally-picker'
import { Adventure, Ally, Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Settings } from 'lucide-react'
import React, { useState } from 'react'

const UpdateAdventureModal = ({
  adventure,
  allies = [],
  guildCharacters = [],
  children,
}: {
  adventure: Adventure
  allies?: Ally[]
  guildCharacters?: Character[]
  children?: React.ReactNode
}) => {
  const initialFormData = {
    duration: adventure.duration,
    character_id: adventure.character_id,
    start_date: adventure.start_date,
    has_additional_bubble: adventure.has_additional_bubble,
    notes: adventure.notes ?? '',
    title: adventure.title ?? '',
    game_master: adventure.game_master ?? '',
    ally_ids: adventure.allies?.map((ally) => ally.id) ?? [],
    guild_character_ids: [] as number[],
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage<PageProps>().props
  const durationHours = Math.floor(data.duration / 3600)
  const durationMinutes = Math.floor((data.duration % 3600) / 60)
  const [activeTab, setActiveTab] = useState<'details' | 'participants'>('details')

  const handleFormSubmit = () => {
    post(route('adventures.update', { adventure, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  const bubbleCount = Math.trunc(data.duration / 10800)

  return (
    <Modal>
      <ModalTrigger>
        {children ?? (
          <Button size="xs" modifier="square" variant="ghost" aria-label="Edit adventure" title="Edit adventure">
            <Settings size={14} />
          </Button>
        )}
      </ModalTrigger>
      <ModalTitle>Edit Adventure</ModalTitle>
      <ModalContent>
        <form>
          <div role="tablist" className="tabs tabs-border mb-2">
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'participants' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>
          </div>
          {activeTab === 'details' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Hours"
                    errors={errors.duration}
                    type="number"
                    min={0}
                    value={durationHours}
                    onChange={(e) => {
                      const hours = Math.max(0, Number(e.target.value) || 0)
                      setData('duration', hours * 3600 + durationMinutes * 60)
                    }}
                  >
                    Duration (hours)
                  </Input>
                  <Input
                    placeholder="Minutes"
                    errors={errors.duration}
                    type="number"
                    min={0}
                    max={59}
                    value={durationMinutes}
                    onChange={(e) => {
                      const minutes = Math.min(59, Math.max(0, Number(e.target.value) || 0))
                      setData('duration', durationHours * 3600 + minutes * 60)
                    }}
                  >
                    Duration (minutes)
                  </Input>
                </div>
                <p className="text-base-content/50 text-xs">
                  Reward: {bubbleCount}
                  {data.has_additional_bubble ? '+1' : ''} bubbles
                </p>
                {errors.duration && <p className="fieldset-label text-error">{errors.duration}</p>}
                <Input
                  placeholder="Dragons in Waterdeep"
                  errors={errors.title}
                  type="text"
                  value={data.title}
                  onChange={(e) => setData('title', e.target.value)}
                >
                  Title
                </Input>
                <Input placeholder="Matt Mercer" errors={errors.game_master} type="text" value={data.game_master} onChange={(e) => setData('game_master', e.target.value)}>
                  Game master
                </Input>
                <Input errors={errors.start_date} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)}>
                  Date
                </Input>
                <TextArea placeholder="Notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
                  Notes
                </TextArea>
                <Checkbox errors={errors.has_additional_bubble} checked={data.has_additional_bubble} onChange={(e) => setData('has_additional_bubble', e.target.checked)}>
                  Character quest reward (+1 bubble)
                </Checkbox>
            </div>
          ) : (
            <div className="space-y-3">
              <AdventureParticipantPicker
                allies={allies}
                guildCharacters={guildCharacters.filter((entry) => entry.id !== adventure.character_id)}
                selectedAllyIds={data.ally_ids}
                selectedGuildCharacterIds={data.guild_character_ids}
                onChange={({ allyIds, guildCharacterIds }) => {
                  setData('ally_ids', allyIds)
                  setData('guild_character_ids', guildCharacterIds)
                }}
              />
              <div className="text-right text-xs text-base-content/60">
                {data.ally_ids.length + data.guild_character_ids.length} selected
              </div>
            </div>
          )}
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default UpdateAdventureModal
