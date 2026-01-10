import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Item, PageProps, ShopItem } from '@/types'
import { useForm, usePage, router } from '@inertiajs/react'
import { Copy, Edit, ExternalLink, FlaskRound, ScrollText, Store, Sword, XCircle } from 'lucide-react'
import React, { useEffect, useState, JSX } from 'react'

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

const spellSchoolLabels: Record<string, string> = {
  abjuration: 'Abjuration',
  conjuration: 'Conjuration',
  divination: 'Divination',
  enchantment: 'Enchantment',
  evocation: 'Evocation',
  illusion: 'Illusion',
  necromancy: 'Necromancy',
  transmutation: 'Transmutation',
}

const formatSpellLevelRange = (levels: number[]) => {
  const sorted = Array.from(new Set(levels)).sort((a, b) => a - b)
  if (sorted.length === 0) return ''

  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]
    if (current === prev + 1) {
      prev = current
      continue
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`)
    start = current
    prev = current
  }
  ranges.push(start === prev ? String(start) : `${start}-${prev}`)

  return ranges
    .map((range) => {
      if (range === '0') return 'Cantrip'
      if (range.startsWith('0-')) return `Cantrip-${range.slice(2)}`
      return range
    })
    .join(',')
}

const buildAutoRollSummary = (item: Item) => {
  if (!item.default_spell_roll_enabled) return null
  const levels = item.default_spell_levels ?? []
  if (levels.length === 0) return null

  const levelLabel = formatSpellLevelRange(levels)
  const schools = item.default_spell_schools ?? []
  const schoolKeys = Object.keys(spellSchoolLabels)
  const isAllSchools = new Set(schools).size === schoolKeys.length
  const schoolLabel = schools.length > 0
    ? (isAllSchools ? 'All' : schools.map((school) => spellSchoolLabels[school] ?? school).join('/'))
    : 'Any school'
  const formattedLevelLabel = /^[0-9]/.test(levelLabel) ? `L${levelLabel}` : levelLabel

  return `Auto-roll: ${formattedLevelLabel} | ${schoolLabel}`
}

const spellLevels = Array.from({ length: 10 }, (_, i) => i)
const spellSchools = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
] as const

const AddSpellModal = ({ shopItemId }: { shopItemId: number }) => {
  const { data, setData, post } = useForm({ spell_levels: [] as number[], spell_schools: [] as string[] })

  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setData('spell_levels', [0])
    setData('spell_schools', [...spellSchools])
  }, [isOpen, setData])

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
    post(route('admin.shop-items.add-spell', { shopItem: shopItemId }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload()
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
          <p className="label">Levels</p>
          <div className="grid grid-cols-5 gap-1">
            {spellLevels.map((lvl) => {
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
                  <label htmlFor={id} className="label cursor-pointer">
                    {lvl === 0 ? 'Cantrip' : lvl}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mb-2">
          <p className="label">Schools</p>
          <div className="grid grid-cols-2 gap-1">
            {spellSchools.map((sc) => {
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
                  <label htmlFor={id} className="label cursor-pointer flex items-center gap-1">
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
    shop_enabled: item.shop_enabled ?? true,
    default_spell_roll_enabled: item.default_spell_roll_enabled ?? false,
    default_spell_levels: item.default_spell_levels ?? [],
    default_spell_schools: item.default_spell_schools ?? [],
  }
  const { data, setData, post } = useForm(formData)
  const { errors } = usePage<PageProps>().props
  const textColor = getRarityTextColor(item.rarity)
  const autoRollSummary = !shopItem ? buildAutoRollSummary(item) : null
  const isShopEnabled = item.shop_enabled ?? true

  const handleFormSubmit = () => {
    if (data.default_spell_roll_enabled && data.default_spell_levels.length === 0) {
      toast.show('Select at least one default spell level.', 'error')
      return
    }
    post(route('admin.items.update', { item, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  const handleAutoRollToggle = (enabled: boolean) => {
    setData('default_spell_roll_enabled', enabled)
    if (!enabled) {
      setData('default_spell_levels', [])
      setData('default_spell_schools', [])
      return
    }
    if (data.default_spell_levels.length === 0) {
      setData('default_spell_levels', [0])
    }
    if (data.default_spell_schools.length === 0) {
      setData('default_spell_schools', [...spellSchools])
    }
  }

  const toggleDefaultSpellLevel = (level: number) => {
    setData(
      'default_spell_levels',
      data.default_spell_levels.includes(level)
        ? data.default_spell_levels.filter((value) => value !== level)
        : [...data.default_spell_levels, level],
    )
  }

  const toggleDefaultSpellSchool = (school: string) => {
    setData(
      'default_spell_schools',
      data.default_spell_schools.includes(school)
        ? data.default_spell_schools.filter((value) => value !== school)
        : [...data.default_spell_schools, school],
    )
  }

  const spell = shopItem?.spell
  const dndBeyondLink = `https://www.dndbeyond.com/magic-items?filter-type=0&filter-search=${item.name}&filter-partnered-content=t`

  return (
    <ListRow>
      <div className={cn(textColor)}>{renderIcon(item.type)}</div>
      <div className={cn(textColor, 'text-xs sm:text-sm flex flex-col')}>
        <span>
          {spell ? `${item.name} - ${spell.name}` : item.name}{' '}
          <span className={'text-xs font-light italic'}>({item.pick_count})</span>
        </span>
        {autoRollSummary ? (
          <span className="text-[11px] text-base-content/60">{autoRollSummary}</span>
        ) : null}
      </div>
      <div className="max-w-20 font-mono text-xs">{item.cost ? item.cost : <span className="text-error">No cost available</span>}</div>
      {!shopItem ? (
        <div className="flex items-center justify-center text-xs">
          {isShopEnabled ? (
            <Store className="h-4 w-4 text-success" title="Included in shop rolls" aria-label="Included in shop rolls" />
          ) : (
            <span
              className="relative inline-flex h-4 w-4 items-center justify-center"
              title="Excluded from shop rolls"
              aria-label="Excluded from shop rolls"
            >
              <Store className="h-4 w-4 text-base-content/40" />
              <span className="absolute h-0.5 w-5 rotate-45 bg-error"></span>
            </span>
          )}
        </div>
      ) : null}
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={Boolean(data.shop_enabled)}
              onChange={(e) => setData('shop_enabled', e.target.checked)}
            />
            <span>Include in shop rolls</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={Boolean(data.default_spell_roll_enabled)}
                onChange={(e) => handleAutoRollToggle(e.target.checked)}
              />
              <span>Auto-roll spell on shop</span>
            </label>
            {data.default_spell_roll_enabled ? (
              <div className="space-y-3">
                <div>
                  <p className="label">Default spell levels</p>
                  <div className="grid grid-cols-5 gap-1">
                    {spellLevels.map((level) => {
                      const id = `default-level-${item.id}-${level}`
                      return (
                        <div key={level} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id={id}
                            className="checkbox checkbox-xs"
                            checked={data.default_spell_levels.includes(level)}
                            onChange={() => toggleDefaultSpellLevel(level)}
                          />
                          <label htmlFor={id} className="label cursor-pointer">
                            {level === 0 ? 'Cantrip' : level}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="label">Default spell schools</p>
                  <div className="grid grid-cols-2 gap-1">
                    {spellSchools.map((school) => {
                      const id = `default-school-${item.id}-${school}`
                      return (
                        <div key={school} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id={id}
                            className="checkbox checkbox-xs"
                            checked={data.default_spell_schools.includes(school)}
                            onChange={() => toggleDefaultSpellSchool(school)}
                          />
                          <label htmlFor={id} className="label cursor-pointer flex items-center gap-1">
                            <svg className="icon h-4 w-4 fill-current">
                              <use xlinkHref={`/images/spell-schools.svg#${school}`}></use>
                            </svg>
                            {school.toUpperCase()}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
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
