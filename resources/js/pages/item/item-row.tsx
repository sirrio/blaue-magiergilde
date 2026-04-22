import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { formatSourceOptionLabel, formatSourceKindShortLabel, sourceKindBadgeClass } from '@/helper/sourceDisplay'
import { useTranslate } from '@/lib/i18n'
import { renderDiscordLine } from '@/lib/shopLineTemplate'
import { cn } from '@/lib/utils'
import { CompendiumCommentsModal } from '@/pages/compendium/compendium-comments-modal'
import { Item, MundaneItemVariant, PageProps, ShopItem, Source, Spell } from '@/types'
import { useForm, usePage, router } from '@inertiajs/react'
import { Copy, Dices, FlaskRound, Minus, Package, Pencil, Plus, RotateCcw, ScrollText, Scale, Send, Shield, Store, Sword, Trash } from 'lucide-react'
import { type ReactElement, useEffect, useState } from 'react'

const rarityColors: Record<string, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  very_rare: 'text-rarity-very-rare',
  legendary: 'text-rarity-legendary',
  artifact: 'text-rarity-artifact',
  unknown_rarity: 'text-rarity-unknown-rarity',
}

const typeIcons: Record<string, ReactElement> = {
  weapon: <Sword />,
  armor: <Shield />,
  item: <Package />,
  consumable: <FlaskRound />,
  spellscroll: <ScrollText />,
}

const getRarityTextColor = (rarity: string): string => {
  return rarityColors[rarity] || ''
}

const renderIcon = (type: string): ReactElement | null => {
  return typeIcons[type] || null
}

const getShopSpellSnapshot = (shopItem?: ShopItem): Spell | null => {
  if (!shopItem) return null
  if (shopItem.spell_name || shopItem.spell_id) {
    return {
      id: shopItem.spell?.id ?? 0,
      name: shopItem.spell_name ?? 'Unknown spell',
      url: shopItem.spell_url ?? '',
      legacy_url: shopItem.spell_legacy_url ?? '',
      spell_level: shopItem.spell_level ?? 0,
      spell_school: (shopItem.spell_school ?? 'abjuration') as Spell['spell_school'],
      ruling_changed: shopItem.spell_ruling_changed ?? false,
      ruling_note: shopItem.spell_ruling_note ?? null,
    }
  }
  return null
}

const copyToClipboard = (text: string, message = 'Copied to clipboard.') => {
  navigator.clipboard.writeText(text).then(() => {
    toast.show(message, 'info')
  })
}

