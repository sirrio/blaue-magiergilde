import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Item, PageProps, ShopItem } from '@/types'
import { useForm, usePage, router } from '@inertiajs/react'
import { Copy, Edit, ExternalLink, FlaskRound, ScrollText, Sword, XCircle } from 'lucide-react'
import React, { useState, JSX } from 'react'

const rarityColors: Record<string, string> = {
  common: 'text-gray-700',
  uncommon: 'text-green-700',
  rare: 'text-blue-700',
  very_rare: 'text-purple-700',
}

const typeIcons: Record<string, JSX.Element> = {
  item: <Sword />,
  spellscroll: <ScrollText />,
  consumable: <FlaskRound />,
}

const getRarityTextColor = (rarity: string): string => {
  return rarityColors[rarity] || ''
}

const renderIcon = (type: string): JSX.Element | null => {
  return typeIcons[type] || null
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.show('Characters copied to clipboard', 'info')
  })
}

const AddSpellModal = ({ shopItemId }: { shopItemId: number }) => {
  const levels = Array.from({ length: 10 }, (_, i) => i)
  const schools = [
    'abjuration',
    'conjuration',
    'divination',
    'enchantment',
    'evocation',
    'illusion',
    'necromancy',
    'transmutation',
  ] as const

  const { data, setData, post } = useForm({ spell_levels: [] as number[], spell_schools: [] as string[] })

  const [isOpen, setIsOpen] = useState(false)

  const toggleLevel = (level: number) => {
    setData(
      'spell_levels',
      data.spell_levels.includes(level)
        ? data.spell_levels.filter((l) => l !== level)
        : [...data.spell_levels, level],
    )
  }

  const toggleSchool = (school: string) => {
    setData(
      'spell_schools',
      data.spell_schools.includes(school)
        ? data.spell_schools.filter((s) => s !== school)
        : [...data.spell_schools, school],
    )
  }

  const handleSubmit = () => {
    post(route('shop-items.add-spell', { shopItem: shopItemId }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload({ preserveScroll: true })
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)}>
          +
        </Button>
      </ModalTrigger>
      <ModalTitle>Select spell options</ModalTitle>
      <ModalContent>
        <div className="mb-2">
          <p className="fieldset-label">Levels</p>
          <div className="grid grid-cols-5 gap-1">
            {levels.map((lvl) => {
              const id = `lvl-${lvl}`
              return (
                <div className="flex items-center gap-1" key={lvl}>
                  <input
                    type="checkbox"
                    id={id}
                    className="checkbox checkbox-xs"
                    checked={data.spell_levels.includes(lvl)}
                    onChange={() => toggleLevel(lvl)}
                  />
                  <label htmlFor={id} className="fieldset-label cursor-pointer">
                    {lvl === 0 ? 'Cantrip' : lvl}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mb-2">
          <p className="fieldset-label">Schools</p>
          <div className="grid grid-cols-2 gap-1">
            {schools.map((sc) => {
              const id = `sc-${sc}`
              return (
                <div className="flex items-center gap-1" key={sc}>
                  <input
                    type="checkbox"
                    id={id}
                    className="checkbox checkbox-xs"
                    checked={data.spell_schools.includes(sc)}
                    onChange={() => toggleSchool(sc)}
                  />
                  <label htmlFor={id} className="fieldset-label cursor-pointer flex items-center gap-1">
                    <svg className="icon h-4 w-4 fill-current">
                      <use xlinkHref={`/images/spell-schools.svg#${sc}`}></use>
                    </svg>
                    {sc.toUpperCase()}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Roll</ModalAction>
    </Modal>
  )
}

export default function ItemRow({ item, shopItem }: { item: Item; shopItem?: ShopItem }) {
  const formData = {
    id: item.id,
    name: item.name,
    url: item.url,
    cost: item.cost,
    type: item.type,
    rarity: item.rarity,
  }
  const { data, setData, post } = useForm(formData)
  const { errors } = usePage<PageProps>().props
  const textColor = getRarityTextColor(item.rarity)

  const handleFormSubmit = () => {
    post(route('items.update', { item, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  const spell = shopItem?.spell
  const dndBeyondLink = `https://www.dndbeyond.com/magic-items?filter-type=0&filter-search=${item.name}&filter-partnered-content=t`

  return (
    <ListRow>
      <div className={cn(textColor)}>{renderIcon(item.type)}</div>
      <div className={cn(textColor, 'text-xs sm:text-sm')}>
        {spell ? `${item.name} - ${spell.name}` : item.name}{' '}
        <span className={'text-xs font-light italic'}>({item.pick_count})</span>
      </div>
      <div className="max-w-20 font-mono text-xs">{item.cost ? item.cost : <span className="text-error">No cost available</span>}</div>
      <Modal>
        <ModalTrigger>
          <Button size="xs" variant="ghost" modifier="square">
            <Edit size={14} />
          </Button>
        </ModalTrigger>
        <ModalTitle>
          <div className="flex items-center">
            Update item
            <div className="tooltip tooltip-right w-16" data-tip="Search on D&D Beyond">
              <a href={dndBeyondLink} target="_blank" rel="noreferrer" className="ml-4 flex items-center">
                <img src="/images/dnd-beyond-logo.svg" className="absolute" alt="dnd-beyond-link" />
              </a>
            </div>
          </div>
        </ModalTitle>
        <ModalContent>
          <Input errors={errors.name} placeholder="Blade of Truth" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            Name
          </Input>
          <Input errors={errors.url} placeholder="https://..." type="url" value={data.url} onChange={(e) => setData('url', e.target.value)}>
            URL
          </Input>
          <Input errors={errors.cost} placeholder="1000 GP" value={data.cost} onChange={(e) => setData('cost', e.target.value)}>
            Cost
          </Input>
          <Select errors={errors.rarity} value={data.rarity} onChange={(e) => setData('rarity', e.target.value as Item['rarity'])}>
            <SelectLabel>Rarity</SelectLabel>
            <SelectOptions>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="very_rare">Very Rare</option>
            </SelectOptions>
          </Select>
          <Select errors={errors.type} value={data.type} onChange={(e) => setData('type', e.target.value as Item['type'])}>
            <SelectLabel>Type</SelectLabel>
            <SelectOptions>
              <option value="item">Item</option>
              <option value="spellscroll">Spell Scroll</option>
              <option value="consumable">Consumable</option>
            </SelectOptions>
          </Select>
        </ModalContent>
        <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
      </Modal>
      <Button
        size="xs"
        variant="ghost"
        modifier="square"
        onClick={() =>
          copyToClipboard(
            spell
              ? `[${item.name}](<${item.url}>) - [${spell.name}](<${spell.url}>) - [Legacy](<${spell.legacy_url}>): ${item.cost}`
              : `[${item.name}](<${item.url}>): ${item.cost}`,
          )
        }
      >
        <Copy size={14} />
      </Button>
      {shopItem && !spell && <AddSpellModal shopItemId={shopItem.id} />}
      {item.url ? (
        <Button as="a" href={item.url} target="_blank" size="xs" variant="ghost" modifier="square">
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
