import { List, ListRow } from '@/components/ui/list'
import { Button } from '@/components/ui/button'
import LogoTier from '@/components/logo-tier'
import { InfoBox, InfoBoxLine, InfoBoxTitle } from '@/components/ui/info-box'
import { Modal, ModalContent, ModalTitle } from '@/components/ui/modal'
import UpdateAdventureModal from '@/pages/character/update-adventure-modal'
import UpdateDowntimeModal from '@/pages/character/update-downtime-modal'
import CharacterManualOverrideModal from '@/pages/character/character-manual-override-modal'
import { AlliesModal } from '@/pages/character/allies-modal'
import StoreAdventureModal from '@/pages/character/store-adventure-modal'
import StoreDowntimeModal from '@/pages/character/store-downtime-modal'
import SetCharacterLevelModal from '@/pages/character/set-character-level-modal'
import AppLayout from '@/layouts/app-layout'
import { useTranslate } from '@/lib/i18n'
import { calculateBubblesInCurrentLevel } from '@/helper/calculateBubblesInCurrentLevel'
import { calculateClassString } from '@/helper/calculateClassString'
import { calculateFactionDowntime, calculateOtherDowntime } from '@/helper/calculateDowntime'
import { calculateFactionLevel } from '@/helper/calculateFactionLevel'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel } from '@/helper/levelProgression'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { calculateRemainingDowntime } from '@/helper/calculateRemainingDowntime'
import { calculateTotalBubblesToNextLevel } from '@/helper/calculateTotalBubblesToNextLevel'
import { calculateTier } from '@/helper/calculateTier'
import { usesManualLevelTracking } from '@/helper/usesManualLevelTracking'
import { getAllyDisplayName, getAllyOwnerName, isDeletedLinkedAlly } from '@/helper/allyDisplay'
import { Progress } from '@/components/ui/progress'
import { Character, Ally, PageProps } from '@/types'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import {
  Anvil,
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins,
  Crown,
  Droplets,
  FlameKindling,
  Gauge,
  Handshake,
  Heart,
  LoaderCircle,
  Pencil,
  ScrollText,
  Swords,
  Trash,
  XCircle,
} from 'lucide-react'
import { useImage } from 'react-image'
import { cn } from '@/lib/utils'
import { useMemo, useState, useTransition } from 'react'

function CharacterPortrait({
  character,
  className,
  masked = true,
}: {
  character: Character
  className?: string
  masked?: boolean
}) {
  const avatarValue = String(character.avatar || '').trim()
  const srcList = avatarValue
    ? [avatarValue.startsWith('http') ? avatarValue : `/storage/${avatarValue}`, '/images/no-avatar.svg']
    : ['/images/no-avatar.svg']
  const { src } = useImage({
    srcList,
  })
  return (
    <img
      className={cn('aspect-square object-cover', masked ? 'rounded-full' : 'rounded-none', className)}
      src={src}
      alt={character.name}
    />
  )
}

function AllyPortrait({ ally, className }: { ally: Ally; className?: string }) {
  const linkedAvatar = String(ally.linked_character?.avatar || '').trim()
  const allyAvatar = String(ally.avatar || '').trim()
  const { src } = useImage({
    srcList: linkedAvatar
      ? [linkedAvatar.startsWith('http') ? linkedAvatar : `/storage/${linkedAvatar}`, '/images/no-avatar.svg']
      : allyAvatar
        ? [allyAvatar.startsWith('http') ? allyAvatar : `/storage/${allyAvatar}`, '/images/no-avatar.svg']
        : ['/images/no-avatar.svg'],
  })
  return <img className={cn('h-10 w-10 rounded-full object-cover', className)} src={src} alt={getAllyDisplayName(ally)} />
}

function RatingHearts({ rating }: { rating: number }) {
  const normalized = Math.max(1, Math.min(5, rating || 3))
  return (
    <div className="flex items-center gap-0.5 text-primary">
      {Array.from({ length: 5 }, (_, index) => (
        <Heart key={index} size={14} className={index < normalized ? 'fill-current' : 'text-base-content/30'} />
      ))}
    </div>
  )
}

const formatParticipantSummary = (names: string[]) => {
  const unique = Array.from(new Set(names.filter(Boolean)))
  if (unique.length === 0) return ''
  const visible = unique.slice(0, 3).join(', ')
  const remaining = unique.length - 3
  return remaining > 0 ? `${visible} +${remaining} more` : visible
}

function getCharacterStatusHint(guildStatus: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (guildStatus === 'draft') {
    return t('characters.statusDraftHint')
  }

  if (guildStatus === 'pending') {
    return t('characters.statusPendingHint')
  }

  if (guildStatus === 'needs_changes') {
    return t('characters.statusNeedsChangesHint')
  }

  if (guildStatus === 'declined') {
    return t('characters.statusDeclinedHint')
  }

  return ''
}

const getStatusLabel = (status: string) => {
  if (status === 'approved') return 'approved'
  if (status === 'declined') return 'declined'
  if (status === 'needs_changes') return 'needs changes'
  if (status === 'retired') return 'retired'
  if (status === 'draft') return 'draft'
  return 'pending'
}

