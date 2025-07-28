import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Tooltip } from '@/components/ui/tooltip'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { cn } from '@/lib/utils'
import { CharacterClassToggle } from '@/pages/character/character-class-toggle'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Settings } from 'lucide-react'

const UpdateCharacterModal = ({ character }: { character: Character }) => {
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
  const { classes, factions, versions, errors } = usePage<PageProps>().props

  const handleFormSubmit = () => {
    post(route('characters.update', { character, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        <Tooltip text="Edit Character">
          <Button
            aria-label="Edit Character"
            className={"hidden group-hover:flex"}
            size="xs"
            modifier="square"
          >
            <Settings size={14} />
          </Button>
        </Tooltip>
      </ModalTrigger>
      <ModalTitle>Update character</ModalTitle>
      <ModalContent>
        <form>
          <h3 className="mb-2 mt-2 font-semibold">Game Details</h3>
          <Input placeholder="Mordenkainen" errors={errors.name} type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            Name
          </Input>
          <CharacterClassToggle classes={classes} data={data} errors={errors} setData={setData}></CharacterClassToggle>
          <Select errors={errors.faction} value={data.faction} onChange={(e) => setData('faction', e.target.value as Character['faction'])}>
            <SelectLabel>Factions</SelectLabel>
            <SelectOptions>
              {Object.entries(factions).map(([key, value]: [string, string]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <Select errors={errors.version} value={data.version} onChange={(e) => setData('version', e.target.value as Character['version'])}>
            <SelectLabel>Versions</SelectLabel>
            <SelectOptions>
              {versions.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <h3 className="mb-2 mt-4 font-semibold">Economy</h3>
          <div className={cn('grid grid-cols-2 gap-2')}>
            <Input className="w-24" errors={errors.dm_bubbles} type="number" value={data.dm_bubbles} onChange={(e) => setData('dm_bubbles', Number(e.target.value))}>
              DM Bubbles
            </Input>
            <Input className="w-24" errors={errors.dm_coins} type="number" value={data.dm_coins} onChange={(e) => setData('dm_coins', Number(e.target.value))}>
              DM Coins
            </Input>
          </div>
          <Input
            className="w-24"
            errors={errors.bubble_shops_spend}
            type="number"
            value={data.bubble_shop_spend}
            onChange={(e) => setData('bubble_shop_spend', Number(e.target.value))}
          >
            Bubble Shop Spend
          </Input>
          <h3 className="mb-2 mt-4 font-semibold">Metadata</h3>
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
          <TextArea placeholder="Your notes" errors={errors.notes} value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}
export default UpdateCharacterModal
