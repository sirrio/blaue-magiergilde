import { Checkbox } from '@/components/ui/checkbox'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { cn } from '@/lib/utils'
import { CharacterClassToggle } from '@/pages/character/character-class-toggle'
import LogoFiller from '@/components/logo-filler'
import { PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import React, { useState } from 'react'

const StoreCharacterModal = ({ children }: React.PropsWithChildren) => {
  const { classes, factions, versions, tiers, errors, features } = usePage<PageProps>().props
  const isCharacterStatusSwitchEnabled = features?.character_status_switch ?? true
  const initialFormData = {
    name: '',
    class: [] as number[],
    faction: 'none',
    version: '2024',
    dm_bubbles: 0,
    dm_coins: 0,
    notes: '',
    bubble_shop_spend: 0,
    external_link: '',
    is_filler: false,
    start_tier: 'bt',
    guild_status: isCharacterStatusSwitchEnabled ? 'pending' : 'draft',
    avatar: undefined,
  }

  const { data, setData, post } = useForm(initialFormData)
  const [activeTab, setActiveTab] = useState<'basics' | 'details'>('basics')

  const handleFormSubmit = () => {
    post(route('characters.store'), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>{children}</ModalTrigger>
      <ModalTitle>Add character</ModalTitle>
      <ModalContent>
        <form>
          <div role="tablist" className="tabs tabs-border mb-2">
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'basics' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('basics')}
            >
              Basics
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
          </div>
          {activeTab === 'basics' ? (
            <div className="space-y-3">
              <Input placeholder="Mordenkainen" errors={errors.name} type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}>
                Name
              </Input>
              <CharacterClassToggle classes={classes} data={data} errors={errors} setData={setData}></CharacterClassToggle>
              <Select errors={errors.start_tier} value={data.start_tier} onChange={(e) => setData('start_tier', e.target.value)}>
                <SelectLabel>Start tier</SelectLabel>
                <SelectOptions>
                  {Object.entries(tiers).map(([key, value]: [string, string]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Select errors={errors.faction} value={data.faction} onChange={(e) => setData('faction', e.target.value)}>
                <SelectLabel>Factions</SelectLabel>
                <SelectOptions>
                  {Object.entries(factions).map(([key, value]: [string, string]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Select errors={errors.version} value={data.version} onChange={(e) => setData('version', e.target.value)}>
                <SelectLabel>Versions</SelectLabel>
                <SelectOptions>
                  {versions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Select
                errors={errors.guild_status}
                value={data.guild_status}
                onChange={(e) => setData('guild_status', e.target.value as 'pending' | 'draft')}
                disabled={!isCharacterStatusSwitchEnabled}
              >
                <SelectLabel>Visibility</SelectLabel>
                <SelectOptions>
                  <option value="pending">Active</option>
                  <option value="draft">Draft</option>
                </SelectOptions>
              </Select>
              <Input
                placeholder="https://..."
                errors={errors.external_link}
                type="url"
                value={data.external_link}
                onChange={(e) => setData('external_link', e.target.value)}
              >
                External Link
              </Input>
              <FileInput errors={errors.avatar} onChange={(e) => setData('avatar', e.target?.files?.[0] as never)}>
                Avatar
              </FileInput>
              <p className="text-xs text-base-content/60">Accepted: JPG, PNG, GIF, WEBP · Max. 5 MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={cn('grid grid-cols-2 gap-2')}>
            <Input errors={errors.dm_bubbles} type="number" min={0} max={1024} value={data.dm_bubbles} onChange={(e) => setData('dm_bubbles', Number(e.target.value))}>
              DM Bubbles
            </Input>
            <Input errors={errors.dm_coins} type="number" min={0} max={1024} value={data.dm_coins} onChange={(e) => setData('dm_coins', Number(e.target.value))}>
              DM Coins
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
                Bubble Shop Spend
              </Input>
              <TextArea placeholder="Notes" errors={errors.notes} value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
                Notes
              </TextArea>
              <Checkbox errors={errors.is_filler} checked={data.is_filler} onChange={(e) => setData('is_filler', e.target.checked)}>
                <span className="flex items-center gap-2">
                  <LogoFiller width={14} />
                  This character is a filler character.
                </span>
              </Checkbox>
            </div>
          )}
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}
export default StoreCharacterModal
