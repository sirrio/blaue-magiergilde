import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import DurationInputStack from '@/components/duration-input-stack'
import { useTranslate } from '@/lib/i18n'
import AdventureParticipantPicker from '@/pages/character/adventure-ally-picker'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Swords } from 'lucide-react'
import React, { useState } from 'react'

const StoreAdventureModal = ({ character, guildCharacters = [] }: { character: Character; guildCharacters?: Character[] }) => {
  const t = useTranslate()
  const initialFormData = {
    duration: 10800,
    character_id: character.id,
    start_date: new Date().toISOString().slice(0, 10),
    has_additional_bubble: false,
    notes: '',
    title: '',
    game_master: '',
    ally_ids: [] as number[],
    guild_character_ids: [] as number[],
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage<PageProps>().props
  const [activeTab, setActiveTab] = useState<'details' | 'participants'>('details')

  const handleFormSubmit = () => {
    post(route('adventures.store'), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  const bubbleCount = Math.trunc(data.duration / 10800)

  return (
    <Modal>
      <ModalTrigger>
        <Button size="sm" className="w-full justify-center gap-1" aria-label={t('characters.addAdventure')} title={t('characters.addAdventure')}>
          <Swords size={14} />
          <span className="md:hidden">{t('characters.adventure')}</span>
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('characters.addAdventureTitle')}</ModalTitle>
      <ModalContent>
        <form>
          <div role="tablist" className="tabs tabs-border mb-2">
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              {t('characters.detailsTab')}
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'participants' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              {t('characters.participantsTab')}
            </button>
          </div>
          {activeTab === 'details' ? (
            <div className="space-y-3">
              <DurationInputStack
                mode="session"
                value={data.duration}
                onChange={(next) => setData('duration', next)}
                errors={errors.duration}
              />
              <p className="text-base-content/50 text-xs">
                {t('characters.rewardBubbles', { count: `${bubbleCount}${data.has_additional_bubble ? '+1' : ''}` })}
              </p>
          <Input
            placeholder="Dragons in Waterdeep"
            errors={errors.title}
            type="text"
            value={data.title}
            onChange={(e) => setData('title', e.target.value)}
          >
            {t('characters.titleLabel')}
          </Input>
          <Input
            placeholder="Matt Mercer"
            errors={errors.game_master}
            type="text"
            value={data.game_master}
            onChange={(e) => setData('game_master', e.target.value)}
          >
            {t('characters.gameMasterLabel')}
          </Input>
          <Input errors={errors.start_date} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)}>
            {t('characters.dateLabel')}
          </Input>
          <TextArea placeholder="Notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            {t('characters.notesLabel')}
          </TextArea>
            <Checkbox
              errors={errors.has_additional_bubble}
              checked={data.has_additional_bubble}
            onChange={(e) => setData('has_additional_bubble', e.target.checked)}
          >
              {t('characters.characterQuestReward')}
            </Checkbox>
            </div>
          ) : (
            <div className="space-y-3">
              <AdventureParticipantPicker
                allies={character.allies ?? []}
                guildCharacters={guildCharacters.filter((entry) => entry.id !== character.id)}
                selectedAllyIds={data.ally_ids}
                selectedGuildCharacterIds={data.guild_character_ids}
                onChange={({ allyIds, guildCharacterIds }) => {
                  setData('ally_ids', allyIds)
                  setData('guild_character_ids', guildCharacterIds)
                }}
              />
              <div className="text-right text-xs text-base-content/60">
                {t('characters.selectedCount', { count: data.ally_ids.length + data.guild_character_ids.length })}
              </div>
            </div>
          )}
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>{t('common.save')}</ModalAction>
    </Modal>
  )
}

export default StoreAdventureModal
