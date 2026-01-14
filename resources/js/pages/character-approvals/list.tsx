import LogoTier from '@/components/logo-tier'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import AppLayout from '@/layouts/app-layout'
import { calculateTier } from '@/helper/calculateTier'
import { cn } from '@/lib/utils'
import { Character } from '@/types'
import { Head, router, useForm } from '@inertiajs/react'
import { Archive, CheckCircle2, Clock, ExternalLink, MapPin, MapPinOff, StickyNote, UserX, XCircle } from 'lucide-react'
import React, { useMemo, useState } from 'react'

interface FilterOption {
  label: string
  value: string
}

type AdminCharacter = Pick<
  Character,
  | 'id'
  | 'name'
  | 'start_tier'
  | 'external_link'
  | 'user_id'
  | 'guild_status'
  | 'user'
  | 'admin_notes'
  | 'notes'
  | 'adventures'
  | 'dm_bubbles'
  | 'bubble_shop_spend'
  | 'is_filler'
  | 'room_count'
>

type CharacterGroup = {
  key: string
  label: string
  discordId?: number | null
  characters: AdminCharacter[]
}

const getStatusLabel = (status?: string | null) => {
  if (status === 'approved') return 'approved'
  if (status === 'declined') return 'declined'
  if (status === 'retired') return 'retired'
  return 'pending'
}

