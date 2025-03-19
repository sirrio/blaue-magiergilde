import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import Toast from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { PageProps, Spell } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Copy, Edit, ExternalLink, XCircle } from 'lucide-react'

const schoolColors: Record<string, string> = {
  abjuration: 'text-[#007BFF]', // Blue
  conjuration: 'text-[#FFC107]', // Yellow
  divination: 'text-[#6C757D]', // Gray
  enchantment: 'text-[#E83E8C]', // Pink
  evocation: 'text-[#DC3545]', // Red
  illusion: 'text-[#6F42C1]', // Purple
  necromancy: 'text-[#28A745]', // Green
  transmutation: 'text-[#FD7E14]', // Orange
}

const getSpellSchoolTextColor = (school: string): string => {
  return schoolColors[school] || ''
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    Toast.show('Text copied to clipboard', 'info')
  })
}

export default function SpellRow({ spell }: { spell: Spell }) {
  const formData = {
    id: spell.id,
    name: spell.name,
    url: spell.url || '',
    legacy_url: spell.legacy_url || '',
    spell_school: spell.spell_school || '',
    spell_level: spell.spell_level,
  }
  const { data, setData, post } = useForm(formData)
  const { errors } = usePage<PageProps>().props
  const textColor = getSpellSchoolTextColor(spell.spell_school || '')

  const handleFormSubmit = () => {
    post(route('spells.update', { spell, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  const dndBeyondLink = `https://www.dndbeyond.com/spells?filter-search=${spell.name}&filter-partnered-content=t`

  return (
    <ListRow>
      <div>
        <svg className={cn('icon h-6 w-6 fill-current', textColor)}>
          <use xlinkHref={`/images/spell-schools.svg#${spell.spell_school}`}></use>
        </svg>
      </div>
      <div className={cn(textColor, 'text-xs sm:text-sm')}>
        {spell.name} <span className={'text-xs font-light italic'}>(Level {spell.spell_level})</span>
      </div>
      <Modal>
        <ModalTrigger>
          <Button size="xs" variant="ghost" modifier="square">
            <Edit size={14} />
          </Button>
        </ModalTrigger>
        <ModalTitle>
          <div className="flex items-center">
            Update Spell
            <div className="tooltip tooltip-right w-16" data-tip="Search on D&D Beyond">
              <a href={dndBeyondLink} target="_blank" rel="noreferrer" className="ml-4 flex items-center">
                <img src="/images/dnd-beyond-logo.svg" className="absolute" alt="dnd-beyond-link" />
              </a>
            </div>
          </div>
        </ModalTitle>
        <ModalContent>
          <Input errors={errors.name} placeholder="Fireball" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            Name
          </Input>
          <Input errors={errors.url} placeholder="https://..." type="url" value={data.url} onChange={(e) => setData('url', e.target.value)}>
            URL
          </Input>
          <Input
            errors={errors.legacy_url}
            placeholder="https://..."
            type="url"
            value={data.legacy_url}
            onChange={(e) => setData('legacy_url', e.target.value)}
          >
            Legacy URL
          </Input>
          <Input
            errors={errors.spell_level}
            placeholder="3"
            type="number"
            value={data.spell_level}
            onChange={(e) => setData('spell_level', Number(e.target.value))}
          >
            Spell Level
          </Input>
          <Select
            errors={errors.spell_school}
            value={data.spell_school}
            onChange={(e) => setData('spell_school', e.target.value as Spell['spell_school'])}
          >
            <SelectLabel>School</SelectLabel>
            <SelectOptions>
              <option value="abjuration">Abjuration</option>
              <option value="conjuration">Conjuration</option>
              <option value="divination">Divination</option>
              <option value="enchantment">Enchantment</option>
              <option value="evocation">Evocation</option>
              <option value="illusion">Illusion</option>
              <option value="necromancy">Necromancy</option>
              <option value="transmutation">Transmutation</option>
            </SelectOptions>
          </Select>
        </ModalContent>
        <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
      </Modal>
      {spell.legacy_url ? (
        <Button size="xs" variant="ghost" modifier="square" onClick={() => copyToClipboard(`:PHB14: [${spell.name}](<${spell.legacy_url}>)`)}>
          L<Copy size={14} />
        </Button>
      ) : (
        <Button disabled size="xs" variant="ghost" modifier="square" className="text-error">
          L<XCircle size={14} />
        </Button>
      )}
      {spell.legacy_url ? (
        <Button as="a" href={spell.legacy_url} target="_blank" size="xs" variant="ghost" modifier="square">
          L<ExternalLink size={14} />
        </Button>
      ) : (
        <Button disabled size="xs" variant="ghost" modifier="square" className="text-error">
          L<XCircle size={14} />
        </Button>
      )}
      {spell.url ? (
        <Button size="xs" variant="ghost" modifier="square" onClick={() => copyToClipboard(`:PHB24: [${spell.name}](<${spell.url}>)`)}>
          <Copy size={14} />
        </Button>
      ) : (
        <Button disabled size="xs" variant="ghost" modifier="square" className="text-error">
          <XCircle size={14} />
        </Button>
      )}
      {spell.url ? (
        <Button as="a" href={spell.url} target="_blank" size="xs" variant="ghost" modifier="square">
          <ExternalLink size={14} />
        </Button>
      ) : (
        <Button disabled size="xs" variant="ghost" modifier="square" className="text-error">
          <XCircle size={14} />
        </Button>
      )}
    </ListRow>
  )
}
