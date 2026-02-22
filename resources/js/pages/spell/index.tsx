import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import AppLayout from '@/layouts/app-layout'
import SpellRow from '@/pages/spell/spell-row'
import { Source, Spell } from '@/types'
import { Deferred, Head, router, useForm } from '@inertiajs/react'
import { LoaderCircle, Plus, Scale, Shield } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface FilterOption {
  label: string
  value: string
}

const StoreSpellModal = ({ sources }: { sources: Source[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    url: '',
    legacy_url: '',
    spell_school: 'abjuration',
    spell_level: 0,
    source_id: '' as number | '',
    guild_enabled: true,
    ruling_changed: false,
    ruling_note: '',
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('guild_enabled', true)
    setData('spell_school', 'abjuration')
    setData('spell_level', 0)
    setData('source_id', '')
    setData('ruling_changed', false)
    setData('ruling_note', '')
  }, [isOpen, reset, setData])

  const handleRulingToggle = (enabled: boolean) => {
    setData('ruling_changed', enabled)
    if (!enabled) {
      setData('ruling_note', '')
    }
  }

  const handleSubmit = () => {
    post(route('admin.spells.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        reset()
        router.reload({ only: ['spells'] })
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus size={14} /> Add spell
        </Button>
      </ModalTrigger>
      <ModalTitle>Add spell</ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Basic</p>
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
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Options</p>
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
                <Scale className={data.ruling_changed ? 'h-4 w-4 text-warning' : 'h-4 w-4 text-base-content/70'} />
                Ruling changed
              </span>
            </label>
            {data.ruling_changed ? (
              <TextArea value={data.ruling_note} onChange={(e) => setData('ruling_note', e.target.value)} placeholder="Describe the ruling change...">
                Ruling note
              </TextArea>
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
  spells,
  sources,
  canManage = false,
  indexRoute = 'compendium.spells.index',
}: {
  spells: Spell[]
  sources: Source[]
  canManage?: boolean
  indexRoute?: string
}) {
  const spellSchoolFilters: FilterOption[] = [
    { label: 'Abjuration', value: 'abjuration' },
    { label: 'Conjuration', value: 'conjuration' },
    { label: 'Divination', value: 'divination' },
    { label: 'Enchantment', value: 'enchantment' },
    { label: 'Evocation', value: 'evocation' },
    { label: 'Illusion', value: 'illusion' },
    { label: 'Necromancy', value: 'necromancy' },
    { label: 'Transmutation', value: 'transmutation' },
  ]

  const spellLevelFilters: FilterOption[] = [
    { label: 'Cantrip', value: '0' },
    ...Array.from({ length: 9 }, (_, i) => ({
      label: (i + 1).toString(),
      value: (i + 1).toString(),
    })),
  ]

  const guildFilters: FilterOption[] = [
    { label: 'Allowed', value: 'allowed' },
    { label: 'Restricted', value: 'blocked' },
  ]

  const rulingFilters: FilterOption[] = [
    { label: 'Changed', value: 'changed' },
    { label: 'Standard', value: 'none' },
  ]

  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const queryParamsWithoutLegacyInfo = Object.fromEntries(
    Object.entries(currentQueryParams).filter(([key]) => key !== 'info'),
  ) as Record<string, string | number | undefined>
  const NAV_OPTIONS = { preserveState: true, preserveScroll: true }
  const schoolLabelMap = Object.fromEntries(spellSchoolFilters.map((entry) => [entry.value, entry.label]))
  const levelLabelMap = Object.fromEntries(spellLevelFilters.map((entry) => [entry.value, entry.label]))
  const guildLabelMap = Object.fromEntries(guildFilters.map((entry) => [entry.value, entry.label]))
  const rulingLabelMap = Object.fromEntries(rulingFilters.map((entry) => [entry.value, entry.label]))

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

  const activeFilters = [
    search ? `Search: ${search}` : null,
    currentQueryParams.spell_school
      ? `School: ${schoolLabelMap[String(currentQueryParams.spell_school)] ?? currentQueryParams.spell_school}`
      : null,
    currentQueryParams.spell_level
      ? `Level: ${levelLabelMap[String(currentQueryParams.spell_level)] ?? currentQueryParams.spell_level}`
      : null,
    currentQueryParams.guild
      ? `Guild: ${guildLabelMap[String(currentQueryParams.guild)] ?? currentQueryParams.guild}`
      : null,
    currentQueryParams.ruling
      ? `Ruling: ${rulingLabelMap[String(currentQueryParams.ruling)] ?? currentQueryParams.ruling}`
      : null,
  ].filter(Boolean) as string[]
  const totalSpells = spells?.length ?? 0
  return (
    <AppLayout>
      <Head title="Spells" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Spells</h1>
            <p className="text-sm text-base-content/70">
              {canManage
                ? 'Search the spell list by school or level.'
                : 'Browse the compendium and suggest spell updates for review.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? <StoreSpellModal sources={sources} /> : null}
          </div>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase text-base-content/50">Filters</p>
              <h2 className="text-lg font-semibold">Spell filters</h2>
              <p className="text-xs text-base-content/70">Narrow down by status, school, or level.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
              <span className="rounded-full border border-base-200 px-2 py-1">{totalSpells} spells</span>
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
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">School:</span>
                {renderFilterOptions('spell_school', spellSchoolFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Level:</span>
                {renderFilterOptions('spell_level', spellLevelFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Guild:</span>
                {renderFilterOptions('guild', guildFilters)}
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
          data={['spells']}
        >
          <List>{spells?.map((spell) => <SpellRow key={spell.id} spell={spell} sources={sources} canManage={canManage} />)}</List>
        </Deferred>
      </div>
    </AppLayout>
  )
}
