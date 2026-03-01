import LogoTier from '@/components/logo-tier'
import { ActionMenu } from '@/components/ui/action-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import AppLayout from '@/layouts/app-layout'
import { calculateTier } from '@/helper/calculateTier'
import { calculateLevel } from '@/helper/calculateLevel'
import { cn } from '@/lib/utils'
import { Character, PageProps } from '@/types'
import { CharacterClassToggle } from '@/pages/character/character-class-toggle'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { AlertTriangle, Archive, CheckCircle2, Clock, ExternalLink, Gauge, MapPin, MapPinOff, Pencil, Plus, Shield, StickyNote, UserX, XCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

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
  | 'registration_note'
  | 'review_note'
  | 'user'
  | 'admin_notes'
  | 'admin_managed'
  | 'notes'
  | 'adventures'
  | 'dm_bubbles'
  | 'dm_coins'
  | 'bubble_shop_spend'
  | 'is_filler'
  | 'room_count'
  | 'faction'
  | 'version'
  | 'character_classes'
  | 'avatar'
  | 'simplified_tracking'
> & {
  dndbeyond_character_id?: number | null
  has_legacy_approval?: boolean
  legacy_approval_match?: {
    id: number
    discord_name?: string | null
    player_name?: string | null
    room?: string | null
    tier: string
    character_name: string
    external_link: string
    dndbeyond_character_id: number
    source_row?: number | null
    source_column?: string | null
  } | null
}

type CharacterGroup = {
  key: string
  label: string
  discordHandle?: string | null
  discordId?: number | null
  simplifiedTracking?: boolean
  characters: AdminCharacter[]
}

const getStatusLabel = (status?: string | null) => {
  if (status === 'approved') return 'Approved'
  if (status === 'declined') return 'Declined'
  if (status === 'needs_changes') return 'Needs changes'
  if (status === 'retired') return 'Retired'
  if (status === 'draft') return 'Draft'
  return 'Pending'
}

const AdminNoteModal = ({
  character,
  isOpen: controlledIsOpen,
  onOpenChange,
  children,
}: React.PropsWithChildren<{
  character: AdminCharacter
  isOpen?: boolean
  onOpenChange?: (next: boolean) => void
}>) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const { data, setData, patch, processing } = useForm({
    admin_notes: character.admin_notes ?? '',
  })
  const isOpen = controlledIsOpen ?? internalIsOpen
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next)
      return
    }

    setInternalIsOpen(next)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setData('admin_notes', character.admin_notes ?? '')
  }, [character.admin_notes, isOpen, setData])

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
      {children ? (
        <ModalTrigger>
          <span
            onClick={() => {
              setData('admin_notes', character.admin_notes ?? '')
              setIsOpen(true)
            }}
            className={cn(hasAdminNote ? 'text-warning' : 'text-base-content/40')}
          >
            {children}
          </span>
        </ModalTrigger>
      ) : null}
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

