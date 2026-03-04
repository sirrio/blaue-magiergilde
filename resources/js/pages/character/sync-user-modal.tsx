import { Checkbox } from '@/components/ui/checkbox'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { cn } from '@/lib/utils'
import { useTranslate } from '@/lib/i18n'
import { CharacterClassToggle } from '@/pages/character/character-class-toggle'
import { PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'

const StoreCharacterModal = ({ children }: React.PropsWithChildren) => {
  const t = useTranslate()
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
    avatar: undefined,
  }

  const { data, setData, post } = useForm(initialFormData)
  const { classes, factions, versions, tiers, errors } = usePage<PageProps>().props
  const startTierOptions = Object.entries(tiers).filter(([key]) => key !== 'et')

  const handleFormSubmit = () => {
    post(route('characters.store'), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>{children}</ModalTrigger>
      <ModalTitle>{t('characters.addCharacterTitle')}</ModalTitle>
      <ModalContent>
        <form>
          <Input placeholder="Mordenkainen" errors={errors.name} type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            {t('characters.nameLabel')}
          </Input>
          <CharacterClassToggle classes={classes} data={data} errors={errors} setData={setData}></CharacterClassToggle>
          <Checkbox errors={errors.is_filler} checked={data.is_filler} onChange={(e) => setData('is_filler', e.target.checked)}>
            {t('characters.fillerCharacter')}
          </Checkbox>
          <Select errors={errors.start_tier} value={data.start_tier} onChange={(e) => setData('start_tier', e.target.value)}>
            <SelectLabel>{t('characters.startTierLabel')}</SelectLabel>
            <SelectOptions>
              {startTierOptions.map(([key, value]: [string, string]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <Select errors={errors.faction} value={data.faction} onChange={(e) => setData('faction', e.target.value)}>
            <SelectLabel>{t('characters.factionsLabel')}</SelectLabel>
            <SelectOptions>
              {Object.entries(factions).map(([key, value]: [string, string]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <Select errors={errors.version} value={data.version} onChange={(e) => setData('version', e.target.value)}>
            <SelectLabel>{t('characters.versionsLabel')}</SelectLabel>
            <SelectOptions>
              {versions.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <div className={cn('grid grid-cols-2 gap-2')}>
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
          <TextArea placeholder="Your notes" errors={errors.notes} value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
            {t('characters.notesLabel')}
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>{t('common.save')}</ModalAction>
    </Modal>
  )
}
export default StoreCharacterModal