const reloadCurrentPage = () => {
  if (typeof window === 'undefined') {
    router.reload()
    return
  }

  router.visit(window.location.href, {
    preserveScroll: true,
    preserveState: true,
    replace: true,
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
const variantCategoryByType: Record<Item['type'], 'weapon' | 'armor' | null> = {
  weapon: 'weapon',
  armor: 'armor',
  item: null,
  consumable: null,
  spellscroll: null,
}

type SpellSchool = (typeof spellSchools)[number]

const formatVariantCost = (costGp?: number | null): string => {
  if (costGp == null) return 'variable'
  return `${costGp} GP`
}

const VariantSelector = ({
  variants,
  selectedIds,
  onToggle,
  itemType,
  helperText,
  error,
}: {
  variants: MundaneItemVariant[]
  selectedIds: number[]
  onToggle: (id: number) => void
  itemType: Item['type']
  helperText?: React.ReactNode
  error?: string | null
}) => {
  const requiredCategory = variantCategoryByType[itemType]
  if (requiredCategory === null) {
    return (
      <div className={cn('rounded-box border p-3 text-xs', error ? 'border-error/40 bg-error/5 text-error' : 'border-base-200 text-base-content/70')}>
        <p>Mundane variants are only used for weapon and armor types.</p>
        {helperText ? <div className="mt-1">{helperText}</div> : null}
        {error ? <div className="mt-1 font-medium">{error}</div> : null}
      </div>
    )
  }

  const entries = variants.filter((variant) => variant.category === requiredCategory)
  const heading = requiredCategory === 'weapon' ? 'Weapon variants' : 'Armor variants'
  const selectedEntries = entries.filter((variant) => selectedIds.includes(variant.id))
  const hasSelectedPlaceholder = selectedEntries.some((variant) => Boolean(variant.is_placeholder))
  const hasSelectedSpecific = selectedEntries.some((variant) => !variant.is_placeholder)

  return (
    <div className="space-y-2 rounded-box border border-base-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">{heading} (Optional)</p>
      <p className="text-xs text-base-content/60">The "Any" option is exclusive and cannot be combined with specific variants.</p>
      {helperText ? <p className="text-xs text-base-content/60">{helperText}</p> : null}
      {error ? <p className="text-xs font-medium text-error">{error}</p> : null}
      <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
        {entries.map((variant) => {
          const checked = selectedIds.includes(variant.id)
          const disabled = (hasSelectedPlaceholder && !checked && !variant.is_placeholder)
            || (hasSelectedSpecific && !checked && variant.is_placeholder)
          return (
            <label
              key={variant.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded px-1 py-1 text-xs',
                disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-base-200/60',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(variant.id)}
                />
                <span>{variant.name}</span>
              </span>
              <span className="text-base-content/60">{formatVariantCost(variant.cost_gp)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

const filterVariantIdsByType = (
  type: Item['type'],
  variantIds: number[],
  variants: MundaneItemVariant[],
): number[] => {
  const requiredCategory = variantCategoryByType[type]
  if (requiredCategory === null) {
    return []
  }

  const allowed = new Set(
    variants
      .filter((variant) => variant.category === requiredCategory)
      .map((variant) => variant.id),
  )

  return variantIds.filter((id) => allowed.has(id))
}

const AddSpellModal = ({ shopItemId }: { shopItemId: number }) => {
  const { data, setData, post } = useForm({
    spell_levels: [] as number[],
    spell_schools: [] as SpellSchool[],
  })

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

  const toggleSchool = (school: SpellSchool) => {
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
        reloadCurrentPage()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="xs"
          variant="ghost"
          modifier="square"
          onClick={() => setIsOpen(true)}
          aria-label="Add spell to listing"
        >
          <Plus size={14} />
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

const ShopItemSnapshotModal = ({ shopItem, item }: { shopItem: ShopItem; item: Item }) => {
  const baseCost = item.display_cost ?? item.cost ?? ''
  const { data, setData, patch, processing } = useForm({
    name: item.name ?? '',
    url: item.url ?? '',
    cost: baseCost,
    notes: shopItem.notes ?? '',
    rarity: item.rarity ?? 'common',
    type: item.type ?? 'item',
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setData({
      name: item.name ?? '',
      url: item.url ?? '',
      cost: baseCost,
      notes: shopItem.notes ?? '',
      rarity: item.rarity ?? 'common',
      type: item.type ?? 'item',
    })
  }, [baseCost, isOpen, item.name, item.rarity, item.type, item.url, setData, shopItem.notes])

  const handleSubmit = () => {
    patch(route('admin.shop-items.snapshot.update', { shopItem: shopItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        reloadCurrentPage()
      },
      onError: (errors) => {
        const message = errors.name || errors.url || errors.cost || errors.rarity || errors.type || errors.notes
        if (message) {
          toast.show(String(message), 'error')
        }
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)} title="Edit listing" aria-label="Edit listing">
          <Pencil size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Edit listing</ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Item snapshot</p>
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
                <option value="legendary">Legendary</option>
                <option value="artifact">Artifact</option>
                <option value="unknown_rarity">Unknown rarity</option>
              </SelectOptions>
            </Select>
            <Select value={data.type} onChange={(e) => setData('type', e.target.value as Item['type'])}>
              <SelectLabel>Type</SelectLabel>
              <SelectOptions>
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="item">Item</option>
                <option value="consumable">Consumable</option>
                <option value="spellscroll">Spell Scroll</option>
              </SelectOptions>
            </Select>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Shop listing</p>
            <Input value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
              Notes
            </Input>
          </div>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
    </Modal>
  )
}

export default function ItemRow({
  item,
  shopItem,
  sources = [],
  mundaneVariants = [],
  lineTemplate = null,
  canUpdatePostLine = false,
  canManage = true,
}: {
  item: Item
  shopItem?: ShopItem
  sources?: Source[]
  mundaneVariants?: MundaneItemVariant[]
  lineTemplate?: string | null
  canUpdatePostLine?: boolean
  canManage?: boolean
}) {
  const t = useTranslate()
  const formData = {
    id: item.id,
    name: item.name,
    url: item.url,
    type: item.type,
    rarity: item.rarity,
    source_id: item.source_id ?? '',
    mundane_variant_ids: item.mundane_variant_ids ?? [],
    extra_cost_note: item.extra_cost_note ?? '',
    shop_enabled: item.shop_enabled ?? true,
    guild_enabled: item.guild_enabled ?? true,
    default_spell_roll_enabled: item.default_spell_roll_enabled ?? false,
    default_spell_levels: item.default_spell_levels ?? [],
    default_spell_schools: (item.default_spell_schools ?? []) as SpellSchool[],
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
      setData('default_spell_schools', [] as SpellSchool[])
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

  const toggleDefaultSpellSchool = (school: SpellSchool) => {
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

  const toggleMundaneVariant = (variantId: number) => {
    const isSelected = data.mundane_variant_ids.includes(variantId)
    if (isSelected) {
      setData('mundane_variant_ids', data.mundane_variant_ids.filter((id) => id !== variantId))
      return
    }

    const targetVariant = mundaneVariants.find((variant) => variant.id === variantId)
    if (!targetVariant) {
      setData('mundane_variant_ids', [...data.mundane_variant_ids, variantId])
      return
    }

    if (targetVariant.is_placeholder) {
      setData('mundane_variant_ids', [variantId])
      return
    }

    const selectedPlaceholder = mundaneVariants.find(
      (variant) => data.mundane_variant_ids.includes(variant.id) && variant.is_placeholder,
    )
    const nextIds = selectedPlaceholder
      ? data.mundane_variant_ids.filter((id) => id !== selectedPlaceholder.id)
      : data.mundane_variant_ids

    setData('mundane_variant_ids', [...nextIds, variantId])
  }

  const handleTypeChange = (nextType: Item['type']) => {
    setData('type', nextType)
    const nextVariantIds = filterVariantIdsByType(nextType, data.mundane_variant_ids, mundaneVariants)
    setData('mundane_variant_ids', nextVariantIds)
    if (nextType === 'weapon' || nextType === 'armor') {
      setData('extra_cost_note', '')
    }
  }

  const spell = getShopSpellSnapshot(shopItem)
  const resolvedCost = item.display_cost ?? item.cost
  const shopNotes = shopItem?.notes?.trim()
  const baseName = shopNotes ? `${item.name} - ${shopNotes}` : item.name
  const displayName = spell ? `${baseName} - ${spell.name}` : baseName
  const dndBeyondLink = `https://www.dndbeyond.com/magic-items?filter-type=0&filter-search=${item.name}&filter-partnered-content=t`
  const spellUrl = spell?.url || shopItem?.spell_url || ''
  const spellLegacyUrl = spell?.legacy_url || shopItem?.spell_legacy_url || ''
  const isCustomListing = Boolean(shopItem?.snapshot_custom)
  const discordLineText = renderDiscordLine(lineTemplate, {
    itemName: item.name,
    notes: shopNotes,
    itemUrl: item.url ?? '',
    itemCost: resolvedCost ?? '',
    spellId: shopItem?.spell_id ?? null,
    spellName: spell?.name ?? shopItem?.spell_name ?? '',
    spellUrl,
    spellLegacyUrl,
    sourceKind: shopItem?.roll_source_kind ?? null,
    sourceShortcode: shopItem?.source_shortcode ?? null,
  })

  const handleSnapshotRefresh = () => {
    if (!shopItem) return
    if (!window.confirm('Refresh this listing from the compendium?')) return

    router.post(route('admin.shop-items.snapshot.refresh', { shopItem: shopItem.id }), {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Listing refreshed.', 'info')
        reloadCurrentPage()
      },
      onError: (errors) => {
        const message = errors.snapshot || 'Listing could not be refreshed.'
        toast.show(String(message), 'error')
      },
    })
  }

  const handleRerollShopLine = () => {
    if (!shopItem) return
    if (!window.confirm('Reroll this shop line?')) return

    router.post(route('admin.shop-items.reroll', { shopItem: shopItem.id }), {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Shop line rerolled.', 'info')
        reloadCurrentPage()
      },
      onError: (errors) => {
        const message = errors.shop_item || 'Shop line could not be rerolled.'
        toast.show(String(message), 'error')
      },
    })
  }

  const handleRemoveSpell = () => {
    if (!shopItem) return
    if (!window.confirm('Remove the attached spell from this shop item?')) return

    router.delete(route('admin.shop-items.spell.destroy', { shopItem: shopItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        reloadCurrentPage()
      },
      onError: () => {
        toast.show('Spell could not be removed.', 'error')
      },
    })
  }

  const handleDeleteItem = () => {
    if (shopItem || !canManage) return
    if (!window.confirm(`Delete item "${item.name}"?`)) return

    router.delete(route('admin.items.destroy', { item }), {
      preserveScroll: true,
      onError: () => {
        toast.show('Item could not be deleted.', 'error')
      },
    })
  }
  const [isUpdatingPostLine, setIsUpdatingPostLine] = useState(false)
  const handleUpdatePostedLine = async () => {
    if (!shopItem || isUpdatingPostLine) return

    const csrfToken = typeof document !== 'undefined'
      ? (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? ''
      : ''

    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsUpdatingPostLine(true)
    try {
      const response = await fetch(route('admin.shop-items.update-post-line', { shopItem: shopItem.id }), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Posted line could not be updated.'), 'error')
        return
      }
      toast.show('Posted line updated.', 'info')
    } catch {
      toast.show('Posted line could not be updated.', 'error')
    } finally {
      setIsUpdatingPostLine(false)
    }
  }

  return (
    <ListRow>
      <div className={cn(textColor)}>{renderIcon(item.type)}</div>
      <div className={cn(textColor, 'text-xs sm:text-sm flex flex-col')}>
        <span>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="link link-hover font-medium" title="Open item URL">
              {displayName}
            </a>
          ) : (
            <span>{displayName}</span>
          )}{' '}
            <span className={'text-xs font-light italic'}>({item.pick_count})</span>
            {item.source?.shortcode ? (
              <>
                <span className="ml-2 rounded-full border border-base-300 px-2 py-0.5 text-[9px] uppercase text-base-content/70">
                  {item.source.shortcode}
                </span>
                <span className={cn('ml-1 rounded-full border px-2 py-0.5 text-[9px] uppercase', sourceKindBadgeClass(item.source.kind))}>
                  {formatSourceKindShortLabel(item.source.kind, t)}
                </span>
              </>
            ) : null}
          {item.mundane_variants?.length ? (
            <span className="ml-2 rounded-full border border-info/40 px-2 py-0.5 text-[9px] uppercase text-info">
              {item.mundane_variants.length} variant{item.mundane_variants.length === 1 ? '' : 's'}
            </span>
          ) : null}
          {shopItem && isCustomListing ? (
            <span className="ml-2 rounded-full border border-warning/40 px-2 py-0.5 text-[9px] uppercase text-warning">
              Custom listing
            </span>
          ) : null}
        </span>
        {shopItem ? (
          <span className="mt-0.5 font-mono text-[10px] text-base-content/40 break-all">{discordLineText}</span>
        ) : null}
        {autoRollSummary ? (
          <span className="text-[11px] text-base-content/60">{autoRollSummary}</span>
        ) : null}
      </div>
      <div className="max-w-56 font-mono text-xs">{resolvedCost ? resolvedCost : <span className="text-error">No cost available</span>}</div>
      {!shopItem ? (
        <div className="flex items-center justify-center gap-2 text-xs">
          {isShopEnabled ? (
            <Tooltip content="Included in shop rolls" placement="top">
              <span className="inline-flex" aria-label="Included in shop rolls">
                <Store className="h-4 w-4 text-success" />
              </span>
            </Tooltip>
          ) : (
            <Tooltip content="Excluded from shop rolls" placement="top">
              <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-label="Excluded from shop rolls">
                <Store className="h-4 w-4 text-base-content/40" />
                <span className="absolute h-0.5 w-5 rotate-45 bg-error"></span>
              </span>
            </Tooltip>
          )}
          {isGuildEnabled ? (
            <Tooltip content="Allowed in guild" placement="top">
              <span className="inline-flex" aria-label="Allowed in guild">
                <Shield className="h-4 w-4 text-success" />
              </span>
            </Tooltip>
          ) : (
            <Tooltip content="Not allowed in guild" placement="top">
              <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-label="Not allowed in guild">
                <Shield className="h-4 w-4 text-base-content/40" />
                <span className="absolute h-0.5 w-5 rotate-45 bg-error"></span>
              </span>
            </Tooltip>
          )}
        </div>
      ) : null}
      {!shopItem ? (
        <Tooltip content={rulingLabel} placement="top" wrapperElement="div">
          <div className="flex items-center justify-center text-xs" aria-label={rulingLabel}>
            <Scale className={cn('h-4 w-4', hasRulingChange ? 'text-warning' : 'text-base-content/40')} />
          </div>
        </Tooltip>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          size="xs"
          variant="ghost"
          modifier="square"
          aria-label="Copy Discord line"
          onClick={() => copyToClipboard(discordLineText, 'Item line copied in Discord format.')}
        >
          <Copy size={14} />
        </Button>
        {shopItem && !spell ? <AddSpellModal shopItemId={shopItem.id} /> : null}
        {shopItem && spell ? (
          <Button
            size="xs"
            variant="ghost"
            modifier="square"
            onClick={handleRemoveSpell}
            aria-label="Remove spell from listing"
          >
            <Minus size={14} />
          </Button>
        ) : null}
        {shopItem ? (
          <>
            <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
            <Button
              size="xs"
              variant="ghost"
              modifier="square"
              onClick={handleSnapshotRefresh}
              aria-label="Refresh listing from base item"
            >
              <RotateCcw size={14} />
            </Button>
            <Button
              size="xs"
              variant="ghost"
              modifier="square"
              onClick={handleUpdatePostedLine}
              disabled={!canUpdatePostLine || isUpdatingPostLine}
              title={canUpdatePostLine ? 'Update posted line in Discord' : 'Post this shop first'}
              aria-label="Update posted line in Discord"
            >
              <Send size={14} />
            </Button>
            <ShopItemSnapshotModal shopItem={shopItem} item={item} />
            <Button
              size="xs"
              variant="ghost"
              modifier="square"
              color="error"
              onClick={handleRerollShopLine}
              aria-label="Reroll line"
            >
              <Dices size={14} />
            </Button>
          </>
        ) : null}
        {!shopItem && canManage ? (
          <>
            <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
            <Modal>
              <ModalTrigger>
                <Button size="xs" variant="ghost" modifier="square" aria-label="Edit item">
                  <Pencil size={14} />
                </Button>
              </ModalTrigger>
              <ModalTitle>
                <div className="flex items-center">
                  Update item
                  <Tooltip content="Search on D&D Beyond" placement="right">
                    <a href={dndBeyondLink} target="_blank" rel="noreferrer" className="ml-4 flex items-center" aria-label="Search on D&D Beyond">
                      <img src="/images/dnd-beyond-logo.svg" className="absolute" alt="dnd-beyond-link" />
                    </a>
                  </Tooltip>
                </div>
              </ModalTitle>
              <ModalContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Basic</p>
                    <Input errors={errors.name} placeholder="Blade of Truth" value={data.name} onChange={(e) => setData('name', e.target.value)}>
                      Name
                    </Input>
                    <Input errors={errors.url} placeholder="https://..." type="url" value={data.url} onChange={(e) => setData('url', e.target.value)}>
                      URL
                    </Input>
                    <Select
                      errors={errors.source_id}
                      value={data.source_id}
                      onChange={(e) => setData('source_id', e.target.value ? Number(e.target.value) : '')}
                    >
                      <SelectLabel>Source</SelectLabel>
                      <SelectOptions>
                        <option value="">No source</option>
                        {sources.map((source) => (
                          <option key={source.id} value={source.id}>
                              {formatSourceOptionLabel(source, t)}
                          </option>
                        ))}
                      </SelectOptions>
                    </Select>
                    <VariantSelector
                      variants={mundaneVariants}
                      selectedIds={data.mundane_variant_ids}
                      onToggle={toggleMundaneVariant}
                      itemType={data.type as Item['type']}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Classification</p>
                    <Select errors={errors.rarity} value={data.rarity} onChange={(e) => setData('rarity', e.target.value as Item['rarity'])}>
                      <SelectLabel>Rarity</SelectLabel>
                      <SelectOptions>
                        <option value="common">Common</option>
                        <option value="uncommon">Uncommon</option>
                        <option value="rare">Rare</option>
                        <option value="very_rare">Very Rare</option>
                        <option value="legendary">Legendary</option>
                        <option value="artifact">Artifact</option>
                        <option value="unknown_rarity">Unknown rarity</option>
                      </SelectOptions>
                    </Select>
                    <Select errors={errors.type} value={data.type} onChange={(e) => handleTypeChange(e.target.value as Item['type'])}>
                      <SelectLabel>Type</SelectLabel>
                      <SelectOptions>
                        <option value="weapon">Weapon</option>
                        <option value="armor">Armor</option>
                        <option value="item">Item</option>
                        <option value="consumable">Consumable</option>
                        <option value="spellscroll">Spell Scroll</option>
                      </SelectOptions>
                    </Select>
                    {data.type === 'item' || data.type === 'consumable' || data.type === 'spellscroll' ? (
                      <Input
                        errors={errors.extra_cost_note}
                        value={data.extra_cost_note}
                        onChange={(e) => setData('extra_cost_note', e.target.value)}
                      >
                        Extra cost note (optional)
                      </Input>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Options</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={Boolean(data.shop_enabled)}
                        onChange={(e) => setData('shop_enabled', e.target.checked)}
                      />
                      <span className="inline-flex items-center gap-2">
                        <Store className="h-4 w-4 text-base-content/70" />
                        Include in shop rolls
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={Boolean(data.guild_enabled)}
                        onChange={(e) => setData('guild_enabled', e.target.checked)}
                      />
                      <span className="inline-flex items-center gap-2">
                        <Shield className="h-4 w-4 text-base-content/70" />
                        Allowed in guild
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={Boolean(data.ruling_changed)}
                        onChange={(e) => handleRulingToggle(e.target.checked)}
                      />
                      <span className="inline-flex items-center gap-2">
                        <Scale className={cn('h-4 w-4', data.ruling_changed ? 'text-warning' : 'text-base-content/70')} />
                        Ruling changed
                      </span>
                    </label>
                    {data.ruling_changed ? (
                      <TextArea value={data.ruling_note} onChange={(e) => setData('ruling_note', e.target.value)} placeholder="Describe the ruling change...">
                        Ruling note
                      </TextArea>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Auto-roll</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={Boolean(data.default_spell_roll_enabled)}
                        onChange={(e) => handleAutoRollToggle(e.target.checked)}
                      />
                      <span className="inline-flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-base-content/70" />
                        Auto-roll spell on shop
                      </span>
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
                                    {spellSchoolLabels[school] ?? school}
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </ModalContent>
              <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
            </Modal>
          </>
        ) : null}
        {!shopItem && canManage ? (
          <Button size="xs" variant="ghost" modifier="square" color="error" onClick={handleDeleteItem} aria-label="Delete item">
            <Trash size={14} />
          </Button>
        ) : null}
        {!shopItem ? (
          <>
            <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
            <CompendiumCommentsModal
              title={`Kommentare zu ${item.name}`}
              comments={item.comments}
              count={item.comments_count}
              storeRoute={route('compendium.items.comments.store', { item: item.id })}
            />
          </>
        ) : null}
      </div>
    </ListRow>
  )
}