const CharacterActionsMenu = ({
  character,
  userId,
  userName,
}: {
  character: AdminCharacter
  userId: number
  userName: string
}) => {
  const currentStatus = character.guild_status ?? 'pending'
  const isPending = currentStatus === 'pending'
  const isDraft = currentStatus === 'draft'
  const isRetired = currentStatus === 'retired'
  const canReview = isPending
  const canOverrideToPending = !isPending && !isRetired && !isDraft
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState<'pending' | 'approved' | 'needs_changes' | 'declined' | null>(null)
  const [reviewNote, setReviewNote] = useState(character.review_note ?? '')
  const [isQuickLevelOpen, setIsQuickLevelOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const openStatusModal = (status: 'pending' | 'approved' | 'needs_changes' | 'declined') => {
    setTargetStatus(status)
    setReviewNote(character.review_note ?? '')
    setIsStatusModalOpen(true)
  }

  const closeStatusModal = () => {
    setIsStatusModalOpen(false)
    setTargetStatus(null)
  }

  const submitStatusUpdate = () => {
    if (!targetStatus) {
      return
    }

    router.patch(route('admin.character-approvals.update', { character: character.id }), {
      guild_status: targetStatus,
      review_note: targetStatus === 'needs_changes' || targetStatus === 'declined' ? reviewNote.trim() : undefined,
    }, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        closeStatusModal()
      },
    })
  }

  const needsReviewNote = targetStatus === 'needs_changes' || targetStatus === 'declined'
  const modalTitle = targetStatus === 'approved'
    ? 'Approve character'
    : targetStatus === 'pending'
      ? 'Set back to pending'
      : targetStatus === 'needs_changes'
        ? 'Request changes'
        : 'Decline character'
  const modalAction = targetStatus === 'approved'
    ? 'Approve'
    : targetStatus === 'pending'
      ? 'Set to pending'
      : targetStatus === 'needs_changes'
        ? 'Request changes'
        : 'Decline character'

  const modalDescription = targetStatus === 'approved'
    ? 'Confirm setting this character to approved.'
    : targetStatus === 'pending'
      ? 'Confirm moving this character back to pending review.'
      : targetStatus === 'needs_changes'
        ? 'Provide a review note with required fixes.'
        : 'Provide a review note explaining why this character is declined.'

  return (
    <>
      <AdminQuickLevelModal character={character} isOpen={isQuickLevelOpen} onOpenChange={setIsQuickLevelOpen} />
      <AdminCharacterModal userId={userId} userName={userName} character={character} isOpen={isEditOpen} onOpenChange={setIsEditOpen} />
      <ActionMenu
        disabled={isDraft}
        items={[
          { type: 'label', label: 'Character actions' },
          {
            label: 'Set level',
            icon: <Gauge size={14} />,
            onSelect: () => setIsQuickLevelOpen(true),
          },
          {
            label: 'Edit character',
            icon: <Pencil size={14} />,
            onSelect: () => setIsEditOpen(true),
          },
          { type: 'divider', id: 'character-actions' },
          { type: 'label', label: 'Review decisions' },
          {
            label: 'Approve',
            icon: <CheckCircle2 size={14} />,
            disabled: !canReview,
            active: currentStatus === 'approved',
            onSelect: () => openStatusModal('approved'),
          },
          {
            label: 'Needs changes',
            icon: <AlertTriangle size={14} />,
            disabled: !canReview,
            active: currentStatus === 'needs_changes',
            onSelect: () => openStatusModal('needs_changes'),
          },
          {
            label: 'Decline',
            icon: <XCircle size={14} />,
            tone: 'error',
            disabled: !canReview,
            active: currentStatus === 'declined',
            onSelect: () => openStatusModal('declined'),
          },
          { type: 'divider', id: 'status-actions' },
          { type: 'label', label: 'Override' },
          {
            label: 'Set back to pending',
            icon: <Clock size={14} />,
            disabled: !canOverrideToPending,
            active: currentStatus === 'pending',
            onSelect: () => openStatusModal('pending'),
          },
        ]}
      />
      <Modal isOpen={isStatusModalOpen} onClose={closeStatusModal}>
        <ModalTitle>{modalTitle}</ModalTitle>
        <ModalContent>
          {needsReviewNote ? (
            <TextArea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Describe what needs to be fixed..."
            >
              Review note (required)
            </TextArea>
          ) : (
            <p className="text-sm text-base-content/80">{modalDescription}</p>
          )}
        </ModalContent>
        <ModalAction
          onClick={submitStatusUpdate}
          disabled={needsReviewNote && reviewNote.trim() === ''}
          variant={targetStatus === 'declined' ? 'error' : targetStatus === 'approved' ? 'success' : ''}
        >
          {modalAction}
        </ModalAction>
      </Modal>
    </>
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

const AdminCharacterModal = ({
  userId,
  userName,
  character,
  isOpen: controlledIsOpen,
  onOpenChange,
  children,
}: React.PropsWithChildren<{
  userId: number
  userName: string
  character?: AdminCharacter
  isOpen?: boolean
  onOpenChange?: (next: boolean) => void
}>) => {
  const { classes, factions, versions, tiers, errors } = usePage<PageProps>().props
  const startTierOptions = Object.entries(tiers).filter(([key]) => key !== 'et')
  const isEdit = Boolean(character)
  const currentStatus = character?.guild_status ?? 'pending'
  const canEditStatus = currentStatus === 'pending' || currentStatus === 'draft'
  const statusLabelMap: Record<string, string> = {
    pending: 'Active',
    draft: 'Draft',
    approved: 'Approved',
    declined: 'Declined',
    needs_changes: 'Needs changes',
    retired: 'Retired',
  }
  const initialFormData = {
    name: character?.name ?? '',
    class: character?.character_classes?.map((cc) => cc.id) ?? [],
    faction: character?.faction ?? 'none',
    version: character?.version ?? '2024',
    start_tier: character?.start_tier ?? 'bt',
    dm_bubbles: character?.dm_bubbles ?? 0,
    dm_coins: character?.dm_coins ?? 0,
    notes: character?.notes ?? '',
    bubble_shop_spend: character?.bubble_shop_spend ?? 0,
    external_link: character?.external_link ?? '',
    is_filler: character?.is_filler ?? false,
    guild_status: canEditStatus ? currentStatus : null,
    avatar: undefined,
  }
  const { data, setData, post, patch, processing, reset, clearErrors } = useForm(initialFormData)
  const [activeTab, setActiveTab] = useState<'basics' | 'details'>('basics')
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen ?? internalIsOpen
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next)
      return
    }

    setInternalIsOpen(next)
  }

  const handleOpen = () => {
    reset()
    clearErrors()
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset()
    clearErrors()
  }, [clearErrors, isOpen, reset])

  const handleClose = () => {
    setIsOpen(false)
    reset()
  }

  const handleSubmit = () => {
    const options = {
      preserveState: 'errors' as const,
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        handleClose()
      },
    }

    if (isEdit && character) {
      patch(route('admin.character-approvals.characters.update', { character: character.id }), options)
      return
    }

    post(route('admin.character-approvals.characters.store', { user: userId }), options)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {children ? (
        <ModalTrigger>
          <span onClick={handleOpen}>{children}</span>
        </ModalTrigger>
      ) : null}
      <ModalTitle>{isEdit ? 'Edit character' : 'Add character'}</ModalTitle>
      <ModalContent>
        <form>
          <div className="mb-3 text-xs text-base-content/70">
            {isEdit ? `Character owner: ${userName}` : `New character for: ${userName}`}
          </div>
          <div role="tablist" className="tabs tabs-border mb-2">
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'basics' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('basics')}
            >
              Basics
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
          </div>
          {activeTab === 'basics' ? (
            <div className="space-y-3">
              <Input placeholder="Mordenkainen" errors={errors.name} type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}>
                Name
              </Input>
              <CharacterClassToggle classes={classes} data={data} errors={errors} setData={(_, value) => setData('class', value)}></CharacterClassToggle>
              <Select
                errors={errors.start_tier}
                value={data.start_tier}
                onChange={(e) => setData('start_tier', e.target.value as Character['start_tier'])}
              >
                <SelectLabel>Start tier</SelectLabel>
                <SelectOptions>
                  {startTierOptions.map(([key, value]: [string, string]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Select
                errors={errors.faction}
                value={data.faction}
                onChange={(e) => setData('faction', e.target.value as Character['faction'])}
              >
                <SelectLabel>Factions</SelectLabel>
                <SelectOptions>
                  {Object.entries(factions).map(([key, value]: [string, string]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Select
                errors={errors.version}
                value={data.version}
                onChange={(e) => setData('version', e.target.value as Character['version'])}
              >
                <SelectLabel>Versions</SelectLabel>
                <SelectOptions>
                  {versions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Select
                errors={errors.guild_status}
                value={canEditStatus ? (data.guild_status ?? currentStatus) : currentStatus}
                onChange={(e) => setData('guild_status', e.target.value as 'pending' | 'draft')}
              >
                <SelectLabel>Visibility</SelectLabel>
                <SelectOptions>
                  {!canEditStatus ? (
                    <option value={currentStatus}>{statusLabelMap[currentStatus] ?? currentStatus}</option>
                  ) : (
                    <>
                      <option value="pending">Active</option>
                      <option value="draft">Draft</option>
                    </>
                  )}
                </SelectOptions>
              </Select>
              <Input
                placeholder="https://www.dndbeyond.com/characters/..."
                errors={errors.external_link}
                type="url"
                value={data.external_link}
                onChange={(e) => setData('external_link', e.target.value)}
              >
                DnDBeyond Link
              </Input>
              <FileInput errors={errors.avatar} onChange={(e) => setData('avatar', e.target?.files?.[0] as never)}>
                Avatar
              </FileInput>
              <p className="text-xs text-base-content/60">Accepted: JPG, PNG, GIF, WEBP · Max. 5 MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={cn('grid grid-cols-2 gap-2')}>
                <Input
                  errors={errors.dm_bubbles}
                  type="number"
                  min={0}
                  max={1024}
                  value={data.dm_bubbles}
                  onChange={(e) => setData('dm_bubbles', Number(e.target.value))}
                >
                  DM Bubbles
                </Input>
                <Input
                  errors={errors.dm_coins}
                  type="number"
                  min={0}
                  max={1024}
                  value={data.dm_coins}
                  onChange={(e) => setData('dm_coins', Number(e.target.value))}
                >
                  DM Coins
                </Input>
              </div>
              <Input
                errors={errors.bubble_shop_spend}
                type="number"
                min={0}
                max={1024}
                value={data.bubble_shop_spend}
                onChange={(e) => setData('bubble_shop_spend', Number(e.target.value))}
              >
                Bubble Shop Spend
              </Input>
              <TextArea placeholder="Notes" errors={errors.notes} value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
                Notes
              </TextArea>
              <Checkbox errors={errors.is_filler} checked={data.is_filler} onChange={(e) => setData('is_filler', e.target.checked)}>
                This character is a filler character.
              </Checkbox>
            </div>
          )}
        </form>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
    </Modal>
  )
}

const AdminQuickLevelModal = ({
  character,
  isOpen: controlledIsOpen,
  onOpenChange,
  children,
}: React.PropsWithChildren<{
  character: AdminCharacter
  isOpen?: boolean
  onOpenChange?: (next: boolean) => void
}>) => {
  const { errors } = usePage<PageProps>().props
  const { data, setData, post, processing, reset, clearErrors } = useForm({ level: 1 })
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen ?? internalIsOpen
  const setIsOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next)
      return
    }

    setInternalIsOpen(next)
  }

  const handleOpen = () => {
    reset()
    clearErrors()
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset()
    clearErrors()
  }, [clearErrors, isOpen, reset])

  const handleClose = () => {
    setIsOpen(false)
    reset()
  }

  const handleSubmit = () => {
    post(route('admin.character-approvals.characters.quick-level', { character: character.id }), {
      preserveScroll: true,
      preserveState: 'errors',
      onSuccess: () => {
        handleClose()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {children ? (
        <ModalTrigger>
          <span onClick={handleOpen}>{children}</span>
        </ModalTrigger>
      ) : null}
      <ModalTitle>Set level</ModalTitle>
      <ModalContent>
        <Input
          type="number"
          min={1}
          max={20}
          errors={errors.level}
          value={data.level}
          onChange={(e) => setData('level', Number(e.target.value))}
        >
          Level
        </Input>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
    </Modal>
  )
}

export default function CharacterApprovals({ characters }: { characters: AdminCharacter[] }) {
  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const navOptions = { preserveState: true, preserveScroll: true }
  const normalizedParams: Record<string, string | number | undefined> = {
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
    { label: 'Draft', value: 'draft' },
    { label: 'Approved', value: 'approved' },
    { label: 'Needs changes', value: 'needs_changes' },
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
  const legacyFilters: FilterOption[] = [
    { label: 'Legacy Match', value: 'matched' },
    { label: 'No Legacy Match', value: 'missing' },
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
      const discordUsername = character.user?.discord_username?.trim()
      const discordDisplayName = character.user?.discord_display_name?.trim()
      const discordHandle = discordUsername || discordDisplayName || null
      const discordId = character.user?.discord_id ?? null
      const simplifiedTracking = Boolean(character.simplified_tracking)
      const groupKey = String(userId)
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          key: groupKey,
          label: userName,
          discordHandle,
          discordId,
          simplifiedTracking,
          characters: [],
        })
      }
      const group = grouped.get(groupKey)
      if (!group) return

      if (!group.discordHandle && discordHandle) {
        group.discordHandle = discordHandle
      }
      group.simplifiedTracking = Boolean(group.simplifiedTracking || simplifiedTracking)
      group.characters.push(character)
    })

    return Array.from(grouped.values())
  }, [characters])

  const totalCharacters = characters.length
  const totalUsers = groups.length
  const statusLabelMap: Record<string, string> = {
    pending: 'Pending',
    draft: 'Draft',
    approved: 'Approved',
    needs_changes: 'Needs changes',
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
const tierTextClassMap: Record<string, string> = {
  bt: 'text-tier-bt',
  lt: 'text-tier-lt',
  ht: 'text-tier-ht',
  et: 'text-tier-et',
  filler: 'text-tier-filler',
}
  const discordLabelMap: Record<string, string> = {
    only: 'Discord Only',
    none: 'No Discord',
  }
  const legacyLabelMap: Record<string, string> = {
    matched: 'Legacy Match',
    missing: 'No Legacy Match',
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
    normalizedParams.legacy
      ? `Legacy: ${legacyLabelMap[String(normalizedParams.legacy)] ?? normalizedParams.legacy}`
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
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-base-content/60">Legacy:</span>
                {renderFilterOptions('legacy', legacyFilters)}
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
                  <span className="normal-case">
                    {group.label}
                    {group.discordHandle ? (
                      <span className="ml-1 text-[11px] font-normal normal-case text-base-content/60">| {group.discordHandle}</span>
                    ) : null}
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
                    {group.simplifiedTracking ? (
                      <span className="rounded-full border border-base-200 bg-base-100 px-2 py-0.5 text-[11px] font-semibold text-base-content/70">
                        Simplified tracking
                      </span>
                    ) : null}
                    <AdminCharacterModal userId={Number(group.key)} userName={group.label}>
                      <Button size="xs" variant="ghost">
                        <Plus size={14} />
                        Add character
                      </Button>
                    </AdminCharacterModal>
                    <DeleteUserModal userId={Number(group.key)} userLabel={group.label} />
                  </span>
                </div>
                <List>
                  {group.characters.map((character) => {
                    const status = character.guild_status ?? 'pending'
                    const statusLabel = getStatusLabel(status)
                    const isDraft = status === 'draft'
                    const currentTier = calculateTier(character)
                    const currentLevel = calculateLevel(character)
                    const isAdminManaged = Boolean(character.admin_managed)
                    const characterNotes = character.notes?.trim()
                    const registrationNote = character.registration_note?.trim()
                    const reviewNote = character.review_note?.trim()
                    const hasRoom = (character.room_count ?? 0) > 0
                    const legacyMatch = character.legacy_approval_match
                    const hasLegacyApproval = Boolean(character.has_legacy_approval && legacyMatch)
                    const legacyTitle = hasLegacyApproval
                      ? [
                        `Legacy approved as ${legacyMatch?.character_name}`,
                        `Tier: ${String(legacyMatch?.tier ?? '').toUpperCase()}`,
                        legacyMatch?.player_name ? `Player: ${legacyMatch.player_name}` : null,
                        legacyMatch?.discord_name ? `Discord: ${legacyMatch.discord_name}` : null,
                        legacyMatch?.room ? `Room: ${legacyMatch.room}` : null,
                      ].filter(Boolean).join(' | ')
                      : null
                    return (
                      <ListRow key={character.id} className={cn('grid-cols-1', isDraft && 'opacity-60')}>
                        <div className="col-span-full flex flex-wrap items-center gap-3 md:flex-nowrap">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex w-6 justify-center" title="Current tier">
                              <LogoTier tier={currentTier} width={16} />
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <a
                                href={character.external_link}
                                className="flex min-w-0 items-center gap-2 text-sm hover:text-primary"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span className={cn('truncate', tierTextClassMap[currentTier] ?? 'text-base-content')}>
                                  {character.name}
                                </span>
                                <ExternalLink size={12} className="shrink-0 text-base-content/50" />
                              </a>
                              {characterNotes ? (
                                <span className="max-w-xs truncate text-xs text-base-content/60" title={characterNotes}>
                                  {characterNotes}
                                </span>
                              ) : null}
                              {registrationNote ? (
                                <span className="max-w-xs truncate text-xs text-base-content/60" title={registrationNote}>
                                  Registration: {registrationNote}
                                </span>
                              ) : null}
                              {reviewNote ? (
                                <span className="max-w-xs truncate text-xs text-base-content/70" title={reviewNote}>
                                  Review: {reviewNote}
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
                            <span className="flex items-center gap-1 rounded-full border border-base-200 bg-base-100/90 px-2 py-0.5 text-base-content/80">
                              <Gauge size={12} className="text-primary/70" />
                              <span>Lvl {currentLevel}</span>
                            </span>
                            <span
                              className={cn(
                                'flex items-center gap-1 rounded-full border border-base-200 bg-base-100/90 px-2 py-0.5',
                                status === 'approved' && 'text-success',
                                status === 'declined' && 'text-error',
                                status === 'needs_changes' && 'text-warning',
                                status === 'pending' && 'text-warning',
                                status === 'draft' && 'text-base-content/60',
                                status === 'retired' && 'text-base-content/50',
                              )}
                            >
                              {status === 'approved' && <CheckCircle2 size={12} />}
                              {status === 'declined' && <XCircle size={12} />}
                              {status === 'needs_changes' && <AlertTriangle size={12} />}
                              {status === 'pending' && <Clock size={12} />}
                              {status === 'draft' && <Pencil size={12} />}
                              {status === 'retired' && <Archive size={12} />}
                              <span>{statusLabel}</span>
                            </span>
                            {isAdminManaged ? (
                              <span className="flex items-center gap-1 rounded-full border border-base-200 bg-base-100/90 px-2 py-0.5 text-base-content/70">
                                <Shield size={12} />
                                <span>Admin</span>
                              </span>
                            ) : null}
                            {hasLegacyApproval ? (
                              <span
                                className="flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-success"
                                title={legacyTitle ?? undefined}
                              >
                                <CheckCircle2 size={12} />
                                <span>Legacy approved</span>
                              </span>
                            ) : null}
                            <AdminNoteModal character={character}>
                              <span
                                className={cn(
                                  'flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                                  character.admin_notes?.trim()
                                    ? 'border-warning/40 bg-warning/10 text-warning'
                                    : 'border-base-200 bg-base-100/90 text-base-content/60',
                                )}
                                title={character.admin_notes?.trim() ? 'Edit admin note' : 'Add admin note'}
                              >
                                <StickyNote size={12} />
                                <span>{character.admin_notes?.trim() ? 'Admin note' : 'Add note'}</span>
                              </span>
                            </AdminNoteModal>
                          </div>
                          <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-base-200/60 pt-3 md:w-auto md:border-t-0 md:pt-0">
                            <CharacterActionsMenu character={character} userId={Number(group.key)} userName={group.label} />
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
