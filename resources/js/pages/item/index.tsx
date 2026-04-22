import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { formatSourceOptionLabel } from '@/helper/sourceDisplay'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import ItemRow from '@/pages/item/item-row'
import { Item, MundaneItemVariant, PaginationMeta, Source } from '@/types'
import { Deferred, Head, router, useForm } from '@inertiajs/react'
import { LoaderCircle, Plus, Scale, ScrollText, Shield, Store } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface FilterOption {
  label: string
  value: string
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

const spellLevels = Array.from({ length: 10 }, (_, i) => i)
const spellSchools = Object.keys(spellSchoolLabels)
const variantCategoryByType: Record<Item['type'], 'weapon' | 'armor' | null> = {
  weapon: 'weapon',
  armor: 'armor',
  item: null,
  consumable: null,
  spellscroll: null,
}

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
      <p className="text-xs text-base-content/70">
        Select mundane base variants this {itemType} can apply to.
      </p>
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

const buildSuggestionItemValidationState = (
  type: Item['type'],
  variantIds: number[],
  variants: MundaneItemVariant[],
  extraCostNote: string,
) => {
  const requiredCategory = variantCategoryByType[type]
  const selectedVariants = variants.filter((variant) => variantIds.includes(variant.id))
  const hasPlaceholder = selectedVariants.some((variant) => Boolean(variant.is_placeholder))
  const specificCount = selectedVariants.filter((variant) => !variant.is_placeholder).length
  const invalidVariantSelection = requiredCategory === null && selectedVariants.length > 0

  const variantHint = requiredCategory === null
    ? 'Variants are not used for item, consumable, or spell scroll entries.'
    : hasPlaceholder
      ? `"Any ${requiredCategory}" is selected and excludes specific variants.`
      : specificCount > 0
        ? `${specificCount} specific ${requiredCategory} variant${specificCount === 1 ? '' : 's'} selected.`
        : `You can attach optional ${requiredCategory} variants or leave this empty.`

  const variantError = invalidVariantSelection
    ? 'Selected variants do not fit this type and will be removed on submit.'
    : null

  const trimmedExtraCostNote = extraCostNote.trim()
  const extraCostHint = requiredCategory === null
    ? 'Use extra cost note only when the item adds an extra cost, like material components or embedded valuables.'
    : 'Weapon and armor entries use mundane variants instead of an extra cost note.'
  const extraCostError = requiredCategory !== null && trimmedExtraCostNote !== ''
    ? 'Extra cost note is not used for weapon or armor entries.'
    : null

  return {
    variantHint,
    variantError,
    extraCostHint,
    extraCostError,
  }
}

const StoreItemModal = ({ sources, mundaneVariants }: { sources: Source[]; mundaneVariants: MundaneItemVariant[] }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    url: '',
    rarity: 'common',
    type: 'item',
    extra_cost_note: '',
    source_id: '' as number | '',
    mundane_variant_ids: [] as number[],
    shop_enabled: true,
    guild_enabled: true,
    default_spell_roll_enabled: false,
    default_spell_levels: [] as number[],
    default_spell_schools: [] as string[],
    ruling_changed: false,
    ruling_note: '',
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('shop_enabled', true)
    setData('guild_enabled', true)
    setData('source_id', '')
    setData('mundane_variant_ids', [])
    setData('extra_cost_note', '')
    setData('default_spell_roll_enabled', false)
    setData('default_spell_levels', [])
    setData('default_spell_schools', [])
    setData('ruling_changed', false)
    setData('ruling_note', '')
  }, [isOpen, reset, setData])

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

  const validationState = buildSuggestionItemValidationState(
    data.type as Item['type'],
    data.mundane_variant_ids,
    mundaneVariants,
    data.extra_cost_note,
  )

  const handleSubmit = () => {
    if (data.default_spell_roll_enabled && data.default_spell_levels.length === 0) {
      toast.show('Select at least one default spell level.', 'error')
      return
    }
    post(route('admin.items.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        reset()
        router.reload({ only: ['items'] })
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus size={14} /> {t('compendium.addItem')}
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.addItem')}</ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">{t('compendium.basic')}</p>
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
              helperText={validationState.variantHint}
              error={errors.mundane_variant_ids ?? errors['mundane_variant_ids.0'] ?? validationState.variantError}
            />
            {data.type === 'item' || data.type === 'consumable' || data.type === 'spellscroll' ? (
              <div className="space-y-1">
                <Input
                  errors={errors.extra_cost_note}
                  value={data.extra_cost_note}
                  onChange={(e) => setData('extra_cost_note', e.target.value)}
                >
                  Extra cost note (optional)
                </Input>
                <p className="text-xs text-base-content/60">{validationState.extraCostHint}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">{t('compendium.classification')}</p>
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
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">{t('compendium.options')}</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={Boolean(data.shop_enabled)}
                onChange={(e) => setData('shop_enabled', e.target.checked)}
              />
              <span className="inline-flex items-center gap-2">
                <Store className="h-4 w-4 text-base-content/70" />
                {t('compendium.includeInShop')}
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
                {t('compendium.allowedInGuild')}
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
                {t('compendium.rulingChanged')}
              </span>
            </label>
            {data.ruling_changed ? (
              <TextArea value={data.ruling_note} onChange={(e) => setData('ruling_note', e.target.value)} placeholder={t('compendium.describeRuling')}>
                {t('compendium.rulingNote')}
              </TextArea>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">{t('compendium.autoRoll')}</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={Boolean(data.default_spell_roll_enabled)}
                onChange={(e) => handleAutoRollToggle(e.target.checked)}
              />
              <span className="inline-flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-base-content/70" />
                {t('compendium.autoRollSpellOnShop')}
              </span>
            </label>
            {data.default_spell_roll_enabled ? (
              <div className="space-y-3">
                <div>
                  <p className="label">{t('compendium.defaultSpellLevels')}</p>
                  <div className="grid grid-cols-5 gap-1">
                    {spellLevels.map((level) => {
                      const id = `create-default-level-${level}`
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
                  <p className="label">{t('compendium.defaultSpellSchools')}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {spellSchools.map((school) => {
                      const id = `create-default-school-${school}`
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
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

export default function Index({
  items = [],
  pagination,
  perPageOptions = [25, 50, 100],
  sources,
  mundaneVariants,
  canManage = false,
  indexRoute = 'compendium.items.index',
}: {
  items: Item[]
  pagination?: PaginationMeta
  perPageOptions?: number[]
  sources: Source[]
  mundaneVariants: MundaneItemVariant[]
  canManage?: boolean
  indexRoute?: string
}) {
  const t = useTranslate()
  const rarityFilters: FilterOption[] = [
    { label: 'Common', value: 'common' },
    { label: 'Uncommon', value: 'uncommon' },
    { label: 'Rare', value: 'rare' },
    { label: 'Very Rare', value: 'very_rare' },
    { label: 'Legendary', value: 'legendary' },
    { label: 'Artifact', value: 'artifact' },
    { label: 'Unknown rarity', value: 'unknown_rarity' },
  ]

  const typeFilters: FilterOption[] = [
    { label: 'Weapon', value: 'weapon' },
    { label: 'Armor', value: 'armor' },
    { label: 'Item', value: 'item' },
    { label: 'Consumable', value: 'consumable' },
    { label: 'Spell Scroll', value: 'spellscroll' },
  ]

  const guildFilters: FilterOption[] = [
    { label: 'Allowed', value: 'allowed' },
    { label: 'Restricted', value: 'blocked' },
  ]

  const shopFilters: FilterOption[] = [
    { label: 'Included', value: 'included' },
    { label: 'Excluded', value: 'excluded' },
  ]

  const spellFilters: FilterOption[] = [
    { label: 'Auto-roll', value: 'attached' },
    { label: 'No auto-roll', value: 'none' },
  ]

  const rulingFilters: FilterOption[] = [
    { label: 'Changed', value: 'changed' },
    { label: 'Standard', value: 'none' },
  ]

  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const queryParamsWithoutLegacyInfo = Object.fromEntries(
    Object.entries(currentQueryParams).filter(([key]) => key !== 'info'),
  ) as Record<string, string | number | undefined>
  const selectedSource = String(currentQueryParams.source ?? '')
  const NAV_OPTIONS = { preserveState: true, preserveScroll: true }
  const rarityLabelMap = Object.fromEntries(rarityFilters.map((entry) => [entry.value, entry.label]))
  const typeLabelMap = Object.fromEntries(typeFilters.map((entry) => [entry.value, entry.label]))
  const guildLabelMap = Object.fromEntries(guildFilters.map((entry) => [entry.value, entry.label]))
  const shopLabelMap = Object.fromEntries(shopFilters.map((entry) => [entry.value, entry.label]))
  const spellLabelMap = Object.fromEntries(spellFilters.map((entry) => [entry.value, entry.label]))
  const rulingLabelMap = Object.fromEntries(rulingFilters.map((entry) => [entry.value, entry.label]))
  const sourceLabelMap = Object.fromEntries(
    sources.map((source) => [String(source.id), formatSourceOptionLabel(source, t)]),
  )

  const navigateTo = (href: string) => {
    router.get(href, {}, NAV_OPTIONS)
  }

  const renderFilterOptions = (filterKey: string, filters: FilterOption[]) => {
    const buildHref = (filterValue: string | null): string =>
      route(indexRoute, {
        ...queryParamsWithoutLegacyInfo,
        [filterKey]: filterValue,
        page: undefined,
      })

    return (
      <div className="filter">
        <input
          className="btn btn-xs filter-reset"
          type="radio"
          name={filterKey}
          aria-label="All"
          defaultChecked={!currentQueryParams[filterKey]}
          onClick={() => navigateTo(buildHref(null))}
        />
        {filters.map(({ label, value }) => (
          <input
            key={value}
            className="btn btn-xs"
            type="radio"
            name={filterKey}
            aria-label={label}
            defaultChecked={currentQueryParams[filterKey] === value}
            onClick={() => navigateTo(buildHref(value))}
          />
        ))}
      </div>
    )
  }

  const [search, setSearch] = useState(String(currentQueryParams.search ?? ''))

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    navigateTo(route(indexRoute, { ...queryParamsWithoutLegacyInfo, search: value, page: undefined }))
  }

  const handleSourceFilterChange = (value: string) => {
    navigateTo(route(indexRoute, {
      ...queryParamsWithoutLegacyInfo,
      source: value || null,
      page: undefined,
    }))
  }

  const navigateToPage = (page: number, perPage: number) => {
    navigateTo(route(indexRoute, {
      ...queryParamsWithoutLegacyInfo,
      page,
      per_page: perPage,
    }))
  }

  const activeFilters = [
    search ? `Search: ${search}` : null,
    currentQueryParams.rarity
      ? `Rarity: ${rarityLabelMap[String(currentQueryParams.rarity)] ?? currentQueryParams.rarity}`
      : null,
    currentQueryParams.type
      ? `Type: ${typeLabelMap[String(currentQueryParams.type)] ?? currentQueryParams.type}`
      : null,
    currentQueryParams.guild
      ? `Guild: ${guildLabelMap[String(currentQueryParams.guild)] ?? currentQueryParams.guild}`
      : null,
    currentQueryParams.shop
      ? `Shop: ${shopLabelMap[String(currentQueryParams.shop)] ?? currentQueryParams.shop}`
      : null,
    currentQueryParams.spell
      ? `Auto-roll: ${spellLabelMap[String(currentQueryParams.spell)] ?? currentQueryParams.spell}`
      : null,
    currentQueryParams.source
      ? `Source: ${String(currentQueryParams.source) === 'none'
        ? 'No source'
        : (sourceLabelMap[String(currentQueryParams.source)] ?? currentQueryParams.source)}`
      : null,
    currentQueryParams.ruling
      ? `Ruling: ${rulingLabelMap[String(currentQueryParams.ruling)] ?? currentQueryParams.ruling}`
      : null,
  ].filter(Boolean) as string[]
  const totalItems = pagination?.total ?? items.length
  const pageItems = items.length
  return (
    <AppLayout>
      <Head title={t('compendium.itemsTitle')} />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{t('compendium.itemsTitle')}</h1>
            <p className="text-sm text-base-content/70">
              {canManage
                ? t('compendium.browseInventory')
                : t('compendium.browseCompendiumItems')}
            </p>
            <p className="text-xs text-base-content/60">
              {totalItems} items
              {pagination?.lastPage && pagination.lastPage > 1 ? ` · Page ${pagination.currentPage}/${pagination.lastPage}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? <StoreItemModal sources={sources} mundaneVariants={mundaneVariants} /> : null}
          </div>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4 space-y-3">
          <Input type="search" placeholder={t('compendium.searchByName')} value={search} onChange={handleSearch}>
            {t('common.search')}
          </Input>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base-content/60">{t('compendium.source')}:</span>
              <select
                className="select select-xs w-56"
                value={selectedSource}
                onChange={(event) => handleSourceFilterChange(event.target.value)}
              >
                <option value="">{t('compendium.all')}</option>
                <option value="none">{t('compendium.noSource')}</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {formatSourceOptionLabel(source, t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.rarity')}:</span>
              {renderFilterOptions('rarity', rarityFilters)}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('characters.type')}:</span>
              {renderFilterOptions('type', typeFilters)}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.guild')}:</span>
              {renderFilterOptions('guild', guildFilters)}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.shop')}:</span>
              {renderFilterOptions('shop', shopFilters)}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.autoRoll')}:</span>
              {renderFilterOptions('spell', spellFilters)}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.ruling')}:</span>
              {renderFilterOptions('ruling', rulingFilters)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/50">
            <span>{pageItems} of {totalItems} on this page</span>
            {activeFilters.map((filter) => (
              <span key={filter} className="rounded-full border border-base-200 px-2 py-1 text-base-content/60">
                {filter}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-base-content/60">Page size:</span>
            <div className="flex flex-wrap items-center gap-1">
              {perPageOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn('btn btn-xs', pagination?.perPage === option ? 'btn-primary' : 'btn-ghost')}
                  onClick={() => navigateToPage(1, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Deferred
          fallback={
            <List>
              <ListRow>
                <LoaderCircle className="animate-spin" /> {t('compendium.loading')}
              </ListRow>
            </List>
          }
          data={['items', 'pagination']}
        >
          <>
            <List>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  sources={sources}
                  canManage={canManage}
                  mundaneVariants={mundaneVariants}
                />
              ))}
            </List>
            {pagination && pagination.lastPage > 1 ? (
              <div className="flex flex-wrap items-center justify-end gap-1 border-t border-base-200/80 pt-3">
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => navigateToPage(pagination.currentPage - 1, pagination.perPage)}
                >
                  Previous
                </button>
                <span className="px-1 text-[11px] text-base-content/60">
                  Page {pagination.currentPage} / {pagination.lastPage}
                </span>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  disabled={!pagination.hasMorePages}
                  onClick={() => navigateToPage(pagination.currentPage + 1, pagination.perPage)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        </Deferred>
      </div>
    </AppLayout>
  )
}

