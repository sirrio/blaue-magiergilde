import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { useTranslate } from '@/lib/i18n'
import { CharacterClassToggle } from '@/pages/character/character-class-toggle'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Pencil } from 'lucide-react'
import React, { useState } from 'react'

const UpdateCharacterModal = ({
  character,
  children,
}: {
  character: Character
  children?: React.ReactNode
}) => {
  const t = useTranslate()
  const { classes, factions, versions, errors } = usePage<PageProps>().props
  const formData = {
    name: character.name,
    class: character.character_classes.map((cc) => cc.id),
    faction: character.faction,
    version: character.version,
    dm_bubbles: character.dm_bubbles,
    dm_coins: character.dm_coins,
    notes: character.notes,
    bubble_shop_spend: character.bubble_shop_spend,
    external_link: character.external_link,
    is_filler: character.is_filler,
    avatar: undefined,
  }

  const { data, setData, post } = useForm(formData)
  const [activeTab, setActiveTab] = useState<'basics' | 'details'>('basics')

  const handleFormSubmit = () => {
    post(route('characters.update', { character, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        {children ?? (
          <Button
            className="flex md:hidden md:group-hover:flex"
            size="xs"
            modifier="square"
            aria-label="Edit character"
            title="Edit character"
          >
            <Pencil size={14} />
          </Button>
        )}
      </ModalTrigger>
      <ModalTitle>{t('characters.editCharacterTitle')}</ModalTitle>
      <ModalContent>
        <form>
          <div role="tablist" className="tabs tabs-border mb-2">
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'basics' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('basics')}
            >
              {t('characters.basicsTab')}
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              {t('characters.detailsTab')}
            </button>
          </div>
          {activeTab === 'basics' ? (
            <div className="space-y-3">
              <Input placeholder="Mordenkainen" errors={errors.name} type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}>
                {t('characters.nameLabel')}
              </Input>
              <CharacterClassToggle classes={classes} data={data} errors={errors} setData={setData}></CharacterClassToggle>
              <Select errors={errors.faction} value={data.faction} onChange={(e) => setData('faction', e.target.value as Character['faction'])}>
                <SelectLabel>{t('characters.factionsLabel')}</SelectLabel>
                <SelectOptions>
                  {Object.entries(factions).map(([key, value]: [string, string]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Select errors={errors.version} value={data.version} onChange={(e) => setData('version', e.target.value as Character['version'])}>
                <SelectLabel>{t('characters.versionsLabel')}</SelectLabel>
                <SelectOptions>
                  {versions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Input
                placeholder="https://www.dndbeyond.com/characters/..."
                errors={errors.external_link}
                type="url"
                value={data.external_link}
                onChange={(e) => setData('external_link', e.target.value)}
              >
                {t('characters.dndBeyondLink')}
              </Input>
              <FileInput errors={errors.avatar} onChange={(e) => setData('avatar', e.target?.files?.[0] as never)}>
                {t('characters.avatarLabel')}
              </FileInput>
              <p className="text-xs text-base-content/60">{t('characters.avatarFormatsHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input errors={errors.dm_bubbles} type="number" min={0} max={1024} value={data.dm_bubbles} onChange={(e) => setData('dm_bubbles', Number(e.target.value))}>
                  {t('characters.dmBubbles')}
                </Input>
                <Input errors={errors.dm_coins} type="number" min={0} max={1024} value={data.dm_coins} onChange={(e) => setData('dm_coins', Number(e.target.value))}>
                  {t('characters.dmCoins')}
                </Input>
              </div>
              <Input
                errors={errors.bubble_shop_spend}
                type="number"
                min={0}
                max={1024}
                value={data.bubble_shop_spend}
                onChange={(e) => setData('bubble_shop_spend', Number(e.target.value))}
              >
                {t('characters.bubbleShopSpend')}
              </Input>
              <TextArea placeholder="Notes" errors={errors.notes} value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
                {t('characters.notesLabel')}
              </TextArea>
            </div>
          )}
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>{t('characters.saveCharacter')}</ModalAction>
    </Modal>
  )
}
export default UpdateCharacterModal
