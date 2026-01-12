import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Item, PageProps, ShopItem, Spell } from '@/types'
import { useForm, usePage, router } from '@inertiajs/react'
import { Copy, Edit, ExternalLink, FlaskRound, RotateCcw, ScrollText, Scale, Shield, StickyNote, Store, Sword, XCircle } from 'lucide-react'
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

const getShopSpellSnapshot = (shopItem?: ShopItem): Spell | null => {
  if (!shopItem) return null
  if (shopItem.spell_name) {
    return {
      id: 0,
      name: shopItem.spell_name ?? 'Unknown spell',
      url: shopItem.spell_url ?? '',
      legacy_url: shopItem.spell_legacy_url ?? '',
      spell_level: shopItem.spell_level ?? 0,
      spell_school: (shopItem.spell_school ?? 'abjuration') as Spell['spell_school'],
      guild_enabled: shopItem.spell ? shopItem.spell.guild_enabled : undefined,
      ruling_changed: shopItem.spell ? shopItem.spell.ruling_changed : undefined,
      ruling_note: shopItem.spell ? shopItem.spell.ruling_note : undefined,
    }
  }
  if (shopItem.spell) return shopItem.spell
  return null
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

const ShopItemNoteModal = ({ shopItem }: { shopItem: ShopItem }) => {
  const { data, setData, patch, processing } = useForm({
    notes: shopItem.notes ?? '',
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setData('notes', shopItem.notes ?? '')
  }, [isOpen, setData, shopItem.notes])

  const handleSubmit = () => {
    patch(route('admin.shop-items.notes.update', { shopItem: shopItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)} aria-label="Edit shop note">
          <StickyNote size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Shop notes</ModalTitle>
      <ModalContent>
        <Input value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
          Notes
        </Input>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
    </Modal>
  )
}

const ShopItemSnapshotModal = ({ shopItem, item }: { shopItem: ShopItem; item: Item }) => {
  const { data, setData, patch, processing } = useForm({
    name: item.name ?? '',
    url: item.url ?? '',
    cost: item.cost ?? '',
    rarity: item.rarity ?? 'common',
    type: item.type ?? 'item',
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setData({
      name: item.name ?? '',
      url: item.url ?? '',
      cost: item.cost ?? '',
      rarity: item.rarity ?? 'common',
      type: item.type ?? 'item',
    })
  }, [isOpen, item.cost, item.name, item.rarity, item.type, item.url, setData])

  const handleSubmit = () => {
    patch(route('admin.shop-items.snapshot.update', { shopItem: shopItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload({ preserveScroll: true, preserveState: true })
      },
      onError: (errors) => {
        const message = errors.name || errors.url || errors.cost || errors.rarity || errors.type
        if (message) {
          toast.show(String(message), 'error')
        }
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)} aria-label="Edit listing">
          <Edit size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Edit listing</ModalTitle>
      <ModalContent>
        <Input value={data.name} onChange={(e) => setData('name', e.target.value)}>
          Name
        </Input>
        <Input value={data.url ?? ''} onChange={(e) => setData('url', e.target.value)}>
          URL
        </Input>
        <Input value={data.cost ?? ''} onChange={(e) => setData('cost', e.target.value)}>
          Cost
        </Input>
        <Select value={data.rarity} onChange={(e) => setData('rarity', e.target.value as Item['rarity'])}>
          <SelectLabel>Rarity</SelectLabel>
          <SelectOptions>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very_rare">Very Rare</option>
          </SelectOptions>
        </Select>
        <Select value={data.type} onChange={(e) => setData('type', e.target.value as Item['type'])}>
          <SelectLabel>Type</SelectLabel>
          <SelectOptions>
            <option value="item">Item</option>
            <option value="spellscroll">Spell Scroll</option>
            <option value="consumable">Consumable</option>
          </SelectOptions>
        </Select>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
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
    guild_enabled: item.guild_enabled ?? true,
    default_spell_roll_enabled: item.default_spell_roll_enabled ?? false,
    default_spell_levels: item.default_spell_levels ?? [],
    default_spell_schools: item.default_spell_schools ?? [],
    ruling_changed: item.ruling_changed ?? false,
    ruling_note: item.ruling_note ?? '',
  }
  const { data, setData, post } = useForm(formData)
  const { errors } = usePage<PageProps>().props
  const textColor = getRarityTextColor(item.rarity)
  const autoRollSummary = !shopItem ? buildAutoRollSummary(item) : null
  const isShopEnabled = item.shop_enabled ?? true
  const isGuildEnabled = item.guild_enabled ?? true
  const hasRulingChange = Boolean(item.ruling_changed)
  const rulingNote = item.ruling_note?.trim()
  const rulingLabel = hasRulingChange
    ? (rulingNote ? `Ruling: ${rulingNote}` : 'Ruling change')
    : 'No ruling change'

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

  const handleRulingToggle = (enabled: boolean) => {
    setData('ruling_changed', enabled)
    if (!enabled) {
      setData('ruling_note', '')
    }
  }

  const spell = getShopSpellSnapshot(shopItem)
  const shopNotes = shopItem?.notes?.trim()
  const baseName = shopNotes ? `${item.name} - ${shopNotes}` : item.name
  const displayName = spell ? `${baseName} - ${spell.name}` : baseName
  const dndBeyondLink = `https://www.dndbeyond.com/magic-items?filter-type=0&filter-search=${item.name}&filter-partnered-content=t`
  const spellUrl = spell?.url || shopItem?.spell_url || ''
  const spellLegacyUrl = spell?.legacy_url || shopItem?.spell_legacy_url || ''
  const spellLegacyPart = spellLegacyUrl ? ` - [Legacy](<${spellLegacyUrl}>)` : ''
  const isCustomListing = Boolean(shopItem?.snapshot_custom)

  const handleSnapshotRefresh = () => {
    if (!shopItem) return
    if (!window.confirm('Refresh this listing from the compendium?')) return

    router.post(route('admin.shop-items.snapshot.refresh', { shopItem: shopItem.id }), {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Listing refreshed.', 'info')
        router.reload({ preserveScroll: true, preserveState: true })
      },
      onError: (errors) => {
        const message = errors.snapshot || 'Listing could not be refreshed.'
        toast.show(String(message), 'error')
      },
    })
  }

  return (
    <ListRow>
      <div className={cn(textColor)}>{renderIcon(item.type)}</div>
      <div className={cn(textColor, 'text-xs sm:text-sm flex flex-col')}>
        <span>
          {displayName}{' '}
          <span className={'text-xs font-light italic'}>({item.pick_count})</span>
          {shopItem && isCustomListing ? (
            <span className="ml-2 rounded-full border border-warning/40 px-2 py-0.5 text-[9px] uppercase text-warning">
              Custom listing
            </span>
          ) : null}
        </span>
        {autoRollSummary ? (
          <span className="text-[11px] text-base-content/60">{autoRollSummary}</span>
        ) : null}
      </div>
      <div className="max-w-20 font-mono text-xs">{item.cost ? item.cost : <span className="text-error">No cost available</span>}</div>
      {!shopItem ? (
        <div className="flex items-center justify-center gap-2 text-xs">
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
          {isGuildEnabled ? (
            <Shield className="h-4 w-4 text-success" title="Allowed in guild" aria-label="Allowed in guild" />
          ) : (
            <span
              className="relative inline-flex h-4 w-4 items-center justify-center"
              title="Not allowed in guild"
              aria-label="Not allowed in guild"
            >
              <Shield className="h-4 w-4 text-base-content/40" />
              <span className="absolute h-0.5 w-5 rotate-45 bg-error"></span>
            </span>
          )}
        </div>
      ) : null}
      {!shopItem ? (
        <div className="flex items-center justify-center text-xs" title={rulingLabel} aria-label={rulingLabel}>
          <Scale className={cn('h-4 w-4', hasRulingChange ? 'text-warning' : 'text-base-content/40')} />
        </div>
      ) : null}
      {shopItem ? (
        <>
          <ShopItemSnapshotModal shopItem={shopItem} item={item} />
          <Button size="xs" variant="ghost" modifier="square" onClick={handleSnapshotRefresh} aria-label="Refresh listing">
            <RotateCcw size={14} />
          </Button>
        </>
      ) : (
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={Boolean(data.guild_enabled)}
                onChange={(e) => setData('guild_enabled', e.target.checked)}
              />
              <span>Allowed in guild</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={Boolean(data.ruling_changed)}
                  onChange={(e) => handleRulingToggle(e.target.checked)}
                />
                <span>Ruling changed</span>
              </label>
              {data.ruling_changed ? (
                <TextArea value={data.ruling_note} onChange={(e) => setData('ruling_note', e.target.value)} placeholder="Describe the ruling change...">
                  Ruling note
                </TextArea>
              ) : null}
            </div>
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
      )}
      <Button
        size="xs"
        variant="ghost"
        modifier="square"
        onClick={() =>
          copyToClipboard(
            spell
              ? `[${baseName}](<${item.url}>) - [${spell.name}](<${spellUrl}>)${spellLegacyPart}: ${item.cost}`
              : `[${baseName}](<${item.url}>): ${item.cost}`,
          )
        }
      >
        <Copy size={14} />
      </Button>
      {shopItem && <ShopItemNoteModal shopItem={shopItem} />}
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
