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
import { CheckCircle2, Clock, ExternalLink, StickyNote, XCircle } from 'lucide-react'
import React, { useMemo, useState } from 'react'

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
  | 'adventures'
  | 'dm_bubbles'
  | 'bubble_shop_spend'
  | 'is_filler'
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
  return 'pending'
}

const AdminNoteModal = ({ character }: { character: AdminCharacter }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, patch, processing } = useForm({
    admin_notes: character.admin_notes ?? '',
  })

  const handleSubmit = () => {
    patch(route('registrations.characters.update', { character: character.id }), {
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
          className={cn(character.admin_notes ? 'text-warning' : 'text-base-content/60')}
        >
          <StickyNote size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Admin Notiz</ModalTitle>
      <ModalContent>
        <TextArea
          value={data.admin_notes}
          onChange={(e) => setData('admin_notes', e.target.value)}
          placeholder="Interne Notiz..."
        >
          Notiz
        </TextArea>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Speichern
      </ModalAction>
    </Modal>
  )
}

export default function RegistrationList({ characters }: { characters: AdminCharacter[] }) {
  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const navOptions = { preserveState: true, preserveScroll: true }

  const navigateTo = (href: string) => {
    router.get(href, {}, navOptions)
  }

  const initialDiscordFilter =
    (currentQueryParams.discord as string | undefined) ??
    (currentQueryParams.no_discord === '1' ? 'none' : '')
  const [search, setSearch] = useState(currentQueryParams.search || '')
  const [statusFilter, setStatusFilter] = useState(currentQueryParams.status || '')
  const [tierFilter, setTierFilter] = useState(currentQueryParams.tier || '')
  const [discordFilter, setDiscordFilter] = useState(initialDiscordFilter || '')

  const updateFilters = (nextSearch: string, nextStatus: string, nextTier: string, nextDiscord: string) => {
    navigateTo(
      route('registrations.index', {
        ...currentQueryParams,
        search: nextSearch || undefined,
        status: nextStatus || undefined,
        tier: nextTier || undefined,
        discord: nextDiscord || undefined,
        no_discord: undefined,
      }),
    )
  }

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    updateFilters(value, String(statusFilter), String(tierFilter), String(discordFilter))
  }

  const handleStatusChange = (nextStatus: string) => {
    setStatusFilter(nextStatus)
    updateFilters(String(search), nextStatus, String(tierFilter), String(discordFilter))
  }

  const handleTierChange = (nextTier: string) => {
    setTierFilter(nextTier)
    updateFilters(String(search), String(statusFilter), nextTier, String(discordFilter))
  }

  const handleDiscordFilterChange = (nextFilter: string) => {
    const nextValue = discordFilter === nextFilter ? '' : nextFilter
    setDiscordFilter(nextValue)
    updateFilters(String(search), String(statusFilter), String(tierFilter), nextValue)
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

  return (
    <AppLayout>
      <Head title="Registrations" />
      <div className="container mx-auto max-w-4xl px-2 py-4 md:px-0">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Input type="search" placeholder="Search by character or user..." value={search} onChange={handleSearch}>
            Search
          </Input>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-base-content/60">Status:</span>
            <Button
              size="xs"
              variant={statusFilter === '' ? 'solid' : 'outline'}
              onClick={() => handleStatusChange('')}
            >
              Alle
            </Button>
            <Button
              size="xs"
              variant={statusFilter === 'pending' ? 'solid' : 'outline'}
              color="warning"
              onClick={() => handleStatusChange('pending')}
            >
              Ausstehend
            </Button>
            <Button
              size="xs"
              variant={statusFilter === 'approved' ? 'solid' : 'outline'}
              color="success"
              onClick={() => handleStatusChange('approved')}
            >
              Genehmigt
            </Button>
            <Button
              size="xs"
              variant={statusFilter === 'declined' ? 'solid' : 'outline'}
              color="error"
              onClick={() => handleStatusChange('declined')}
            >
              Abgelehnt
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-base-content/60">Tier:</span>
            <Button size="xs" variant={tierFilter === '' ? 'solid' : 'outline'} onClick={() => handleTierChange('')}>
              Alle
            </Button>
            <Button size="xs" variant={tierFilter === 'bt' ? 'solid' : 'outline'} onClick={() => handleTierChange('bt')}>
              BT
            </Button>
            <Button size="xs" variant={tierFilter === 'lt' ? 'solid' : 'outline'} onClick={() => handleTierChange('lt')}>
              LT
            </Button>
            <Button size="xs" variant={tierFilter === 'ht' ? 'solid' : 'outline'} onClick={() => handleTierChange('ht')}>
              HT
            </Button>
            <Button size="xs" variant={tierFilter === 'et' ? 'solid' : 'outline'} onClick={() => handleTierChange('et')}>
              ET
            </Button>
            <Button
              size="xs"
              variant={tierFilter === 'filler' ? 'solid' : 'outline'}
              onClick={() => handleTierChange('filler')}
            >
              Filler
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-base-content/60">Discord:</span>
            <Button
              size="xs"
              variant={discordFilter === '' ? 'solid' : 'outline'}
              onClick={() => handleDiscordFilterChange('')}
            >
              Alle
            </Button>
            <Button
              size="xs"
              variant={discordFilter === 'none' ? 'solid' : 'outline'}
              onClick={() => handleDiscordFilterChange('none')}
            >
              Kein Discord
            </Button>
            <Button
              size="xs"
              variant={discordFilter === 'only' ? 'solid' : 'outline'}
              onClick={() => handleDiscordFilterChange('only')}
            >
              Nur Discord
            </Button>
          </div>
        </div>
        {groups.length === 0 ? (
          <div className="text-sm text-base-content/70">Keine Charaktere gefunden.</div>
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
                      <span>Kein Discord</span>
                    )}
                  </span>
                </div>
                <List>
                  {group.characters.map((character) => {
                    const status = getStatusLabel(character.guild_status)
                    const currentTier = calculateTier(character)
                    return (
                      <ListRow key={character.id} className="grid-cols-1">
                        <div className="col-span-full flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex w-6 justify-center" title="Start Tier">
                              <LogoTier tier={character.start_tier} width={16} />
                            </div>
                            <div className="flex w-6 justify-center" title="Aktueller Tier">
                              <LogoTier tier={currentTier} width={16} />
                            </div>
                            <a
                              href={character.external_link}
                              className="flex min-w-0 items-center gap-2 text-sm link"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img src="/images/dnd-beyond-logo.svg" className="h-6 w-6" alt="sheet-link" />
                              <span className="truncate">{character.name}</span>
                            </a>
                          </div>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex items-center text-xs',
                              status === 'approved' && 'text-success',
                                status === 'declined' && 'text-error',
                                status === 'pending' && 'text-warning',
                              )}
                            >
                              {status === 'approved' && <CheckCircle2 size={16} />}
                              {status === 'declined' && <XCircle size={16} />}
                            {status === 'pending' && <Clock size={16} />}
                            <span className="ml-1 capitalize">{status}</span>
                          </div>
                          <AdminNoteModal character={character} />
                          <Button
                            size="xs"
                            modifier="square"
                              variant="ghost"
                              color="warning"
                              disabled={status === 'pending'}
                              onClick={() =>
                                router.patch(route('registrations.characters.update', { character: character.id }), {
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
                              disabled={status === 'approved'}
                              onClick={() =>
                                router.patch(route('registrations.characters.update', { character: character.id }), {
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
                              disabled={status === 'declined'}
                              onClick={() =>
                                router.patch(route('registrations.characters.update', { character: character.id }), {
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
