import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import ItemRow from '@/pages/item/item-row'
import { Item, Source } from '@/types'
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

const StoreItemModal = ({ sources }: { sources: Source[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    url: '',
    cost: '',
    rarity: 'common',
    type: 'item',
    source_id: '' as number | '',
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
          <Plus size={14} /> Add item
        </Button>
      </ModalTrigger>
      <ModalTitle>Add item</ModalTitle>
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
            <Input errors={errors.cost} placeholder="1000 GP" value={data.cost} onChange={(e) => setData('cost', e.target.value)}>
              Cost
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
                    {source.shortcode} - {source.name}
                  </option>
                ))}
              </SelectOptions>
            </Select>
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
                  <p className="label">Default spell schools</p>
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
        Save
      </ModalAction>
    </Modal>
  )
}

export default function Index({
  items,
  sources,
  canManage = false,
  indexRoute = 'compendium.items.index',
}: {
  items: Item[]
  sources: Source[]
  canManage?: boolean
  indexRoute?: string
}) {
  const rarityFilters: FilterOption[] = [
    { label: 'Common', value: 'common' },
    { label: 'Uncommon', value: 'uncommon' },
    { label: 'Rare', value: 'rare' },
    { label: 'Very Rare', value: 'very_rare' },
  ]

  const typeFilters: FilterOption[] = [
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
    sources.map((source) => [String(source.id), `${source.shortcode} - ${source.name}`]),
  )

  const navigateTo = (href: string) => {
    router.get(href, {}, NAV_OPTIONS)
  }

  const renderFilterOptions = (filterKey: string, filters: FilterOption[]) => {
    const buildHref = (filterValue: string | null): string =>
      route(indexRoute, {
        ...queryParamsWithoutLegacyInfo,
        [filterKey]: filterValue,
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
    navigateTo(route(indexRoute, { ...queryParamsWithoutLegacyInfo, search: value }))
  }

  const handleSourceFilterChange = (value: string) => {
    navigateTo(route(indexRoute, {
      ...queryParamsWithoutLegacyInfo,
      source: value || null,
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
  const totalItems = items?.length ?? 0
  return (
    <AppLayout>
      <Head title="Items" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Items</h1>
            <p className="text-sm text-base-content/70">
              {canManage
                ? 'Browse and filter the guild inventory.'
                : 'Browse the compendium and suggest improvements for review.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? <StoreItemModal sources={sources} /> : null}
          </div>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase text-base-content/50">Filters</p>
              <h2 className="text-lg font-semibold">Inventory filters</h2>
              <p className="text-xs text-base-content/70">Refine the list by status, source, rarity, and rulings.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
              <span className="rounded-full border border-base-200 px-2 py-1">{totalItems} items</span>
              {activeFilters.length === 0 ? (
                <span className="text-base-content/50">No filters</span>
              ) : (
                activeFilters.map((filter) => (
                  <span key={filter} className="rounded-full border border-base-200 px-2 py-1">
                    {filter}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="mt-3">
            <Input type="search" placeholder="Search by name..." value={search} onChange={handleSearch}>
              Search
            </Input>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base-content/60">Source:</span>
                <select
                  className="select select-xs w-56"
                  value={selectedSource}
                  onChange={(event) => handleSourceFilterChange(event.target.value)}
                >
                  <option value="">All</option>
                  <option value="none">No source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.shortcode} - {source.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Rarity:</span>
                {renderFilterOptions('rarity', rarityFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Type:</span>
                {renderFilterOptions('type', typeFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Guild:</span>
                {renderFilterOptions('guild', guildFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Shop:</span>
                {renderFilterOptions('shop', shopFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Auto-roll:</span>
                {renderFilterOptions('spell', spellFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Ruling:</span>
                {renderFilterOptions('ruling', rulingFilters)}
              </div>
            </div>
          </div>
        </div>
        <Deferred
          fallback={
            <List>
              <ListRow>
                <LoaderCircle className="animate-spin" /> Loading...
              </ListRow>
            </List>
          }
          data={['items']}
        >
          <List>{items?.map((item) => <ItemRow key={item.id} item={item} sources={sources} canManage={canManage} />)}</List>
        </Deferred>
      </div>
    </AppLayout>
  )
}
