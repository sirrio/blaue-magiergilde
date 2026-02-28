import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import AppLayout from '@/layouts/app-layout'
import { router, useForm } from '@inertiajs/react'
import { format } from 'date-fns'
import { ArrowRight, Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

type SuggestionKind = 'item' | 'spell'
type SuggestionStatus = 'pending' | 'approved' | 'rejected'

interface SuggestionUser {
  id: number
  name: string
}

interface CompendiumSuggestionRecord {
  id: number
  kind: SuggestionKind
  target_id: number | null
  target_name?: string | null
  status: SuggestionStatus
  proposed_payload: Record<string, unknown>
  current_snapshot: Record<string, unknown>
  notes?: string | null
  source_url?: string | null
  review_notes?: string | null
  reviewed_at?: string | null
  created_at?: string | null
  user?: SuggestionUser | null
  reviewer?: SuggestionUser | null
}

interface SuggestionFilters {
  status?: string
  kind?: string
  search?: string
}

interface VariantMetaRecord {
  id: number
  name: string
  category: string
  is_placeholder: boolean
}

const fieldLabels: Record<string, string> = {
  name: 'Name',
  url: 'URL',
  legacy_url: 'Legacy URL',
  extra_cost_note: 'Extra cost note',
  rarity: 'Rarity',
  type: 'Type',
  source_id: 'Source',
  mundane_variant_ids: 'Mundane variants',
  spell_school: 'School',
  spell_level: 'Level',
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'none'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'none'
  return String(value)
}

const formatFieldValue = (
  field: string,
  value: unknown,
  sourceLabels: Record<string, string>,
  variantLabels: Record<string, string>,
): string => {
  if (field === 'source_id') {
    if (value === null || value === undefined || value === '') {
      return 'none'
    }

    const sourceKey = String(value)
    return sourceLabels[sourceKey] ?? sourceKey
  }

  if (field === 'mundane_variant_ids') {
    if (!Array.isArray(value) || value.length === 0) {
      return 'none'
    }

    return value
      .map((entry) => {
        const key = String(entry)
        return variantLabels[key] ?? `#${key}`
      })
      .join(', ')
  }

  return formatValue(value)
}

const categorizeVariantIds = (
  value: unknown,
  variantMeta: Record<string, VariantMetaRecord>,
): Record<string, VariantMetaRecord[]> => {
  const ids = Array.isArray(value) ? value : []
  const grouped: Record<string, VariantMetaRecord[]> = {}

  ids.forEach((entry) => {
    const key = String(entry)
    const meta = variantMeta[key]
    if (!meta) {
      return
    }

    const bucket = meta.is_placeholder ? 'any' : meta.category || 'other'
    grouped[bucket] = [...(grouped[bucket] ?? []), meta]
  })

  return grouped
}

const VariantChips = ({
  value,
  variantMeta,
}: {
  value: unknown
  variantMeta: Record<string, VariantMetaRecord>
}) => {
  const grouped = categorizeVariantIds(value, variantMeta)
  const sections = [
    { key: 'any', label: 'Any' },
    { key: 'weapon', label: 'Weapon' },
    { key: 'armor', label: 'Armor' },
    { key: 'other', label: 'Other' },
  ].filter((section) => (grouped[section.key] ?? []).length > 0)

  if (sections.length === 0) {
    return <span className="text-base-content/60">none</span>
  }

  return (
    <div className="space-y-1.5">
      {sections.map((section) => (
        <div key={section.key} className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">{section.label}</span>
          {(grouped[section.key] ?? []).map((variant) => (
            <span
              key={`${section.key}-${variant.id}`}
              className="rounded-full border border-base-300 bg-base-100 px-2 py-1 text-[11px] leading-none"
            >
              {variant.name}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

const DiffValue = ({
  field,
  value,
  sourceLabels,
  variantLabels,
  variantMeta,
}: {
  field: string
  value: unknown
  sourceLabels: Record<string, string>
  variantLabels: Record<string, string>
  variantMeta: Record<string, VariantMetaRecord>
}) => {
  if (field === 'mundane_variant_ids') {
    return <VariantChips value={value} variantMeta={variantMeta} />
  }

  if (field === 'source_id') {
    const text = formatFieldValue(field, value, sourceLabels, variantLabels)
    return <span className="rounded-full border border-base-300 bg-base-100 px-2 py-1 text-[11px] leading-none">{text}</span>
  }

  return <span>{formatFieldValue(field, value, sourceLabels, variantLabels)}</span>
}

const VariantDiffSummary = ({
  currentValue,
  nextValue,
  variantMeta,
}: {
  currentValue: unknown
  nextValue: unknown
  variantMeta: Record<string, VariantMetaRecord>
}) => {
  const currentIds = new Set((Array.isArray(currentValue) ? currentValue : []).map((entry) => Number(entry)))
  const nextIds = new Set((Array.isArray(nextValue) ? nextValue : []).map((entry) => Number(entry)))

  const added = [...nextIds].filter((id) => !currentIds.has(id))
  const removed = [...currentIds].filter((id) => !nextIds.has(id))

  if (added.length === 0 && removed.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      {added.length > 0 ? (
        <span className="rounded-full border border-success/30 bg-success/10 px-2 py-1 text-success">
          Added: {added.map((id) => variantMeta[String(id)]?.name ?? `#${id}`).join(', ')}
        </span>
      ) : null}
      {removed.length > 0 ? (
        <span className="rounded-full border border-error/30 bg-error/10 px-2 py-1 text-error">
          Removed: {removed.map((id) => variantMeta[String(id)]?.name ?? `#${id}`).join(', ')}
        </span>
      ) : null}
    </div>
  )
}

const statusClass: Record<SuggestionStatus, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-error',
}

const kindLabel: Record<SuggestionKind, string> = {
  item: 'Item',
  spell: 'Spell',
}

const ReviewSuggestionModal = ({
  suggestion,
  action,
}: {
  suggestion: CompendiumSuggestionRecord
  action: 'approve' | 'reject'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, patch, processing, reset } = useForm({
    review_notes: '',
  })

  const isApprove = action === 'approve'
  const routeName = isApprove ? 'admin.compendium-suggestions.approve' : 'admin.compendium-suggestions.reject'

  const handleSubmit = () => {
    patch(route(routeName, { compendiumSuggestion: suggestion.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        reset()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="xs"
          variant="outline"
          color={isApprove ? 'success' : 'error'}
          onClick={() => setIsOpen(true)}
          className="gap-1"
        >
          {isApprove ? <Check size={14} /> : <X size={14} />}
          {isApprove ? 'Approve' : 'Reject'}
        </Button>
      </ModalTrigger>
      <ModalTitle>{isApprove ? 'Approve suggestion' : 'Reject suggestion'}</ModalTitle>
      <ModalContent>
        <TextArea value={data.review_notes} onChange={(event) => setData('review_notes', event.target.value)}>
          Review note (optional)
        </TextArea>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {isApprove ? 'Approve' : 'Reject'}
      </ModalAction>
    </Modal>
  )
}

export default function CompendiumSuggestionsPage({
  suggestions,
  filters,
  counts,
  sourceLabels = {},
  variantLabels = {},
  variantMeta = {},
}: {
  suggestions: CompendiumSuggestionRecord[]
  filters: SuggestionFilters
  counts: Record<string, number>
  sourceLabels?: Record<string, string>
  variantLabels?: Record<string, string>
  variantMeta?: Record<string, VariantMetaRecord>
}) {
  const currentParams = route().params as Record<string, string | number | undefined>
  const [search, setSearch] = useState(String(filters.search ?? ''))

  const navigate = (next: Record<string, string | null>) => {
    const merged = { ...currentParams, ...next }
    const cleaned = Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== null && value !== ''))
    router.get(route('admin.compendium-suggestions.index', cleaned), {}, { preserveScroll: true, preserveState: true })
  }

  const kindOptions = useMemo(
    () => [
      { value: '', label: 'All kinds' },
      { value: 'item', label: 'Items' },
      { value: 'spell', label: 'Spells' },
    ],
    [],
  )

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
    [],
  )

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl space-y-4 px-4 py-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Compendium Suggestions</h1>
            <p className="text-sm text-base-content/70">Review and apply community update proposals for items and spells.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="badge badge-warning">Pending: {counts.pending ?? 0}</span>
            <span className="badge badge-success">Approved: {counts.approved ?? 0}</span>
            <span className="badge badge-error">Rejected: {counts.rejected ?? 0}</span>
          </div>
        </section>

        <section className="rounded-box border border-base-200 bg-base-100 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-48">
              <label className="label">Kind</label>
              <select
                className="select select-sm w-full"
                value={String(filters.kind ?? '')}
                onChange={(event) => navigate({ kind: event.target.value || null })}
              >
                {kindOptions.map((option) => (
                  <option key={option.value || 'all-kinds'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="label">Status</label>
              <select
                className="select select-sm w-full"
                value={String(filters.status ?? '')}
                onChange={(event) => navigate({ status: event.target.value || null })}
              >
                {statusOptions.map((option) => (
                  <option key={option.value || 'all-status'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-64 flex-1">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by note, id, or target id">
                Search
              </Input>
            </div>
            <Button size="sm" onClick={() => navigate({ search: search.trim() || null })} className="gap-1">
              <Search size={14} />
              Apply
            </Button>
          </div>
        </section>

        <List>
          {suggestions.length === 0 ? (
            <ListRow>
              <span className="text-sm text-base-content/70">No suggestions found.</span>
            </ListRow>
          ) : (
            suggestions.map((suggestion) => {
              const changeEntries = Object.entries(suggestion.proposed_payload ?? {})
              const submittedAt = suggestion.created_at ? format(new Date(suggestion.created_at), "dd.MM.yyyy ' - ' HH:mm") : '-'
              const reviewedAt = suggestion.reviewed_at ? format(new Date(suggestion.reviewed_at), "dd.MM.yyyy ' - ' HH:mm") : null
              const hasCurrentSnapshot = suggestion.current_snapshot && Object.keys(suggestion.current_snapshot).length > 0
              const suggestionTargetLabel = suggestion.target_name
                ?? (suggestion.target_id ? `Deleted #${suggestion.target_id}` : `New ${kindLabel[suggestion.kind]} suggestion`)

              return (
                <ListRow key={suggestion.id}>
                  <div className="w-full space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${statusClass[suggestion.status]}`}>{suggestion.status}</span>
                        <span className="badge badge-outline">{kindLabel[suggestion.kind]}</span>
                        <span className="text-sm font-semibold">
                          #{suggestion.id} · {suggestionTargetLabel}
                        </span>
                      </div>
                      <div className="text-xs text-base-content/60">
                        by {suggestion.user?.name ?? 'Unknown'} · {submittedAt}
                      </div>
                    </div>

                    {changeEntries.length === 0 ? (
                      <div className="rounded-box border border-base-200 bg-base-200/30 p-2 text-xs text-base-content/70">
                        No direct field changes (note-only suggestion).
                      </div>
                    ) : (
                      <div className="rounded-box border border-base-200 bg-base-200/30 p-2">
                        <p className="mb-2 text-xs font-semibold uppercase text-base-content/60">Suggested changes</p>
                        <div className="space-y-1 text-xs">
                          {changeEntries.map(([field, value]) => (
                            <div key={field} className="space-y-1.5 rounded-lg border border-base-200/80 bg-base-100/70 p-2">
                              <span className="font-medium">{fieldLabels[field] ?? field}</span>
                              {hasCurrentSnapshot ? (
                                field === 'mundane_variant_ids' ? (
                                  <>
                                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start">
                                      <div className="space-y-1 rounded-lg border border-base-200 bg-base-100 p-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">Current</p>
                                        <DiffValue
                                          field={field}
                                          value={suggestion.current_snapshot?.[field]}
                                          sourceLabels={sourceLabels}
                                          variantLabels={variantLabels}
                                          variantMeta={variantMeta}
                                        />
                                      </div>
                                      <div className="hidden items-center justify-center text-base-content/40 md:flex">
                                        <ArrowRight size={14} />
                                      </div>
                                      <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">Suggested</p>
                                        <DiffValue
                                          field={field}
                                          value={value}
                                          sourceLabels={sourceLabels}
                                          variantLabels={variantLabels}
                                          variantMeta={variantMeta}
                                        />
                                      </div>
                                    </div>
                                    <VariantDiffSummary
                                      currentValue={suggestion.current_snapshot?.[field]}
                                      nextValue={value}
                                      variantMeta={variantMeta}
                                    />
                                  </>
                                ) : (
                                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
                                    <div className="rounded-lg border border-base-200 bg-base-100 p-2 text-base-content/70">
                                      <DiffValue
                                        field={field}
                                        value={suggestion.current_snapshot?.[field]}
                                        sourceLabels={sourceLabels}
                                        variantLabels={variantLabels}
                                        variantMeta={variantMeta}
                                      />
                                    </div>
                                    <div className="hidden items-center justify-center text-base-content/40 md:flex">
                                      <ArrowRight size={14} />
                                    </div>
                                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                                      <DiffValue
                                        field={field}
                                        value={value}
                                        sourceLabels={sourceLabels}
                                        variantLabels={variantLabels}
                                        variantMeta={variantMeta}
                                      />
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                                  <DiffValue
                                    field={field}
                                    value={value}
                                    sourceLabels={sourceLabels}
                                    variantLabels={variantLabels}
                                    variantMeta={variantMeta}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestion.notes ? (
                      <div className="rounded-box border border-info/30 bg-info/10 p-2 text-xs">
                        <p className="font-semibold text-info">Submitter note</p>
                        <p className="whitespace-pre-wrap">{suggestion.notes}</p>
                      </div>
                    ) : null}

                    {suggestion.source_url ? (
                      <div className="text-xs">
                        <a href={suggestion.source_url} target="_blank" rel="noreferrer" className="link link-primary">
                          Reference URL
                        </a>
                      </div>
                    ) : null}

                    {suggestion.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <ReviewSuggestionModal suggestion={suggestion} action="approve" />
                        <ReviewSuggestionModal suggestion={suggestion} action="reject" />
                      </div>
                    ) : (
                      <div className="text-xs text-base-content/70">
                        Reviewed by {suggestion.reviewer?.name ?? 'Unknown'}
                        {reviewedAt ? ` on ${reviewedAt}` : ''}
                        {suggestion.review_notes ? ` · ${suggestion.review_notes}` : ''}
                      </div>
                    )}
                  </div>
                </ListRow>
              )
            })
          )}
        </List>
      </div>
    </AppLayout>
  )
}