export default function Show({
  character,
  guildCharacters,
  readOnly = false,
}: {
  character: Character
  guildCharacters: Character[]
  readOnly?: boolean
}) {
  const t = useTranslate()
  const { features } = usePage<PageProps>().props
  const isReadOnly = readOnly || Boolean(character.deleted_at)
  const level = calculateLevel(character)
  const tier = calculateTier(character)
  const classString = calculateClassString(character)
  const progressValue = calculateBubblesInCurrentLevel(character)
  const progressMax = calculateTotalBubblesToNextLevel(character)
  const guildStatus = character.guild_status ?? 'pending'
  const reviewNote = character.review_note?.trim() ?? ''
  const statusHint = getCharacterStatusHint(guildStatus, t)
  const statusSummary = reviewNote && (guildStatus === 'needs_changes' || guildStatus === 'declined')
    ? `${statusHint} ${t('common.note')}: ${reviewNote}`
    : statusHint
  const avatarMasked = character.avatar_masked ?? true
  const simplifiedTracking = character.simplified_tracking ?? false
  const draftOnlyMode = !(features?.character_status_switch ?? true)
  const requiresRegistration = guildStatus === 'draft' || guildStatus === 'needs_changes'
  const canLogActivity = draftOnlyMode || !requiresRegistration
  const requiresSubmissionBeforeDowntime = !draftOnlyMode && requiresRegistration
  const [activeAdventureModalId, setActiveAdventureModalId] = useState<number | null>(null)
  const [activeDowntimeModalId, setActiveDowntimeModalId] = useState<number | null>(null)
  const [activeNotes, setActiveNotes] = useState<{ title: string; notes: string } | null>(null)
  const [activeAllyMeetings, setActiveAllyMeetings] = useState<{ allyName: string; entries: { title: string; date: string }[] } | null>(null)
  const [adventureSortDir, setAdventureSortDir] = useState<'desc' | 'asc'>('desc')
  const [downtimeSortDir, setDowntimeSortDir] = useState<'desc' | 'asc'>('desc')
  const [allySortBy, setAllySortBy] = useState<'standing' | 'shared_adventures' | 'name' | 'owner'>('standing')
  const [allySortDir, setAllySortDir] = useState<'desc' | 'asc'>('desc')
  const [isAdventuresPending, startAdventuresTransition] = useTransition()
  const [isDowntimesPending, startDowntimesTransition] = useTransition()
  const [isAlliesPending, startAlliesTransition] = useTransition()
  const [adventuresOpen, setAdventuresOpen] = useState(
    character.adventures.length > 0 && character.adventures.length <= 6,
  )
  const [downtimesOpen, setDowntimesOpen] = useState(false)
  const [alliesOpen, setAlliesOpen] = useState(character.allies.length > 0 && character.allies.length <= 12)

  const adventureNotesMap = useMemo(() => {
    const map = new Map<number, string>()
    character.adventures.forEach((adv) => {
      if (adv.notes) {
        map.set(adv.id, adv.notes)
      }
    })
    return map
  }, [character.adventures])

  const downtimeNotesMap = useMemo(() => {
    const map = new Map<number, string>()
    character.downtimes.forEach((dt) => {
      if (dt.notes) {
        map.set(dt.id, dt.notes)
      }
    })
    return map
  }, [character.downtimes])

  const sortedAdventures = useMemo(() => {
    const direction = adventureSortDir === 'desc' ? -1 : 1
    return [...character.adventures].sort((a, b) => {
      const aDate = new Date(a.start_date).getTime()
      const bDate = new Date(b.start_date).getTime()
      return (aDate - bDate) * direction
    })
  }, [character.adventures, adventureSortDir])

  const supersededAdventureIds = useMemo(() => {
    const chronological = [...character.adventures].sort((a, b) => {
      const aDate = new Date(a.start_date).getTime()
      const bDate = new Date(b.start_date).getTime()
      return aDate !== bDate ? aDate - bDate : a.id - b.id
    })
    const lastPseudoIdx = chronological.reduceRight((found, adv, i) => found === -1 && adv.is_pseudo ? i : found, -1)
    if (lastPseudoIdx === -1) return new Set<number>()
    return new Set(chronological.slice(0, lastPseudoIdx).filter(a => !a.is_pseudo).map(a => a.id))
  }, [character.adventures])

  const sortedDowntimes = useMemo(() => {
    const direction = downtimeSortDir === 'desc' ? -1 : 1
    return [...character.downtimes].sort((a, b) => {
      const aDate = new Date(a.start_date).getTime()
      const bDate = new Date(b.start_date).getTime()
      return (aDate - bDate) * direction
    })
  }, [character.downtimes, downtimeSortDir])

  const adventureParticipantMap = useMemo(() => {
    const map = new Map<number, string>()
    sortedAdventures.forEach((adv) => {
      const summary = formatParticipantSummary(
        (adv.allies ?? []).map((ally) => getAllyDisplayName(ally)),
      )
      if (summary) {
        map.set(adv.id, summary)
      }
    })
    return map
  }, [sortedAdventures])

  const allyAdventureCountMap = useMemo(() => {
    const map = new Map<number, number>()

    character.adventures.forEach((adventure) => {
      const uniqueAllyIds = new Set((adventure.allies ?? []).map((ally) => ally.id))

      uniqueAllyIds.forEach((allyId) => {
        map.set(allyId, (map.get(allyId) ?? 0) + 1)
      })
    })

    return map
  }, [character.adventures])

  const allyAdventureEntriesMap = useMemo(() => {
    const map = new Map<number, { title: string; date: string }[]>()

    sortedAdventures.forEach((adventure) => {
      const uniqueAllies = new Set((adventure.allies ?? []).map((ally) => ally.id))
      const adventureTitle = adventure.title?.trim() || 'Adventure'
      const adventureDate = format(new Date(adventure.start_date), 'dd.MM.yyyy')

      uniqueAllies.forEach((allyId) => {
        const entries = map.get(allyId) ?? []
        entries.push({
          title: adventureTitle,
          date: adventureDate,
        })
        map.set(allyId, entries)
      })
    })

    return map
  }, [sortedAdventures])

  const sortedAllies = useMemo(() => {
    const direction = allySortDir === 'desc' ? -1 : 1

    return [...character.allies].sort((a, b) => {
      if (allySortBy === 'name') {
        const nameDiff = getAllyDisplayName(a).localeCompare(getAllyDisplayName(b))
        if (nameDiff !== 0) {
          return nameDiff * direction
        }
      } else if (allySortBy === 'owner') {
        const ownerDiff = getAllyOwnerName(a).localeCompare(getAllyOwnerName(b))
        if (ownerDiff !== 0) {
          return ownerDiff * direction
        }
      } else if (allySortBy === 'shared_adventures') {
        const sharedAdventureDiff = (allyAdventureCountMap.get(a.id) ?? 0) - (allyAdventureCountMap.get(b.id) ?? 0)
        if (sharedAdventureDiff !== 0) {
          return sharedAdventureDiff * direction
        }
      } else {
        const ratingDiff = (a.rating ?? 3) - (b.rating ?? 3)
        if (ratingDiff !== 0) {
          return ratingDiff * direction
        }
      }

      return getAllyDisplayName(a).localeCompare(getAllyDisplayName(b))
    })
  }, [allyAdventureCountMap, allySortBy, allySortDir, character.allies])

  const setAllySort = (sortBy: 'standing' | 'shared_adventures' | 'name' | 'owner') => {
    if (allySortBy === sortBy) {
      setAllySortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
      return
    }

    setAllySortBy(sortBy)
    setAllySortDir(sortBy === 'name' || sortBy === 'owner' ? 'asc' : 'desc')
  }

  const adventureTotalDuration = useMemo(
    () => character.adventures.filter((adv) => !adv.is_pseudo).reduce((total, adv) => total + adv.duration, 0),
    [character.adventures],
  )
  const downtimeTotalDuration = useMemo(
    () => character.downtimes.reduce((total, dt) => total + dt.duration, 0),
    [character.downtimes],
  )
  const factionDowntimeDuration = useMemo(() => calculateFactionDowntime(character), [character])
  const otherDowntimeDuration = useMemo(() => calculateOtherDowntime(character), [character])
  const factionLevel = useMemo(() => character.faction_rank ?? calculateFactionLevel(character), [character])
  const remainingDowntimeDuration = useMemo(() => Math.max(0, calculateRemainingDowntime(character)), [character])
  const totalDowntimeDuration = downtimeTotalDuration + remainingDowntimeDuration
  const usesManualDerivedValues = usesManualLevelTracking(character)
  const pseudoAdventureCount = useMemo(
    () => character.adventures.filter((adventure) => Boolean(adventure.is_pseudo)).length,
    [character.adventures],
  )
  const realAdventureCount = character.adventures.length - pseudoAdventureCount
  const manualAdventuresCount = character.manual_adventures_count ?? null
  const manualFactionRank = character.manual_faction_rank ?? null
  const totalDowntimeDisplay = secondsToHourMinuteString(totalDowntimeDuration)
  const remainingDowntimeDisplay = secondsToHourMinuteString(remainingDowntimeDuration)
  const adventuresDisabledReason = t('characters.adventuresSimpleModeBlocked')
  const factionLevelWarningReason = t('characters.factionSimpleModeBlocked')
  const submissionRequiredReason = t('characters.submissionRequired')
  const statusIcon = guildStatus === 'approved'
    ? <CheckCircle2 size={12} />
    : guildStatus === 'declined'
      ? <XCircle size={12} />
      : guildStatus === 'needs_changes'
        ? <AlertTriangle size={12} />
        : guildStatus === 'retired'
          ? <Archive size={12} />
          : guildStatus === 'draft'
            ? <Pencil size={12} />
            : <Clock size={12} />
  const statusClass = guildStatus === 'approved'
    ? 'text-success'
    : guildStatus === 'declined'
      ? 'text-error'
      : guildStatus === 'needs_changes' || guildStatus === 'pending'
        ? 'text-warning'
        : 'text-base-content/60'

  const handleAdventureDelete = (adventureId: number) => {
    if (!window.confirm(t('characters.deleteAdventureConfirm'))) return
    router.delete(route('adventures.destroy', { adventure: adventureId }), {
      preserveScroll: true,
    })
    setActiveAdventureModalId((current) => (current === adventureId ? null : current))
  }

  const handleDowntimeDelete = (downtimeId: number) => {
    if (!window.confirm(t('characters.deleteDowntimeConfirm'))) return
    router.delete(route('downtimes.destroy', { downtime: downtimeId }), {
      preserveScroll: true,
    })
    setActiveDowntimeModalId((current) => (current === downtimeId ? null : current))
  }

  const openNotes = (title: string, notes: string) => {
    setActiveNotes({ title, notes })
  }

  return (
    <AppLayout>
      <Head title={t('characters.detailsPageTitle', { name: character.name })} />
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Modal isOpen={Boolean(activeNotes)} onClose={() => setActiveNotes(null)}>
          <ModalTitle>{activeNotes?.title || t('characters.noteTitle')}</ModalTitle>
          <ModalContent>
            <p className="whitespace-pre-wrap text-sm text-base-content/80">
              {activeNotes?.notes || ''}
            </p>
          </ModalContent>
        </Modal>
        <div className="space-y-2 border-b border-base-200 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold sm:text-2xl">{t('characters.detailsHeading', { name: character.name })}</h1>
            <Link href={route(isReadOnly ? 'characters.deleted' : 'characters.index')} className="btn btn-sm">
              {t('characters.back')}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-ghost badge-sm">{character.adventures.length} {t('characters.adventures')}</span>
            <span className="badge badge-ghost badge-sm">{character.downtimes.length} Downtimes</span>
            <span className="badge badge-ghost badge-sm">{character.allies.length} {t('characters.allies')}</span>
          </div>
        </div>
        <div className="rounded-box border border-base-200 bg-base-100 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full border border-base-200 bg-base-100 px-2 py-0.5 text-xs', statusClass)}>
                  {statusIcon}
                  <span>{getStatusLabel(guildStatus)}</span>
                </span>
              </div>
              <p className="truncate text-lg font-semibold leading-tight">{character.name}</p>
              <div className="flex items-center gap-1 text-sm text-base-content/70">
                <LogoTier tier={tier} width={12} />
                <span>{t('characters.levelLabel')} {level} {classString}</span>
              </div>
              {statusSummary ? <p className="text-xs text-base-content/70">{statusSummary}</p> : null}
              <div className="space-y-1">
                <Progress className="h-2 w-full" value={progressValue} max={progressMax} />
                <p className="flex items-center justify-end gap-1 text-xs text-base-content/70">
                  <span className="font-semibold">{progressValue}/{progressMax}</span>
                  <Droplets size={13} />
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <CharacterPortrait character={character} className="h-20 w-20 sm:h-24 sm:w-24" masked={avatarMasked} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <InfoBox>
              <InfoBoxTitle>
                <Swords size={15} /> {t('characters.adventures')}
              </InfoBoxTitle>
              <InfoBoxLine>
                {t('characters.played')}:{' '}
                {usesManualDerivedValues ? (
                  <span className="inline-flex items-center gap-1 leading-none align-middle">
                    <span className={manualAdventuresCount === null ? 'text-warning' : ''}>
                      {manualAdventuresCount ?? t('characters.autoDisabledShort')}
                    </span>
                    <CharacterManualOverrideModal character={character} field="adventures" value={manualAdventuresCount}>
                      <Button
                        size="xs"
                        variant="ghost"
                        modifier="square"
                        className="h-3.5 min-h-0 w-3.5 p-0 leading-none text-base-content/45 align-middle"
                        aria-label={t('characters.manualAdventuresCountLabel')}
                        title={adventuresDisabledReason}
                      >
                        <Pencil size={10} />
                      </Button>
                    </CharacterManualOverrideModal>
                  </span>
                ) : (
                  realAdventureCount
                )}
              </InfoBoxLine>
              <InfoBoxLine>
                {t('characters.startedIn')}: <LogoTier width={13} tier={character.start_tier} />
              </InfoBoxLine>
              {!character.is_filler && (
                <InfoBoxLine>
                  {t('characters.bubbleShop')}: {character.bubble_shop_spend}
                  <Droplets size={13} />
                </InfoBoxLine>
              )}
            </InfoBox>
            <InfoBox>
              <InfoBoxTitle>
                <Anvil size={15} /> {t('characters.factions')}
              </InfoBoxTitle>
              <InfoBoxLine className="capitalize">{character.faction}</InfoBoxLine>
              <InfoBoxLine>
                {t('characters.levelLabel')}:{' '}
                {usesManualDerivedValues ? (
                  <span className="inline-flex items-center gap-1 leading-none align-middle">
                    <span className={manualFactionRank === null ? 'text-warning' : ''}>
                      {manualFactionRank ?? t('characters.autoDisabledShort')}
                    </span>
                    <CharacterManualOverrideModal character={character} field="factionRank" value={manualFactionRank}>
                      <Button
                        size="xs"
                        variant="ghost"
                        modifier="square"
                        className="h-3.5 min-h-0 w-3.5 p-0 leading-none text-base-content/45 align-middle"
                        aria-label={t('characters.manualFactionRankLabel')}
                        title={factionLevelWarningReason}
                      >
                        <Pencil size={10} />
                      </Button>
                    </CharacterManualOverrideModal>
                  </span>
                ) : (
                  factionLevel
                )}
              </InfoBoxLine>
            </InfoBox>
            <InfoBox>
              <InfoBoxTitle>
                <FlameKindling size={15} /> {t('characters.downtime')}
              </InfoBoxTitle>
              <InfoBoxLine>
                {t('characters.total')}:{' '}
                {totalDowntimeDisplay}
              </InfoBoxLine>
              <InfoBoxLine>Faction: {secondsToHourMinuteString(factionDowntimeDuration)}</InfoBoxLine>
              <InfoBoxLine>{t('characters.other')}: {secondsToHourMinuteString(otherDowntimeDuration)}</InfoBoxLine>
              <InfoBoxLine className="font-semibold">
                {t('characters.remaining')}:{' '}
                {remainingDowntimeDisplay}
              </InfoBoxLine>
            </InfoBox>
            {!character.is_filler && (
              <InfoBox>
                <InfoBoxTitle>
                  <Crown size={15} /> {t('characters.gameMaster')}
                </InfoBoxTitle>
                <InfoBoxLine>
                  {t('characters.bubbles')}: {character.dm_bubbles}
                  <Droplets size={13} />
                </InfoBoxLine>
                <InfoBoxLine>
                  {t('characters.coins')}: {character.dm_coins}
                  <Coins size={13} />
                </InfoBoxLine>
              </InfoBox>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-box border border-base-200 bg-base-100">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                onClick={() =>
                  startAdventuresTransition(() => setAdventuresOpen((current) => !current))
                }
                aria-expanded={adventuresOpen}
                disabled={character.adventures.length === 0}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {adventuresOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {isAdventuresPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">Adventures</h2>
                    <p className="text-xs text-base-content/60">
                      {character.adventures.length === 0
                        ? t('characters.noAdventuresRecorded')
                        : t('characters.entriesTotal', {
                            count: character.adventures.length,
                            duration: secondsToHourMinuteString(adventureTotalDuration),
                          })}
                    </p>
                  </div>
                </div>
              </button>
              {!isReadOnly ? (
                requiresSubmissionBeforeDowntime ? (
                  <div
                    className="tooltip tooltip-left shrink-0"
                    data-tip={submissionRequiredReason}
                    aria-label={submissionRequiredReason}
                  >
                    <Button
                      size="sm"
                      className="shrink-0 gap-1"
                      disabled
                      aria-label={simplifiedTracking ? t('characters.setLevel') : t('characters.addAdventureDisabled')}
                    >
                      {simplifiedTracking ? <Gauge size={14} /> : <Swords size={14} />}
                      <span className="hidden sm:inline">{simplifiedTracking ? t('characters.setLevel') : t('characters.addAdventure')}</span>
                    </Button>
                  </div>
                ) : simplifiedTracking ? (
                  <SetCharacterLevelModal
                    character={character}
                    triggerClassName="shrink-0 gap-1 px-2 sm:px-3"
                    showLabel
                    labelClassName="hidden sm:inline"
                  />
                ) : (
                  <StoreAdventureModal
                    character={character}
                    guildCharacters={guildCharacters}
                    triggerClassName="shrink-0 gap-1 px-2 sm:px-3"
                    showLabel
                    labelClassName="hidden sm:inline"
                  />
                )
              ) : null}
            </div>
            {adventuresOpen ? (
              <div className="border-t border-base-200 px-4 pb-4 pt-2">
                {character.adventures.length > 0 ? (
                  <>
                    <div className="flex justify-end pb-2 md:hidden">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="cursor-pointer transition-colors hover:text-base-content"
                        onClick={() =>
                          setAdventureSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                        }
                      >
                        {t('characters.date')}
                        {adventureSortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </Button>
                    </div>
                      <List className="md:hidden shadow-none">
                        {sortedAdventures.map((adv) => {
                          const notes = adventureNotesMap.get(adv.id) ?? ''
                          const participantSummary = adventureParticipantMap.get(adv.id) ?? ''
                          const gameMasterName = adv.game_master?.trim() || '-'
                          const adventureTitle = adv.title || 'Adventure'
                          const pseudoBubblesInLevel =
                            adv.is_pseudo && adv.target_bubbles != null && adv.target_level != null
                              ? adv.target_bubbles - bubblesRequiredForLevel(adv.target_level)
                              : 0
                          const pseudoAnchorLabel = adv.is_pseudo && adv.target_level ? (
                            <>
                              {t('characters.levelTrackingAnchorWithLevel', { level: adv.target_level })}
                              {pseudoBubblesInLevel > 0 && (
                                <span className="ml-1 inline-flex items-center gap-0.5 opacity-60">(+{pseudoBubblesInLevel} <Droplets size={11} />)</span>
                              )}
                            </>
                          ) : t('characters.levelTrackingAnchor')
                          const isSuperseded = supersededAdventureIds.has(adv.id)
                          return (
                            <ListRow key={adv.id} className="block">
                            <div className={`space-y-3 rounded-box border bg-base-100 p-3.5 ${isSuperseded ? 'border-base-200 opacity-50' : 'border-base-200'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-1">
                                    <h3 className="min-w-0 truncate text-sm font-medium">{adventureTitle}</h3>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="ghost"
                                      modifier="square"
                                      aria-label={t('characters.showAdventureNotes')}
                                      title={notes ? t('characters.showAdventureNotes') : t('characters.noNotes')}
                                      disabled={!notes}
                                      onClick={() => openNotes(`${adventureTitle} Notes`, notes)}
                                    >
                                      <ScrollText size={14} />
                                    </Button>
                                  </div>
                                  {participantSummary ? (
                                    <p className="text-xs text-base-content/50">{t('characters.playedWith')}: {participantSummary}</p>
                                  ) : null}
                                  <p className="text-xs text-base-content/50">DM: {gameMasterName}</p>
                                  {isSuperseded && (
                                    <p className="mt-0.5 text-xs text-base-content/40 italic">{t('characters.supersededByPseudo')}</p>
                                  )}
                                </div>
                                <span className="badge badge-ghost badge-sm shrink-0 font-normal">
                                  {format(new Date(adv.start_date), 'dd.MM.yyyy')}
                                </span>
                              </div>
                                <div className="flex items-center justify-between gap-2 border-t border-base-200 pt-2">
                                <span className="badge badge-ghost badge-sm font-medium">
                                  {adv.is_pseudo ? pseudoAnchorLabel : secondsToHourMinuteString(adv.duration)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {adv.is_pseudo ? (
                                    <span className="text-xs text-base-content/50">{t('characters.auto')}</span>
                                  ) : !isReadOnly ? (
                                    <>
                                      <UpdateAdventureModal
                                        adventure={adv}
                                        allies={character.allies}
                                        guildCharacters={guildCharacters}
                                        isOpen={activeAdventureModalId === adv.id}
                                        onClose={() => setActiveAdventureModalId(null)}
                                        showTrigger={false}
                                      />
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        aria-label={t('characters.editAdventure')}
                                        title={t('characters.editAdventure')}
                                        onClick={() => setActiveAdventureModalId(adv.id)}
                                      >
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        color="error"
                                        aria-label={t('characters.deleteAdventure')}
                                        title={t('characters.deleteAdventure')}
                                        onClick={() => handleAdventureDelete(adv.id)}
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </>
                                  ) : null
                                  }
                                </div>
                              </div>
                            </div>
                          </ListRow>
                        )
                      })}
                    </List>
                    <div className="hidden md:block overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[minmax(0,1fr)_96px_110px_92px] gap-4 px-2 pb-2 text-xs font-semibold text-base-content/50">
                          <span>{t('characters.adventure')}</span>
                          <span className="text-right">{t('characters.time')}</span>
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center justify-end gap-1 text-right transition-colors hover:text-base-content"
                            onClick={() =>
                              setAdventureSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                            }
                          >
                            {t('characters.date')}
                            {adventureSortDir === 'desc'
                              ? <ChevronDown size={12} />
                              : <ChevronUp size={12} />}
                          </button>
                          <span className="text-right">{t('characters.actions')}</span>
                        </div>
                          <List className="shadow-none">
                            {sortedAdventures.map((adv) => {
                              const notes = adventureNotesMap.get(adv.id) ?? ''
                              const participantSummary = adventureParticipantMap.get(adv.id) ?? ''
                              const gameMasterName = adv.game_master?.trim() || '-'
                              const adventureTitle = adv.title || 'Adventure'
                              const pseudoBubblesInLevel =
                                adv.is_pseudo && adv.target_bubbles != null && adv.target_level != null
                                  ? adv.target_bubbles - bubblesRequiredForLevel(adv.target_level)
                                  : 0
                              const pseudoAnchorLabel = adv.is_pseudo && adv.target_level ? (
                                <>
                                  {t('characters.levelTrackingAnchorWithLevel', { level: adv.target_level })}
                                  {pseudoBubblesInLevel > 0 && (
                                    <span className="ml-1 inline-flex items-center gap-0.5 opacity-60">(+{pseudoBubblesInLevel} <Droplets size={11} />)</span>
                                  )}
                                </>
                              ) : t('characters.levelTrackingAnchor')
                              const isSuperseded = supersededAdventureIds.has(adv.id)
                              return (
                              <ListRow
                                key={adv.id}
                                className={`grid w-full grid-cols-[minmax(0,1fr)_96px_110px_92px] !items-start gap-4 ${isSuperseded ? 'opacity-50' : ''}`}
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex min-w-0 items-center gap-1">
                                      <h3 className="min-w-0 truncate text-sm font-medium">
                                        {adventureTitle}
                                      </h3>
                                      <Button
                                      type="button"
                                      size="xs"
                                      variant="ghost"
                                      modifier="square"
                                      aria-label={t('characters.showAdventureNotes')}
                                      title={notes ? t('characters.showAdventureNotes') : t('characters.noNotes')}
                                      disabled={!notes}
                                      onClick={() => openNotes(`${adventureTitle} Notes`, notes)}
                                    >
                                        <ScrollText size={14} />
                                      </Button>
                                    </div>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                                    <span>DM: {gameMasterName}</span>
                                    {participantSummary ? <span>{t('characters.playedWith')}: {participantSummary}</span> : null}
                                    {isSuperseded && (
                                      <span className="italic text-base-content/40">{t('characters.supersededByPseudo')}</span>
                                    )}
                                  </div>
                                </div>
                                <p className="self-center text-right text-xs font-medium">
                                  {adv.is_pseudo ? pseudoAnchorLabel : secondsToHourMinuteString(adv.duration)}
                                </p>
                                <div className="self-center text-right text-xs text-base-content/70">
                                  {format(new Date(adv.start_date), 'dd.MM.yyyy')}
                                </div>
                                <div className="flex self-center justify-end gap-2">
                                  {adv.is_pseudo ? (
                                    <span className="text-xs text-base-content/50">{t('characters.auto')}</span>
                                  ) : !isReadOnly ? (
                                    <>
                                      <UpdateAdventureModal
                                        adventure={adv}
                                        allies={character.allies}
                                        guildCharacters={guildCharacters}
                                        isOpen={activeAdventureModalId === adv.id}
                                        onClose={() => setActiveAdventureModalId(null)}
                                        showTrigger={false}
                                      />
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        aria-label={t('characters.editAdventure')}
                                        title={t('characters.editAdventure')}
                                        onClick={() => setActiveAdventureModalId(adv.id)}
                                      >
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        color="error"
                                        aria-label={t('characters.deleteAdventure')}
                                        title={t('characters.deleteAdventure')}
                                        onClick={() => handleAdventureDelete(adv.id)}
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </>
                                  ) : null
                                  }
                                </div>
                              </ListRow>
                            )
                          })}
                        </List>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">{t('characters.noAdventuresShort')}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="rounded-box border border-base-200 bg-base-100">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                onClick={() =>
                  startDowntimesTransition(() => setDowntimesOpen((current) => !current))
                }
                aria-expanded={downtimesOpen}
                disabled={character.downtimes.length === 0}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {downtimesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {isDowntimesPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">Downtimes</h2>
                    <p className="text-xs text-base-content/60">
                      {character.downtimes.length === 0
                        ? t('characters.noDowntimesRecorded')
                        : t('characters.downtimeEntriesTotal', {
                            count: character.downtimes.length,
                            total: totalDowntimeDisplay,
                            used: secondsToHourMinuteString(downtimeTotalDuration),
                            remaining: remainingDowntimeDisplay,
                          })}
                    </p>
                  </div>
                </div>
              </button>
              {!isReadOnly ? (
                requiresSubmissionBeforeDowntime ? (
                  <div
                    className="tooltip tooltip-left shrink-0"
                    data-tip={submissionRequiredReason}
                    aria-label={submissionRequiredReason}
                  >
                    <Button
                      size="sm"
                      className="shrink-0 gap-1"
                      disabled
                      aria-label={t('characters.addDowntimeDisabled')}
                    >
                      <FlameKindling size={14} />
                      <span className="hidden sm:inline">{t('characters.addDowntime')}</span>
                    </Button>
                  </div>
                ) : canLogActivity ? (
                  <StoreDowntimeModal
                    character={character}
                    triggerClassName="shrink-0 gap-1 px-2 sm:px-3"
                    showLabel
                    labelClassName="hidden sm:inline"
                  />
                ) : null
              ) : null}
            </div>
            {downtimesOpen ? (
              <div className="border-t border-base-200 px-4 pb-4 pt-2">
                {character.downtimes.length > 0 ? (
                  <>
                    <div className="flex justify-end pb-2 md:hidden">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="cursor-pointer transition-colors hover:text-base-content"
                        onClick={() =>
                          setDowntimeSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                        }
                      >
                        {t('characters.date')}
                        {downtimeSortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </Button>
                    </div>
                    <List className="md:hidden shadow-none">
                      {sortedDowntimes.map((dt) => {
                        const notes = downtimeNotesMap.get(dt.id) ?? ''
                        return (
                          <ListRow key={dt.id} className="block">
                            <div className="space-y-3 rounded-box border border-base-200 bg-base-100 p-3.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-1">
                                  <h3 className="truncate text-sm font-medium capitalize">{dt.type}</h3>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="ghost"
                                    modifier="square"
                                    aria-label={t('characters.showDowntimeNotes')}
                                    title={notes ? t('characters.showDowntimeNotes') : t('characters.noNotes')}
                                    disabled={!notes}
                                    onClick={() => openNotes(`${dt.type} Downtime Notes`, notes)}
                                  >
                                    <ScrollText size={14} />
                                  </Button>
                                </div>
                                <span className="badge badge-ghost badge-sm shrink-0 font-normal">
                                  {format(new Date(dt.start_date), 'dd.MM.yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 border-t border-base-200 pt-2">
                                <span className="badge badge-ghost badge-sm font-medium">
                                  {secondsToHourMinuteString(dt.duration)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {!isReadOnly ? (
                                    <>
                                      <UpdateDowntimeModal
                                        downtime={dt}
                                        isOpen={activeDowntimeModalId === dt.id}
                                        onClose={() => setActiveDowntimeModalId(null)}
                                        showTrigger={false}
                                      />
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        aria-label={t('characters.editDowntime')}
                                        title={t('characters.editDowntime')}
                                        onClick={() => setActiveDowntimeModalId(dt.id)}
                                      >
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        color="error"
                                        aria-label={t('characters.deleteDowntime')}
                                        title={t('characters.deleteDowntime')}
                                        onClick={() => handleDowntimeDelete(dt.id)}
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </ListRow>
                        )
                      })}
                    </List>
                    <div className="hidden md:block overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[minmax(0,1fr)_96px_110px_92px] gap-4 px-2 pb-2 text-xs font-semibold text-base-content/50">
                          <span>{t('characters.type')}</span>
                          <span className="text-right">{t('characters.time')}</span>
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center justify-end gap-1 text-right transition-colors hover:text-base-content"
                            onClick={() =>
                              setDowntimeSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                            }
                          >
                            {t('characters.date')}
                            {downtimeSortDir === 'desc'
                              ? <ChevronDown size={12} />
                              : <ChevronUp size={12} />}
                          </button>
                          <span className="text-right">{t('characters.actions')}</span>
                        </div>
                        <List className="shadow-none">
                          {sortedDowntimes.map((dt) => {
                            const notes = downtimeNotesMap.get(dt.id) ?? ''
                            return (
                              <ListRow
                                key={dt.id}
                                className="grid w-full grid-cols-[minmax(0,1fr)_96px_110px_92px] !items-start gap-4"
                              >
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-1">
                                    <h3 className="truncate text-sm font-medium capitalize">{dt.type}</h3>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="ghost"
                                      modifier="square"
                                      aria-label={t('characters.showDowntimeNotes')}
                                      title={notes ? t('characters.showDowntimeNotes') : t('characters.noNotes')}
                                      disabled={!notes}
                                      onClick={() => openNotes(`${dt.type} Downtime Notes`, notes)}
                                    >
                                      <ScrollText size={14} />
                                    </Button>
                                  </div>
                                </div>
                                <p className="self-center text-right text-xs font-medium">
                                  {secondsToHourMinuteString(dt.duration)}
                                </p>
                                <div className="self-center text-right text-xs text-base-content/70">
                                  {format(new Date(dt.start_date), 'dd.MM.yyyy')}
                                </div>
                                <div className="flex self-center justify-end gap-2">
                                  {!isReadOnly ? (
                                    <>
                                      <UpdateDowntimeModal
                                        downtime={dt}
                                        isOpen={activeDowntimeModalId === dt.id}
                                        onClose={() => setActiveDowntimeModalId(null)}
                                        showTrigger={false}
                                      />
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        aria-label={t('characters.editDowntime')}
                                        title={t('characters.editDowntime')}
                                        onClick={() => setActiveDowntimeModalId(dt.id)}
                                      >
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        color="error"
                                        aria-label={t('characters.deleteDowntime')}
                                        title={t('characters.deleteDowntime')}
                                        onClick={() => handleDowntimeDelete(dt.id)}
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </ListRow>
                            )
                          })}
                        </List>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">{t('characters.noDowntimesShort')}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="rounded-box border border-base-200 bg-base-100">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                onClick={() =>
                  startAlliesTransition(() => setAlliesOpen((current) => !current))
                }
                aria-expanded={alliesOpen}
                disabled={character.allies.length === 0}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {alliesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {isAlliesPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{t('characters.allies')}</h2>
                    <p className="text-xs text-base-content/60">
                      {character.allies.length === 0
                        ? t('characters.noAlliesRecorded')
                        : t('characters.alliesCount', { count: character.allies.length })}
                    </p>
                  </div>
                </div>
              </button>
              {!isReadOnly ? (
                <AlliesModal
                  character={character}
                  guildCharacters={guildCharacters}
                  triggerClassName="shrink-0 gap-1 px-2 sm:px-3"
                  showLabel
                  labelClassName="hidden sm:inline"
                />
              ) : null}
            </div>
            {alliesOpen ? (
              <div className="border-t border-base-200 px-4 pb-4 pt-2">
                {character.allies.length > 0 ? (
                  <>
                    <div className="flex flex-wrap justify-end gap-1 pb-2 md:hidden">
                      <Button
                        type="button"
                        size="xs"
                        variant={allySortBy === 'name' ? 'outline' : 'ghost'}
                        onClick={() => setAllySort('name')}
                      >
                        {t('characters.name')}
                        {allySortBy === 'name'
                          ? allySortDir === 'desc'
                            ? <ChevronDown size={12} />
                            : <ChevronUp size={12} />
                          : null}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={allySortBy === 'owner' ? 'outline' : 'ghost'}
                        onClick={() => setAllySort('owner')}
                      >
                        {t('characters.owner')}
                        {allySortBy === 'owner'
                          ? allySortDir === 'desc'
                            ? <ChevronDown size={12} />
                            : <ChevronUp size={12} />
                          : null}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={allySortBy === 'standing' ? 'outline' : 'ghost'}
                        onClick={() => setAllySort('standing')}
                      >
                        {t('characters.standing')}
                        {allySortBy === 'standing'
                          ? allySortDir === 'desc'
                            ? <ChevronDown size={12} />
                            : <ChevronUp size={12} />
                          : null}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={allySortBy === 'shared_adventures' ? 'outline' : 'ghost'}
                        onClick={() => setAllySort('shared_adventures')}
                      >
                        {t('characters.sharedAdventuresShort')}
                        {allySortBy === 'shared_adventures'
                          ? allySortDir === 'desc'
                            ? <ChevronDown size={12} />
                            : <ChevronUp size={12} />
                          : null}
                      </Button>
                    </div>
                    <List className="md:hidden shadow-none">
                      {sortedAllies.map((ally) => {
                        const sharedAdventureCount = allyAdventureCountMap.get(ally.id) ?? 0
                        const sharedAdventureEntries = allyAdventureEntriesMap.get(ally.id) ?? []
                        const deletedLinked = isDeletedLinkedAlly(ally)

                        return (
                          <ListRow key={ally.id} className="block">
                            <div className="space-y-3 rounded-box border border-base-200 bg-base-100 p-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <AllyPortrait ally={ally} className="h-10 w-10" />
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-sm font-medium">{getAllyDisplayName(ally)}</span>
                                    <span className="text-base-content/50 inline-flex items-center gap-1 rounded-full border border-base-200 px-2 py-0.5 text-[10px] uppercase">
                                      {deletedLinked ? t('characters.linkedDeleted') : ally.linked_character_id ? t('characters.linked') : t('characters.custom')}
                                    </span>
                                  </div>
                                  {getAllyOwnerName(ally) ? (
                                    <span className="truncate text-xs text-base-content/50">
                                      {t('characters.owner')}: {getAllyOwnerName(ally)}
                                    </span>
                                  ) : deletedLinked ? (
                                    <span className="truncate text-xs text-base-content/50">
                                      {t('characters.allyDeletedLinkedCharacter')}
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="inline-flex w-fit cursor-pointer items-center gap-1 text-xs text-base-content/60 transition-colors hover:text-base-content"
                                    onClick={() =>
                                      setActiveAllyMeetings({
                                        allyName: getAllyDisplayName(ally),
                                        entries: sharedAdventureEntries,
                                      })
                                    }
                                  >
                                    <Handshake size={12} className="text-base-content/45" />
                                    {t('characters.allySharedAdventures', { count: sharedAdventureCount })}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-3 border-t border-base-200 pt-2">
                                <RatingHearts rating={ally.rating} />
                                <span className="truncate text-xs text-base-content/70">
                                  {t('characters.classesLabel')}: {ally.classes || '-'}
                                </span>
                              </div>
                            </div>
                          </ListRow>
                        )
                      })}
                    </List>
                    <div className="hidden md:block overflow-x-auto">
                      <div className="min-w-[680px]">
                        <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1.1fr)_104px_60px] gap-3 px-2 pb-2 text-xs font-semibold text-base-content/50">
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1 text-left transition-colors hover:text-base-content"
                            onClick={() => setAllySort('name')}
                          >
                            {t('characters.name')}
                            {allySortBy === 'name'
                              ? allySortDir === 'desc'
                                ? <ChevronDown size={12} />
                                : <ChevronUp size={12} />
                              : null}
                          </button>
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1 text-left transition-colors hover:text-base-content"
                            onClick={() => setAllySort('owner')}
                          >
                            {t('characters.owner')}
                            {allySortBy === 'owner'
                              ? allySortDir === 'desc'
                                ? <ChevronDown size={12} />
                                : <ChevronUp size={12} />
                              : null}
                          </button>
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1 text-left transition-colors hover:text-base-content"
                            onClick={() => setAllySort('standing')}
                          >
                            {t('characters.standing')}
                            {allySortBy === 'standing'
                              ? allySortDir === 'desc'
                                ? <ChevronDown size={12} />
                                : <ChevronUp size={12} />
                              : null}
                          </button>
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center justify-center gap-1 text-center transition-colors hover:text-base-content"
                            onClick={() => setAllySort('shared_adventures')}
                          >
                            {t('characters.sharedAdventuresShort')}
                            {allySortBy === 'shared_adventures'
                              ? allySortDir === 'desc'
                                ? <ChevronDown size={12} />
                                : <ChevronUp size={12} />
                              : null}
                          </button>
                        </div>
                        <List className="shadow-none">
                          {sortedAllies.map((ally) => {
                            const sharedAdventureCount = allyAdventureCountMap.get(ally.id) ?? 0
                            const sharedAdventureEntries = allyAdventureEntriesMap.get(ally.id) ?? []
                            const deletedLinked = isDeletedLinkedAlly(ally)

                            return (
                              <ListRow
                                key={ally.id}
                                className="grid w-full grid-cols-[minmax(0,1.45fr)_minmax(0,1.1fr)_104px_60px] items-center gap-3"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <AllyPortrait ally={ally} className="h-9 w-9" />
                                  <div className="flex min-w-0 flex-col gap-0.5">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="truncate text-sm font-medium">
                                        {getAllyDisplayName(ally)}
                                      </span>
                                      <span className="text-base-content/50 inline-flex items-center gap-1 rounded-full border border-base-200 px-2 py-0.5 text-[10px] uppercase">
                                        {deletedLinked ? t('characters.linkedDeleted') : ally.linked_character_id ? t('characters.linked') : t('characters.custom')}
                                      </span>
                                    </div>
                                    <span className="truncate text-xs text-base-content/50">
                                      {t('characters.classesLabel')}: {ally.classes || '-'}
                                    </span>
                                  </div>
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <span className="block truncate text-sm text-base-content/70">
                                    {getAllyOwnerName(ally) || (deletedLinked ? t('characters.allyDeletedLinkedCharacter') : '-')}
                                  </span>
                                </div>
                                <RatingHearts rating={ally.rating} />
                                <button
                                  type="button"
                                  className="inline-flex cursor-pointer items-center justify-center gap-1 text-sm text-base-content/70 transition-colors hover:text-base-content"
                                  aria-label={t('characters.openAllyMeetings', { name: getAllyDisplayName(ally) })}
                                  onClick={() =>
                                    setActiveAllyMeetings({
                                      allyName: getAllyDisplayName(ally),
                                      entries: sharedAdventureEntries,
                                    })
                                  }
                                >
                                  <span>{sharedAdventureCount}</span>
                                  <Handshake size={12} className="text-base-content/45" />
                                </button>
                              </ListRow>
                            )
                          })}
                        </List>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">{t('characters.noAlliesShort')}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Modal isOpen={activeAllyMeetings !== null} onClose={() => setActiveAllyMeetings(null)}>
        <ModalTitle>
          {activeAllyMeetings
            ? t('characters.allyMeetingsTitle', { name: activeAllyMeetings.allyName })
            : t('characters.sharedAdventuresShort')}
        </ModalTitle>
        <ModalContent>
          {activeAllyMeetings && activeAllyMeetings.entries.length > 0 ? (
            <List className="shadow-none">
              {activeAllyMeetings.entries.map((entry, index) => (
                <ListRow
                  key={`${entry.date}-${entry.title}-${index}`}
                  className="grid w-full grid-cols-[96px_minmax(0,1fr)] items-start gap-3"
                >
                  <span className="text-xs text-base-content/60">{entry.date}</span>
                  <span className="min-w-0 text-sm">{entry.title}</span>
                </ListRow>
              ))}
            </List>
          ) : (
            <p className="text-sm text-base-content/70">{t('characters.noSharedAdventuresRecorded')}</p>
          )}
        </ModalContent>
      </Modal>
    </AppLayout>
  )
}