const AdminNoteModal = ({ character }: { character: AdminCharacter }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, patch, processing } = useForm({
    admin_notes: character.admin_notes ?? '',
  })
  const hasAdminNote = Boolean(character.admin_notes?.trim())

  const handleSubmit = () => {
    patch(route('admin.character-approvals.update', { character: character.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
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
          onClick={() => {
            setData('admin_notes', character.admin_notes ?? '')
            setIsOpen(true)
          }}
          className={cn(hasAdminNote ? 'text-warning' : 'text-base-content/40')}
        >
          <StickyNote size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Admin Note</ModalTitle>
      <ModalContent>
        <TextArea
          value={data.admin_notes}
          onChange={(e) => setData('admin_notes', e.target.value)}
          placeholder="Internal note..."
        >
          Note
        </TextArea>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
    </Modal>
  )
}

const DeleteUserModal = ({
  userId,
  userLabel,
}: {
  userId: number
  userLabel: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, processing, delete: destroy, reset } = useForm({ confirm: '' })
  const canDelete = data.confirm.trim().toUpperCase() === 'DELETE'

  const handleClose = () => {
    setIsOpen(false)
    reset()
  }

  const handleDelete = () => {
    if (!canDelete) return
    destroy(route('admin.character-approvals.users.destroy', { user: userId }), {
      preserveScroll: true,
      onSuccess: () => {
        handleClose()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)}>
          <UserX size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Delete account</ModalTitle>
      <ModalContent>
        <p className="text-sm text-base-content/70">
          This will soft delete {userLabel} and all linked characters. Type DELETE to confirm.
        </p>
        <Input
          value={data.confirm}
          onChange={(event) => setData('confirm', event.target.value)}
          placeholder="Type DELETE to confirm"
        >
          Confirm
        </Input>
      </ModalContent>
      <ModalAction onClick={handleDelete} disabled={!canDelete || processing} variant="error">
        Delete account
      </ModalAction>
    </Modal>
  )
}

export default function CharacterApprovals({ characters }: { characters: AdminCharacter[] }) {
  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const navOptions = { preserveState: true, preserveScroll: true }
  const normalizedParams = {
    ...currentQueryParams,
    discord:
      currentQueryParams.discord ??
      (currentQueryParams.no_discord === '1' ? 'none' : undefined),
  }

  const navigateTo = (href: string) => {
    router.get(href, {}, navOptions)
  }

  const [search, setSearch] = useState(String(currentQueryParams.search ?? ''))

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    navigateTo(
      route('admin.character-approvals.index', {
        ...normalizedParams,
        search: value || undefined,
        no_discord: undefined,
      }),
    )
  }

  const statusFilters: FilterOption[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Declined', value: 'declined' },
    { label: 'Retired', value: 'retired' },
  ]

  const tierFilters: FilterOption[] = [
    { label: 'BT', value: 'bt' },
    { label: 'LT', value: 'lt' },
    { label: 'HT', value: 'ht' },
    { label: 'ET', value: 'et' },
    { label: 'Filler', value: 'filler' },
  ]

  const discordFilters: FilterOption[] = [
    { label: 'Discord Only', value: 'only' },
    { label: 'No Discord', value: 'none' },
  ]

  const renderFilterOptions = (filterKey: string, filters: FilterOption[]) => {
    const buildHref = (filterValue: string | null): string =>
      route('admin.character-approvals.index', {
        ...normalizedParams,
        [filterKey]: filterValue,
        no_discord: undefined,
      })

    return (
      <div className="filter">
        <input
          className="btn btn-xs filter-reset"
          type="radio"
          name={filterKey}
          aria-label="All"
          defaultChecked={!normalizedParams[filterKey]}
          onClick={() => navigateTo(buildHref(null))}
        />
        {filters.map(({ label, value }) => (
          <input
            key={value}
            className="btn btn-xs"
            type="radio"
            name={filterKey}
            aria-label={label}
            defaultChecked={normalizedParams[filterKey] === value}
            onClick={() => navigateTo(buildHref(value))}
          />
        ))}
      </div>
    )
  }

  const groups = useMemo<CharacterGroup[]>(() => {
    const grouped = new Map<string, CharacterGroup>()

    characters.forEach((character) => {
      const userId = character.user_id
      const userName = character.user?.name ?? 'Unknown User'
      const discordId = character.user?.discord_id ?? null
      const groupKey = String(userId)
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          key: groupKey,
          label: userName,
          discordId,
          characters: [],
        })
      }
      grouped.get(groupKey)?.characters.push(character)
    })

    return Array.from(grouped.values())
  }, [characters])

  const totalCharacters = characters.length
  const totalUsers = groups.length
  const statusLabelMap: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    declined: 'Declined',
    retired: 'Retired',
  }
  const tierLabelMap: Record<string, string> = {
    bt: 'BT',
    lt: 'LT',
    ht: 'HT',
    et: 'ET',
    filler: 'Filler',
  }
  const discordLabelMap: Record<string, string> = {
    only: 'Discord Only',
    none: 'No Discord',
  }
  const activeFilters = [
    search ? `Search: ${search}` : null,
    normalizedParams.status
      ? `Status: ${statusLabelMap[String(normalizedParams.status)] ?? normalizedParams.status}`
      : null,
    normalizedParams.tier
      ? `Tier: ${tierLabelMap[String(normalizedParams.tier)] ?? String(normalizedParams.tier).toUpperCase()}`
      : null,
    normalizedParams.discord
      ? `Discord: ${discordLabelMap[String(normalizedParams.discord)] ?? normalizedParams.discord}`
      : null,
  ].filter(Boolean) as string[]

  return (
    <AppLayout>
      <Head title="Character Approvals" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Character Approvals</h1>
          <p className="text-sm text-base-content/70">Review and update guild status for each character.</p>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase text-base-content/50">Filters</p>
              <h2 className="text-lg font-semibold">Review queue</h2>
              <p className="text-xs text-base-content/70">Filter the queue by status, tier, or Discord.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
              <span className="rounded-full border border-base-200 px-2 py-1">
                {totalUsers} {totalUsers === 1 ? 'User' : 'Users'}
              </span>
              <span className="rounded-full border border-base-200 px-2 py-1">
                {totalCharacters} {totalCharacters === 1 ? 'Character' : 'Characters'}
              </span>
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
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Input type="search" placeholder="Search by character or user..." value={search} onChange={handleSearch}>
              Search
            </Input>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Status:</span>
                {renderFilterOptions('status', statusFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Tier:</span>
                {renderFilterOptions('tier', tierFilters)}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Discord:</span>
                {renderFilterOptions('discord', discordFilters)}
              </div>
            </div>
          </div>
        </div>
        {groups.length === 0 ? (
          <div className="text-sm text-base-content/70">No characters found.</div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.key} className="rounded-box border border-base-300/70 bg-base-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300/70 bg-base-200/70 px-4 py-2 text-xs font-semibold uppercase text-base-content/60">
                  <span>
                    {group.label}
                    <span className="ml-2 text-[10px] font-normal normal-case text-base-content/50">
                      ({group.characters.length})
                    </span>
                  </span>
                  <span className="flex items-center gap-2 font-normal normal-case text-base-content/60">
                    {group.discordId ? (
                      <>
                        <span>{group.discordId}</span>
                        <a
                          href={`https://discord.com/users/${group.discordId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link flex items-center"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </>
                    ) : (
                      <span>No Discord</span>
                    )}
                    <DeleteUserModal userId={Number(group.key)} userLabel={group.label} />
                  </span>
                </div>
                <List>
                  {group.characters.map((character) => {
                    const status = getStatusLabel(character.guild_status)
                    const currentTier = calculateTier(character)
                    const characterNotes = character.notes?.trim()
                    const hasRoom = (character.room_count ?? 0) > 0
                    return (
                      <ListRow key={character.id} className="grid-cols-1">
                        <div className="col-span-full flex flex-wrap items-center gap-3 md:flex-nowrap">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex w-6 justify-center" title="Current tier">
                              <LogoTier tier={currentTier} width={16} />
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <a
                                href={character.external_link}
                                className="flex min-w-0 items-center gap-2 text-sm link"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span className="truncate">{character.name}</span>
                              </a>
                              {characterNotes ? (
                                <span className="max-w-xs truncate text-xs text-base-content/60" title={characterNotes}>
                                  {characterNotes}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex w-full flex-wrap items-center gap-2 text-xs text-base-content/70 md:w-auto">
                            <span className="flex items-center gap-1 rounded-full border border-base-200 bg-base-100/90 px-2 py-0.5 text-base-content/80">
                              {hasRoom ? (
                                <MapPin size={12} className="text-primary/70" />
                              ) : (
                                <MapPinOff size={12} className="text-base-content/40" />
                              )}
                              <span>{hasRoom ? 'Room' : 'No room'}</span>
                            </span>
                            <span className="flex items-center gap-1 rounded-full border border-base-200 bg-base-100/90 px-2 py-0.5 text-base-content/80">
                              <LogoTier tier={character.start_tier} width={12} />
                              <span>Start</span>
                            </span>
                            <span
                              className={cn(
                                'flex items-center gap-1 rounded-full border border-base-200 bg-base-100/90 px-2 py-0.5',
                                status === 'approved' && 'text-success',
                                status === 'declined' && 'text-error',
                                status === 'pending' && 'text-warning',
                                status === 'retired' && 'text-base-content/50',
                              )}
                            >
                              {status === 'approved' && <CheckCircle2 size={12} />}
                              {status === 'declined' && <XCircle size={12} />}
                              {status === 'pending' && <Clock size={12} />}
                              {status === 'retired' && <Archive size={12} />}
                              <span className="capitalize">{status}</span>
                            </span>
                          </div>
                          <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-base-200/60 pt-3 md:w-auto md:border-t-0 md:border-l-2 md:border-base-300/70 md:pt-0 md:pl-4">
                            <AdminNoteModal character={character} />
                            <Button
                              size="xs"
                              modifier="square"
                              variant="ghost"
                              color="warning"
                              disabled={status === 'pending' || status === 'retired'}
                              onClick={() =>
                                router.patch(route('admin.character-approvals.update', { character: character.id }), {
                                  guild_status: 'pending',
                                })
                              }
                            >
                              <Clock size={14} />
                            </Button>
                            <Button
                              size="xs"
                              modifier="square"
                              variant="ghost"
                              color="success"
                              disabled={status === 'approved' || status === 'retired'}
                              onClick={() =>
                                router.patch(route('admin.character-approvals.update', { character: character.id }), {
                                  guild_status: 'approved',
                                })
                              }
                            >
                              <CheckCircle2 size={14} />
                            </Button>
                            <Button
                              size="xs"
                              modifier="square"
                              variant="ghost"
                              color="error"
                              disabled={status === 'declined' || status === 'retired'}
                              onClick={() =>
                                router.patch(route('admin.character-approvals.update', { character: character.id }), {
                                  guild_status: 'declined',
                                })
                              }
                            >
                              <XCircle size={14} />
                            </Button>
                          </div>
                        </div>
                      </ListRow>
                    )
                  })}
                </List>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
