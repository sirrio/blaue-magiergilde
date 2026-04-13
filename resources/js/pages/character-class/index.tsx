import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { formatSourceOptionLabel, formatSourceKindShortLabel, sourceKindBadgeClass } from '@/helper/sourceDisplay'
import { cn } from '@/lib/utils'
import AppLayout from '@/layouts/app-layout'
import { useTranslate } from '@/lib/i18n'
import { CharacterClass, Source } from '@/types'
import { Deferred, Head, router, useForm } from '@inertiajs/react'
import { BookMarked, BookOpen, LoaderCircle, Pencil, Plus, Shield, Trash } from 'lucide-react'
import React, { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Inline types (will be kept in sync with types/index.d.ts)
// ---------------------------------------------------------------------------

interface CharacterSubclass {
  id: number
  character_class_id: number
  name: string
  source_id?: number | null
  source?: Source | null
  guild_enabled: boolean
}

interface CharacterClassExtended extends CharacterClass {
  source_id?: number | null
  source?: Source | null
  guild_enabled: boolean
  subclasses?: CharacterSubclass[]
}

interface FilterOption {
  label: string
  value: string
}

// ---------------------------------------------------------------------------
// StoreCharacterClassModal
// ---------------------------------------------------------------------------

const StoreCharacterClassModal = ({ sources, onSuccess }: { sources: Source[]; onSuccess: () => void }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    source_id: '' as number | '',
    guild_enabled: true,
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('guild_enabled', true)
    setData('source_id', '')
  }, [isOpen, reset, setData])

  const handleSubmit = () => {
    post(route('admin.character-classes.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        reset()
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus size={14} /> {t('compendium.addClass')}
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.addClass')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <Input errors={errors.name} placeholder="Fighter" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            {t('compendium.className')}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={data.guild_enabled}
              onChange={(e) => setData('guild_enabled', e.target.checked)}
            />
            {t('compendium.allowedInGuild')}
          </label>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// UpdateCharacterClassModal
// ---------------------------------------------------------------------------

const UpdateCharacterClassModal = ({
  characterClass,
  sources,
  onSuccess,
}: {
  characterClass: CharacterClassExtended
  sources: Source[]
  onSuccess: () => void
}) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: characterClass.name,
    source_id: (characterClass.source_id ?? '') as number | '',
    guild_enabled: characterClass.guild_enabled ?? false,
    _method: 'put',
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('name', characterClass.name)
    setData('source_id', characterClass.source_id ?? '')
    setData('guild_enabled', characterClass.guild_enabled ?? false)
  }, [isOpen, reset, characterClass, setData])

  const handleSubmit = () => {
    post(route('admin.character-classes.update', { character_class: characterClass.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)} aria-label={t('common.edit')}>
          <Pencil size={13} />
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.editClass')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <Input errors={errors.name} placeholder="Fighter" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            {t('compendium.className')}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={data.guild_enabled}
              onChange={(e) => setData('guild_enabled', e.target.checked)}
            />
            {t('compendium.allowedInGuild')}
          </label>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// DestroyCharacterClassModal
// ---------------------------------------------------------------------------

const DestroyCharacterClassModal = ({
  characterClass,
  onSuccess,
}: {
  characterClass: CharacterClassExtended
  onSuccess: () => void
}) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { post, processing } = useForm({})

  const handleSubmit = () => {
    post(route('admin.character-classes.destroy', { character_class: characterClass.id, _method: 'delete' }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" color="error" onClick={() => setIsOpen(true)} aria-label={t('common.delete')}>
          <Trash size={13} />
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.deleteClass')}</ModalTitle>
      <ModalContent>
        <p>{t('compendium.deleteClassConfirm', { name: characterClass.name })}</p>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing} color="error">
        {t('common.delete')}
      </ModalAction>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// StoreCharacterSubclassModal
// ---------------------------------------------------------------------------

const StoreCharacterSubclassModal = ({
  characterClass,
  sources,
  onSuccess,
}: {
  characterClass: CharacterClassExtended
  sources: Source[]
  onSuccess: () => void
}) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    source_id: '' as number | '',
    guild_enabled: true,
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('source_id', '')
    setData('guild_enabled', true)
  }, [isOpen, reset, setData])

  const handleSubmit = () => {
    post(route('admin.character-subclasses.store', { character_class: characterClass.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        reset()
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setIsOpen(true)}
          aria-label={t('compendium.addSubclass')}
        >
          <Plus size={13} /> {t('compendium.addSubclass')}
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.addSubclass')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <Input errors={errors.name} placeholder="Battle Master" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            {t('compendium.className')}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={data.guild_enabled}
              onChange={(e) => setData('guild_enabled', e.target.checked)}
            />
            {t('compendium.allowedInGuild')}
          </label>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// UpdateCharacterSubclassModal
// ---------------------------------------------------------------------------

const UpdateCharacterSubclassModal = ({
  characterClass,
  subclass,
  sources,
  onSuccess,
}: {
  characterClass: CharacterClassExtended
  subclass: CharacterSubclass
  sources: Source[]
  onSuccess: () => void
}) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: subclass.name,
    source_id: (subclass.source_id ?? '') as number | '',
    guild_enabled: subclass.guild_enabled ?? true,
    _method: 'put',
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('name', subclass.name)
    setData('source_id', subclass.source_id ?? '')
    setData('guild_enabled', subclass.guild_enabled ?? true)
  }, [isOpen, reset, subclass, setData])

  const handleSubmit = () => {
    post(route('admin.character-subclasses.update', { character_class: characterClass.id, subclass: subclass.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)} aria-label={t('common.edit')}>
          <Pencil size={13} />
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.editSubclass')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <Input errors={errors.name} placeholder="Battle Master" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            {t('compendium.className')}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={data.guild_enabled}
              onChange={(e) => setData('guild_enabled', e.target.checked)}
            />
            {t('compendium.allowedInGuild')}
          </label>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// DestroyCharacterSubclassModal
// ---------------------------------------------------------------------------

const DestroyCharacterSubclassModal = ({
  characterClass,
  subclass,
  onSuccess,
}: {
  characterClass: CharacterClassExtended
  subclass: CharacterSubclass
  onSuccess: () => void
}) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { post, processing } = useForm({})

  const handleSubmit = () => {
    post(route('admin.character-subclasses.destroy', { character_class: characterClass.id, subclass: subclass.id, _method: 'delete' }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" color="error" onClick={() => setIsOpen(true)} aria-label={t('common.delete')}>
          <Trash size={13} />
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.deleteSubclass')}</ModalTitle>
      <ModalContent>
        <p>{t('compendium.deleteSubclassConfirm', { name: subclass.name })}</p>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing} color="error">
        {t('common.delete')}
      </ModalAction>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// GuildIndicator — reusable shield with strikethrough when disabled
// ---------------------------------------------------------------------------

const GuildIndicator = ({ enabled, size = 14 }: { enabled: boolean; size?: number }) =>
  enabled ? (
    <Shield size={size} className="text-success" aria-label="Allowed in guild" />
  ) : (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      title="Not allowed in guild"
      aria-label="Not allowed in guild"
    >
      <Shield size={size} className="text-base-content/35" />
      <span className="absolute h-px w-[140%] rotate-45 bg-error/70" />
    </span>
  )

// ---------------------------------------------------------------------------
// ClassRow — class as header row + subclasses as regular rows below
// ---------------------------------------------------------------------------

const ClassRow = ({
  characterClass,
  sources,
  canManage,
  onSuccess,
  showSubclasses = true,
  showClassRow = true,
}: {
  characterClass: CharacterClassExtended
  sources: Source[]
  canManage: boolean
  onSuccess: () => void
  showSubclasses?: boolean
  showClassRow?: boolean
}) => {
  const t = useTranslate()
  const subclasses = characterClass.subclasses ?? []

  return (
    <>
      {/* Class row — styled as a section header */}
      {showClassRow ? (
        <ListRow className="bg-base-200/50">
          <div className="flex w-5 shrink-0 items-center justify-center">
            <BookOpen size={14} className="text-base-content/50" />
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{characterClass.name}</span>
            {characterClass.source ? (
              <>
                <span className="rounded-full border border-base-300 px-2 py-0.5 text-[9px] uppercase text-base-content/70">
                  {characterClass.source.shortcode}
                </span>
                <span className={cn('rounded-full border px-2 py-0.5 text-[9px] uppercase', sourceKindBadgeClass(characterClass.source.kind))}>
                  {formatSourceKindShortLabel(characterClass.source.kind, t)}
                </span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {canManage ? <StoreCharacterSubclassModal characterClass={characterClass} sources={sources} onSuccess={onSuccess} /> : null}
            <GuildIndicator enabled={characterClass.guild_enabled} />
            {canManage ? (
              <>
                <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
                <UpdateCharacterClassModal characterClass={characterClass} sources={sources} onSuccess={onSuccess} />
                <DestroyCharacterClassModal characterClass={characterClass} onSuccess={onSuccess} />
              </>
            ) : null}
          </div>
        </ListRow>
      ) : null}

      {/* Subclass rows — identical structure, normal row styling */}
      {showSubclasses
        ? subclasses.map((sub) => (
            <ListRow key={sub.id}>
              <div className="flex w-5 shrink-0 items-center justify-center">
                <BookMarked size={13} className="text-base-content/40" />
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm text-base-content/80">{sub.name}</span>
                <span className="rounded-full border border-base-300 bg-base-200/60 px-2 py-0.5 text-[9px] uppercase text-base-content/55">
                  {characterClass.name}
                </span>
                {sub.source ? (
                  <>
                    <span className="rounded-full border border-base-300 px-2 py-0.5 text-[9px] uppercase text-base-content/60">
                      {sub.source.shortcode}
                    </span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[9px] uppercase', sourceKindBadgeClass(sub.source.kind))}>
                      {formatSourceKindShortLabel(sub.source.kind, t)}
                    </span>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <GuildIndicator enabled={sub.guild_enabled} size={13} />
                {canManage ? (
                  <>
                    <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
                    <UpdateCharacterSubclassModal
                      characterClass={characterClass}
                      subclass={sub}
                      sources={sources}
                      onSuccess={onSuccess}
                    />
                    <DestroyCharacterSubclassModal
                      characterClass={characterClass}
                      subclass={sub}
                      onSuccess={onSuccess}
                    />
                  </>
                ) : null}
              </div>
            </ListRow>
          ))
        : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Index page
// ---------------------------------------------------------------------------

export default function Index({
  characterClasses,
  sources,
  canManage = false,
}: {
  characterClasses: CharacterClass[]
  sources: Source[]
  canManage?: boolean
}) {
  const t = useTranslate()

  const guildFilters: FilterOption[] = [
    { label: 'Allowed', value: 'allowed' },
    { label: 'Blocked', value: 'blocked' },
  ]

  const typeFilters: FilterOption[] = [
    { label: t('compendium.classesOnly'), value: 'classes' },
    { label: t('compendium.subclassesOnly'), value: 'subclasses' },
  ]

  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const NAV_OPTIONS = { preserveState: true, preserveScroll: true }
  const typeFilter = String(currentQueryParams.type ?? '')
  const classFilter = String(currentQueryParams.class ?? '')

  const navigateTo = (href: string) => {
    router.get(href, {}, NAV_OPTIONS)
  }

  const renderFilterOptions = (filterKey: string, filters: FilterOption[]) => {
    const buildHref = (filterValue: string | null): string =>
      route('admin.character-classes.index', {
        ...currentQueryParams,
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
    navigateTo(
      route('admin.character-classes.index', { ...currentQueryParams, search: value }),
    )
  }

  const reload = () => router.reload({ only: ['characterClasses'] })

  const allClasses = (characterClasses as CharacterClassExtended[]) ?? []
  const visibleClasses = classFilter ? allClasses.filter((cc) => cc.name === classFilter) : allClasses
  const totalClasses = visibleClasses.length
  const totalSubclasses = visibleClasses.reduce((sum, cc) => sum + (cc.subclasses?.length ?? 0), 0)
  const countLabel =
    typeFilter === 'classes'
      ? `${totalClasses} ${t('compendium.classesCount')}`
      : typeFilter === 'subclasses'
        ? `${totalSubclasses} ${t('compendium.subclasses')}`
        : `${totalClasses} ${t('compendium.classesCount')}, ${totalSubclasses} ${t('compendium.subclasses')}`

  return (
    <AppLayout>
      <Head title={t('compendium.classesTitle')} />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{t('compendium.classesTitle')}</h1>
            <p className="text-sm text-base-content/70">{t('compendium.classesDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? <StoreCharacterClassModal sources={sources} onSuccess={reload} /> : null}
          </div>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4 space-y-3">
          <Input type="search" placeholder={t('compendium.searchByName')} value={search} onChange={handleSearch}>
            {t('common.search')}
          </Input>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.type')}:</span>
              {renderFilterOptions('type', typeFilters)}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.guild')}:</span>
              {renderFilterOptions('guild', guildFilters)}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">{t('compendium.classesCount')}:</span>
              <select
                className="select select-xs"
                value={classFilter}
                onChange={(e) =>
                  navigateTo(
                    route('admin.character-classes.index', {
                      ...currentQueryParams,
                      class: e.target.value || null,
                    }),
                  )
                }
              >
                <option value="">All</option>
                {allClasses.map((cc) => (
                  <option key={cc.id} value={cc.name}>
                    {cc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-base-content/50">{countLabel}</p>
        </div>
        <Deferred
          fallback={
            <List>
              <ListRow>
                <LoaderCircle className="animate-spin" /> {t('compendium.loading')}
              </ListRow>
            </List>
          }
          data={['characterClasses']}
        >
          <List>
            {visibleClasses.map((cc) => (
              <ClassRow
                key={cc.id}
                characterClass={cc}
                sources={sources}
                canManage={canManage}
                onSuccess={reload}
                showSubclasses={typeFilter !== 'classes'}
                showClassRow={typeFilter !== 'subclasses'}
              />
            ))}
          </List>
        </Deferred>
      </div>
    </AppLayout>
  )
}
