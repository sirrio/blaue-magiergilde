import LogoFiller from '@/components/logo-filler'
import LogoTier from '@/components/logo-tier'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { InfoBox, InfoBoxLine, InfoBoxTitle } from '@/components/ui/info-box'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { TextArea } from '@/components/ui/text-area'
import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { calculateBubblesInCurrentLevel } from '@/helper/calculateBubblesInCurrentLevel'
import { calculateClassString } from '@/helper/calculateClassString'
import { calculateFactionDowntime, calculateOtherDowntime } from '@/helper/calculateDowntime'
import { calculateFactionLevel } from '@/helper/calculateFactionLevel'
import { calculateLevel } from '@/helper/calculateLevel'
import { calculateRemainingDowntime } from '@/helper/calculateRemainingDowntime'
import { calculateTier } from '@/helper/calculateTier'
import { calculateTotalBubblesToNextLevel } from '@/helper/calculateTotalBubblesToNextLevel'
import { countsBubbleAdjustmentsForProgression, usesManualLevelTracking } from '@/helper/usesManualLevelTracking'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { AlliesModal } from '@/pages/character/allies-modal'
import DestroyCharacterModal from '@/pages/character/destroy-character-modal'
import StoreAdventureModal from '@/pages/character/store-adventure-modal'
import StoreDowntimeModal from '@/pages/character/store-downtime-modal'
import UpdateCharacterModal from '@/pages/character/update-character-modal'
import CharacterManualOverrideModal from '@/pages/character/character-manual-override-modal'
import SetCharacterLevelModal from '@/pages/character/set-character-level-modal'
import UpgradeCharacterProgressionModal from '@/pages/character/upgrade-character-progression-modal'
import BubbleShopModal from '@/pages/character/bubble-shop-modal'
import { Character } from '@/types'
import { PageProps } from '@/types'
import { router, usePage } from '@inertiajs/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, Anvil, Archive, BookHeart, BookOpen, CheckCircle2, CircleHelp, Clock, Coins, Crown, Download, Droplets, ExternalLink, FlameKindling, Gauge, Grip, MapPin, Pencil, RefreshCcw, Settings, Swords, XCircle } from 'lucide-react'
import React, { useState, useTransition } from 'react'
import { useImage } from 'react-image'

function CharacterImage({
  character,
  className,
  masked = true,
}: {
  character: Character
  className?: string
  masked?: boolean
}) {
  const avatar = String(character.avatar || '').trim()
  const srcList = avatar
    ? [avatar.startsWith('http') ? avatar : `/storage/${avatar}`, '/images/no-avatar.svg']
    : ['/images/no-avatar.svg']
  const { src } = useImage({
    srcList,
  })
  return (
    <img
      className={cn('aspect-square w-full object-cover', masked ? 'rounded-full' : 'rounded-none', className)}
      src={src}
      alt={character.name}
    />
  )
}

function CharacterSettingsModal({
  simplifiedTracking,
  avatarMasked,
  privateMode,
  characterId,
  isTrackingModeUpdating = false,
  isAvatarMaskedUpdating = false,
  isPrivateModeUpdating = false,
  onTrackingModeChange,
  onAvatarMaskedChange,
  onPrivateModeChange,
  triggerVariant = 'ghost',
  triggerSize = 'xs',
  triggerClassName,
}: {
  simplifiedTracking: boolean
  avatarMasked: boolean
  privateMode: boolean
  characterId: number
  isTrackingModeUpdating?: boolean
  isAvatarMaskedUpdating?: boolean
  isPrivateModeUpdating?: boolean
  onTrackingModeChange?: (value: boolean) => void
  onAvatarMaskedChange?: (value: boolean) => void
  onPrivateModeChange?: (value: boolean) => void
  triggerVariant?: 'ghost' | 'outline'
  triggerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  triggerClassName?: string
}) {
  const t = useTranslate()

  const SettingHelp = ({ text, label }: { text: string; label: string }) => (
    <span
      className="inline-flex cursor-help items-center text-base-content/45"
      title={text}
      aria-label={`${label}: ${text}`}
    >
      <CircleHelp size={14} />
    </span>
  )

  return (
    <Modal>
      <ModalTrigger>
        <Button
          size={triggerSize}
          variant={triggerVariant}
          modifier="square"
          className={triggerClassName}
          aria-label={t('characters.characterSettings')}
          title={t('characters.characterSettings')}
        >
          <Settings size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('characters.characterSettings')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <div className={cn('flex items-start justify-between gap-3 text-sm', isTrackingModeUpdating && 'opacity-60')}>
            <span className="flex items-center gap-1.5 pt-1">
              <span>{t('characters.trackingMode')}</span>
              <SettingHelp
                label={t('characters.trackingMode')}
                text={t('characters.trackingModeHelp')}
              />
            </span>
            <div className="join">
              <Button
                type="button"
                size="xs"
                variant={simplifiedTracking ? 'ghost' : 'soft'}
                color={simplifiedTracking ? undefined : 'primary'}
                className="join-item"
                disabled={isTrackingModeUpdating || !onTrackingModeChange || !simplifiedTracking}
                onClick={() => onTrackingModeChange?.(false)}
              >
                {t('characters.adventureTracking')}
              </Button>
              <Button
                type="button"
                size="xs"
                variant={simplifiedTracking ? 'soft' : 'ghost'}
                color={simplifiedTracking ? 'primary' : undefined}
                className="join-item"
                disabled={isTrackingModeUpdating || !onTrackingModeChange || simplifiedTracking}
                onClick={() => onTrackingModeChange?.(true)}
              >
                {t('characters.levelTracking')}
              </Button>
            </div>
          </div>
          <label className={cn('flex items-center justify-between gap-3 text-sm', isAvatarMaskedUpdating && 'opacity-60')}>
            <span className="flex items-center gap-1.5">
              <span>{t('characters.tokenMask')}</span>
              <SettingHelp
                label={t('characters.tokenMask')}
                text={t('characters.tokenMaskHelp')}
              />
            </span>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={avatarMasked}
              disabled={isAvatarMaskedUpdating || !onAvatarMaskedChange}
              onChange={(event) => onAvatarMaskedChange?.(event.target.checked)}
            />
          </label>
          <label className={cn('flex items-center justify-between gap-3 text-sm', isPrivateModeUpdating && 'opacity-60')}>
            <span className="flex items-center gap-1.5">
              <span>{t('characters.privateMode')}</span>
              <SettingHelp
                label={t('characters.privateMode')}
                text={t('characters.privateModeHelp')}
              />
            </span>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={privateMode}
              disabled={isPrivateModeUpdating || !onPrivateModeChange}
              onChange={(event) => onPrivateModeChange?.(event.target.checked)}
            />
          </label>
          <div className="border-t border-base-200 pt-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button as="a" href={route('characters.download', characterId)} size="sm" variant="outline" className="w-full">
                <Download size={14} />
                {t('characters.downloadJson')}
              </Button>
              <Button
                as="a"
                href={route('characters.download', { character: characterId, format: 'pretty' })}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Download size={14} />
                {t('characters.downloadPretty')}
              </Button>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}

function SubmitForApprovalModal({
  character,
  processing,
  onSubmit,
}: {
  character: Character
  processing: boolean
  onSubmit: (registrationNote: string, callbacks: { onSuccess: () => void; onError: (message: string) => void }) => void
}) {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const [registrationNote, setRegistrationNote] = useState(character.registration_note ?? '')
  const [localNotice, setLocalNotice] = useState<{ tone: 'error' | 'success'; message: string } | null>(null)
  const fromLabel = (character.guild_status ?? 'draft') === 'needs_changes' ? 'needs changes' : 'draft'

  return (
    <Modal isOpen={isOpen} onClose={() => !processing && setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="sm"
          color="warning"
          className="w-full justify-center"
          onClick={() => {
            setRegistrationNote(character.registration_note ?? '')
            setLocalNotice(null)
            setIsOpen(true)
          }}
          disabled={processing}
          aria-label={t('characters.registerWithMagiergilde')}
          title={t('characters.registerWithMagiergilde')}
        >
          <Clock size={14} />
          <span>{t('characters.registerWithMagiergilde')}</span>
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('characters.registerTitle')}</ModalTitle>
      <ModalContent>
        {localNotice ? (
          <div className={cn('alert py-2 text-sm', localNotice.tone === 'error' ? 'alert-error alert-soft' : 'alert-success alert-soft')}>
            {localNotice.message}
          </div>
        ) : null}
        <p className="text-sm text-base-content/80">
          {t('characters.registerBody', { name: character.name, from: fromLabel })}
        </p>
        <p className="text-xs text-base-content/60">
          {t('characters.registerReviewHint')}
        </p>
        <TextArea
          value={registrationNote}
          onChange={(event) => setRegistrationNote(event.target.value)}
          placeholder={t('characters.registrationNotesHint')}
        >
          {t('characters.registrationNotes')}
        </TextArea>
        <p className="text-xs text-base-content/60">
          {t('characters.registrationNotesHint')}
        </p>
        <p className="mt-2 text-xs text-base-content/60">
          {t('characters.registerFinalHint')}
        </p>
      </ModalContent>
      <ModalAction
        onClick={() => onSubmit(registrationNote.trim(), {
          onSuccess: () => {
            setLocalNotice({ tone: 'success', message: t('characters.registeredSuccess') })
            setIsOpen(false)
          },
          onError: (message) => {
            setLocalNotice({ tone: 'error', message })
          },
        })}
        disabled={processing}
      >
        {t('characters.registerWithMagiergilde')}
      </ModalAction>
    </Modal>
  )
}

function getCharacterStatusSummary(guildStatus: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (guildStatus === 'draft') {
    return t('characters.statusDraftSummary')
  }

  if (guildStatus === 'pending') {
    return t('characters.statusPendingSummary')
  }

  if (guildStatus === 'needs_changes') {
    return t('characters.statusNeedsChangesSummary')
  }

  if (guildStatus === 'declined') {
    return t('characters.statusDeclinedSummary')
  }

  return ''
}

export function CharacterCard({
  character,
  allCharacters = [],
  guildCharacters = [],
  onTrackingModeChange,
  isTrackingModeUpdating = false,
  onAvatarMaskedChange,
  isAvatarMaskedUpdating = false,
  onPrivateModeChange,
  isPrivateModeUpdating = false,
}: {
  character: Character
  allCharacters?: Character[]
  guildCharacters?: Character[]
  onTrackingModeChange?: (value: boolean) => void
  isTrackingModeUpdating?: boolean
  onAvatarMaskedChange?: (value: boolean) => void
  isAvatarMaskedUpdating?: boolean
  onPrivateModeChange?: (value: boolean) => void
  isPrivateModeUpdating?: boolean
}) {
  const t = useTranslate()
  const { features, activeLevelProgressionVersionId } = usePage<PageProps>().props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: character.id })
  const dragStyle: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition }

  const level = calculateLevel(character)
  const tier = calculateTier(character)
  const simplifiedTracking = character.simplified_tracking ?? false
  const avatarMasked = character.avatar_masked ?? true
  const privateMode = character.private_mode ?? false
  const progressValue = calculateBubblesInCurrentLevel(character)
  const progressMax = calculateTotalBubblesToNextLevel(character)
  const isMaxLevel = level >= 20 || progressMax === 0
  const additionalBubbles = additionalBubblesForStartTier(character.start_tier)
  const earnedBubbles = calculateBubble(character) + additionalBubbles
  const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character)
  const isBubbleOverspent = bubbleAdjustmentsCount && character.bubble_shop_spend > earnedBubbles
  const guildStatus = character.guild_status ?? 'pending'
  const reviewNote = character.review_note?.trim() ?? ''
  const reviewedByName = character.reviewed_by_name?.trim() ?? ''
  const reviewedByHint = reviewedByName ? t('characters.reviewedByHint', { name: reviewedByName }) : ''
  const draftOnlyMode = !(features?.character_status_switch ?? true)
  const requiresRegistration = guildStatus === 'draft' || guildStatus === 'needs_changes'
  const canLogActivity = draftOnlyMode || !requiresRegistration
  const requiresSubmissionBeforeDowntime = !draftOnlyMode && requiresRegistration
  const hasRoom = (character.room_count ?? 0) > 0
  const statusLabel = guildStatus === 'approved'
    ? 'Approved'
    : guildStatus === 'declined'
      ? 'Declined'
      : guildStatus === 'needs_changes'
        ? 'Needs changes'
      : guildStatus === 'retired'
        ? 'Retired'
        : guildStatus === 'draft'
          ? 'Draft'
          : 'Pending'
  const statusIcon = guildStatus === 'approved'
    ? <CheckCircle2 size={14} />
    : guildStatus === 'declined'
      ? <XCircle size={14} />
      : guildStatus === 'needs_changes'
        ? <AlertTriangle size={14} />
      : guildStatus === 'retired'
        ? <Archive size={14} />
        : guildStatus === 'draft'
          ? <Pencil size={14} />
          : <Clock size={14} />
  const statusClass = guildStatus === 'approved'
    ? 'text-success'
    : guildStatus === 'declined'
      ? 'text-error'
      : guildStatus === 'needs_changes'
        ? 'text-warning'
      : guildStatus === 'retired'
        ? 'text-base-content/50'
        : guildStatus === 'draft'
          ? 'text-base-content/60'
          : 'text-warning'
  const statusTooltip = (() => {
    if (guildStatus === 'draft') {
      return t('characters.statusDraftHint')
    }

    if (guildStatus === 'declined') {
      return t('characters.statusDeclinedHint')
    }

    if (guildStatus === 'needs_changes') {
      return t('characters.statusNeedsChangesHint')
    }

    if (guildStatus === 'pending') {
      return t('characters.statusPendingHint')
    }

    if (guildStatus === 'approved' && reviewedByHint) {
      return `${statusLabel} · ${reviewedByHint}`
    }

    return statusLabel
  })()
  const statusHint = getCharacterStatusSummary(guildStatus, t)
  const statusHintClass = guildStatus === 'draft'
    ? 'border-base-300 bg-base-200/50 text-base-content/70'
    : guildStatus === 'pending'
    ? 'border-warning/25 bg-warning/10 text-warning'
    : guildStatus === 'needs_changes'
      ? 'border-warning/30 bg-warning/12 text-warning'
      : guildStatus === 'declined'
        ? 'border-error/25 bg-error/10 text-error'
        : 'border-base-200 bg-base-200/35 text-base-content/75'
  const isStatusSwitchEnabled = features?.character_status_switch ?? true
  const canSubmitForApproval = isStatusSwitchEnabled && requiresRegistration
  const submittedLowAndBaseTierCount = allCharacters.filter((candidate) => {
    if (candidate.id === character.id) return false
    if (candidate.deleted_at) return false
    if (!['approved', 'pending'].includes(candidate.guild_status ?? 'pending')) return false
    if (candidate.is_filler) return false
    return ['bt', 'lt'].includes(calculateTier(candidate))
  }).length
  const submittedHighTierCount = allCharacters.filter((candidate) => {
    if (candidate.id === character.id) return false
    if (candidate.deleted_at) return false
    if (!['approved', 'pending'].includes(candidate.guild_status ?? 'pending')) return false
    if (candidate.is_filler) return false
    return calculateTier(candidate) === 'ht'
  }).length
  const submittedGeneralSlotCount = submittedLowAndBaseTierCount + Math.max(0, submittedHighTierCount - 2)
  const otherSubmittedFillerCount = allCharacters.filter((candidate) => {
    if (candidate.id === character.id) return false
    if (candidate.deleted_at) return false
    if (!['approved', 'pending'].includes(candidate.guild_status ?? 'pending')) return false
    return Boolean(candidate.is_filler)
  }).length
  const candidateGeneralSlotCost = character.is_filler
    ? 0
    : tier === 'ht'
      ? (submittedHighTierCount >= 2 ? 1 : 0)
      : (['bt', 'lt'].includes(tier) ? 1 : 0)
  const submissionBlockedReason = !canSubmitForApproval
    ? null
    : character.is_filler
      ? (otherSubmittedFillerCount >= 1 ? t('characters.submitBlockedFillerLimit') : null)
      : (submittedGeneralSlotCount + candidateGeneralSlotCost > 8 ? t('characters.submitBlockedActiveLimit', { count: 8 }) : null)
  const registrationSupportHint = canSubmitForApproval && !submissionBlockedReason
    ? t(guildStatus === 'needs_changes' ? 'characters.registrationActionHintNeedsChanges' : 'characters.registrationActionHintDraft')
    : ''
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false)
  const [, startNavigationTransition] = useTransition()

  const factionDowntimeSeconds = calculateFactionDowntime(character)
  const otherDowntimeSeconds = calculateOtherDowntime(character)
  const remainingDowntimeSeconds = Math.max(0, calculateRemainingDowntime(character))
  const totalDowntimeSeconds = factionDowntimeSeconds + otherDowntimeSeconds + remainingDowntimeSeconds
  const remainingDowntimeGold = Math.max(0, (remainingDowntimeSeconds / 3600) * 15)
  const remainingDowntimeGoldLabel = Number.isInteger(remainingDowntimeGold)
    ? remainingDowntimeGold.toString()
    : remainingDowntimeGold.toFixed(1).replace(/\.0$/, '')
  const remainingDowntimeTooltip = t('characters.potentialEarnings', { amount: remainingDowntimeGoldLabel })
  const formattedDowntimes = {
    total: secondsToHourMinuteString(totalDowntimeSeconds),
    faction: secondsToHourMinuteString(factionDowntimeSeconds),
    other: secondsToHourMinuteString(otherDowntimeSeconds),
    remaining: secondsToHourMinuteString(remainingDowntimeSeconds),
  }
  const factionLevel = character.faction_rank ?? calculateFactionLevel(character)
  const pseudoAdventureCount = character.adventures.filter((adventure) => Boolean(adventure.is_pseudo)).length
  const realAdventureCount = character.adventures.length - pseudoAdventureCount
  const hasLevelAnchors = pseudoAdventureCount > 0
  const usesManualDerivedValues = usesManualLevelTracking(character)
  const isMixedTrackingHistory = hasLevelAnchors && realAdventureCount > 0
  const trackingModeLabel = simplifiedTracking
    ? t('characters.levelTrackingBadge')
    : t('characters.adventureTrackingBadge')
  const trackingHistoryLabel = isMixedTrackingHistory
    ? t('characters.mixedTrackingHistory')
    : ''
  const trackingSummaryTooltip = isMixedTrackingHistory
    ? t('characters.mixedTrackingHistoryHint')
    : hasLevelAnchors
      ? t('characters.levelAnchorHistoryHint')
      : trackingModeLabel
  const hasProgressionUpgrade = !character.is_filler
    && typeof activeLevelProgressionVersionId === 'number'
    && activeLevelProgressionVersionId > 0
    && (character.progression_version_id ?? activeLevelProgressionVersionId) !== activeLevelProgressionVersionId
  const manualAdventuresCount = character.manual_adventures_count ?? null
  const manualFactionRank = character.manual_faction_rank ?? null
  const totalDowntimeDisplay = formattedDowntimes.total
  const remainingDowntimeDisplay = formattedDowntimes.remaining
  const adventuresDisabledReason = t('characters.adventuresSimpleModeBlocked')
  const submissionRequiredReason = t('characters.submissionRequired')
  const factionLevelWarningReason = t('characters.factionSimpleModeBlocked')

  const submitForApproval = (
    registrationNote: string,
    callbacks: { onSuccess: () => void; onError: (message: string) => void },
  ) => {
    if (isSubmittingForApproval || !canSubmitForApproval) {
      return
    }

    setIsSubmittingForApproval(true)
    startNavigationTransition(() => {
      router.post(
        route('characters.submit-approval', character.id),
        {
          registration_note: registrationNote,
        },
        {
          preserveScroll: true,
          preserveState: true,
          onSuccess: () => {
            callbacks.onSuccess()
          },
          onError: (errors) => {
            const message = String(
              errors.registration_note
              ?? errors.guild_status
              ?? errors.character
              ?? t('characters.registerErrorFallback'),
            )
            callbacks.onError(message)
          },
          onFinish: () => {
            setIsSubmittingForApproval(false)
          },
        },
      )
    })
  }

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <Card className={cn('group')}>
        <CardBody>
          <CardAction className={cn('absolute top-2 right-2 hidden gap-1 md:group-hover:flex')}>
            <CharacterSettingsModal
              simplifiedTracking={simplifiedTracking}
              avatarMasked={avatarMasked}
              privateMode={privateMode}
              characterId={character.id}
              isTrackingModeUpdating={isTrackingModeUpdating}
              isAvatarMaskedUpdating={isAvatarMaskedUpdating}
              isPrivateModeUpdating={isPrivateModeUpdating}
              onTrackingModeChange={onTrackingModeChange}
              onAvatarMaskedChange={onAvatarMaskedChange}
              onPrivateModeChange={onPrivateModeChange}
            />
            <Button
              className="flex"
              size="xs"
              modifier="square"
              aria-label={t('characters.reorderCharacter')}
              title={t('characters.reorderCharacter')}
              {...attributes}
              {...listeners}
            >
              <Grip size={14} />
            </Button>
            <UpdateCharacterModal character={character}>
              <Button
                className="flex"
                size="xs"
                modifier="square"
                aria-label={t('characters.editCharacter')}
                title={t('characters.editCharacter')}
              >
                <Pencil size={14} />
              </Button>
            </UpdateCharacterModal>
            <DestroyCharacterModal character={character}>
              <Button
                className="flex"
                size="xs"
                modifier="square"
                color="error"
                aria-label={t('characters.deleteCharacter')}
                title={t('characters.deleteCharacter')}
              >
                <XCircle size={14} />
              </Button>
            </DestroyCharacterModal>
          </CardAction>
          <CardTitle className={cn('flex items-center gap-2 pb-0 pr-0')}>
            <span
              className={cn('tooltip tooltip-bottom inline-flex items-center', statusClass)}
              data-tip={statusTooltip}
              aria-label={statusTooltip}
            >
              {statusIcon}
            </span>
            <span className="min-w-0 flex-1 truncate">{character.name}</span>
          </CardTitle>
          <CardContent>
            <div className={cn('flex h-5 items-center gap-1 text-xs leading-none')}>
              <LogoTier tier={tier} width={12} />
              <span>
                Level {level} {calculateClassString(character)}
              </span>
              {hasRoom ? (
                <span
                  className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/8 px-1.5 py-0.5 text-[10px] leading-none text-primary/75"
                  title={t('characters.roomAssigned')}
                  aria-label={t('characters.roomAssigned')}
                >
                  <MapPin size={11} />
                </span>
              ) : null}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 md:hidden">
              <CharacterSettingsModal
                simplifiedTracking={simplifiedTracking}
                avatarMasked={avatarMasked}
                privateMode={privateMode}
                characterId={character.id}
                isTrackingModeUpdating={isTrackingModeUpdating}
                isAvatarMaskedUpdating={isAvatarMaskedUpdating}
                isPrivateModeUpdating={isPrivateModeUpdating}
                onTrackingModeChange={onTrackingModeChange}
                onAvatarMaskedChange={onAvatarMaskedChange}
                onPrivateModeChange={onPrivateModeChange}
                triggerVariant="outline"
                triggerSize="sm"
                triggerClassName="w-full justify-center"
              />
              <UpdateCharacterModal character={character}>
                <Button size="sm" variant="outline" className="w-full justify-center" aria-label={t('characters.editCharacter')} title={t('characters.editCharacter')}>
                  <Pencil size={14} />
                </Button>
              </UpdateCharacterModal>
              <DestroyCharacterModal character={character}>
                <Button size="sm" variant="outline" color="error" className="w-full justify-center" aria-label={t('characters.deleteCharacter')} title={t('characters.deleteCharacter')}>
                  <XCircle size={14} />
                </Button>
              </DestroyCharacterModal>
            </div>
            <CharacterImage
              className={cn('mb-2 mt-3 w-full', !avatarMasked && 'rounded-lg')}
              character={character}
              masked={avatarMasked}
            />
            {!character.is_filler ? (
              <>
                <div
                  className="mt-2.5 space-y-0.5"
                  title={trackingSummaryTooltip}
                  aria-label={trackingSummaryTooltip}
                >
                  <div className="flex items-center justify-between gap-2 leading-none">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <span className="rounded-full border border-base-300 bg-base-100 px-1.5 py-0.5 text-[10px] font-medium text-base-content/70">
                        {trackingModeLabel}
                      </span>
                      {trackingHistoryLabel ? (
                        <span className="rounded-full border border-base-300 bg-base-100 px-1.5 py-0.5 text-[10px] font-medium text-base-content/55">
                          {trackingHistoryLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Progress className="block h-2" value={isMaxLevel ? 1 : progressValue} max={isMaxLevel ? 1 : progressMax} />
                  <div className="flex min-h-4 items-center justify-end text-xs text-base-content/55">
                    {isMaxLevel ? (
                      <span className="inline-flex flex-wrap items-center gap-x-1 text-base-content/45">
                        <span className="whitespace-nowrap">{t('characters.maxLevelReached')}</span>
                        {progressValue > 0 ? (
                          <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-base-content/35">
                            (+{progressValue} <Droplets size={10} />)
                          </span>
                        ) : null}
                      </span>
                    ) : isBubbleOverspent ? (
                      <span className="text-error/80">{t('characters.overspentBubbles')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {progressValue}/{progressMax} <Droplets size={11} />
                      </span>
                    )}
                  </div>
                </div>
                {hasProgressionUpgrade ? (
                  <div className="mt-2 rounded-md border border-info/20 bg-info/8 px-2 py-1.5 text-xs text-base-content/75">
                    <div>{t('characters.upgradeLevelCurveNotice')}</div>
                    <UpgradeCharacterProgressionModal
                      character={character}
                      trigger={(
                        <button
                          type="button"
                          className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-info hover:underline"
                        >
                          <RefreshCcw size={11} />
                          <span>{t('characters.upgradeLevelCurveAction')}</span>
                        </button>
                      )}
                    />
                  </div>
                ) : null}
                <div className={cn('mt-3 grid grid-cols-2 gap-1.5')}>
                  <InfoBox>
                    <InfoBoxTitle>
                      <Swords size={15} /> {t('characters.adventures')}
                      {!bubbleAdjustmentsCount ? (
                        <span
                          className="tooltip tooltip-warning tooltip-bottom ml-auto cursor-help text-warning/70"
                          data-tip={t('characters.bubbleShopNotCountedHint')}
                          aria-label={t('characters.bubbleShopNotCountedHint')}
                        >
                          <AlertTriangle size={11} />
                        </span>
                      ) : null}
                    </InfoBoxTitle>
                    <InfoBoxLine>
                      {t('characters.played')}:{' '}
                      {usesManualDerivedValues ? (
                        <span className="inline-flex items-center gap-1 leading-none align-middle">
                          <span className={manualAdventuresCount === null ? 'text-base-content/40' : ''}>
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
                    <InfoBoxLine>
                      {t('characters.bubbleShop')}: {character.bubble_shop_spend}
                      <Droplets size={13} />
                    </InfoBoxLine>
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
                          <span className={manualFactionRank === null ? 'text-base-content/40' : ''}>
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
                    <InfoBoxLine>Faction: {formattedDowntimes.faction}</InfoBoxLine>
                    <InfoBoxLine>{t('characters.other')}: {formattedDowntimes.other}</InfoBoxLine>
                    <div className="tooltip tooltip-info tooltip-bottom w-full" data-tip={remainingDowntimeTooltip} aria-label={remainingDowntimeTooltip}>
                      <InfoBoxLine className="font-semibold cursor-help">
                        {t('characters.remaining')}: {remainingDowntimeDisplay}
                      </InfoBoxLine>
                    </div>
                  </InfoBox>
                  <InfoBox>
                    <InfoBoxTitle>
                      <Crown size={15} /> {t('characters.gameMaster')}
                      {!bubbleAdjustmentsCount ? (
                        <span
                          className="tooltip tooltip-warning tooltip-bottom ml-auto cursor-help text-warning/70"
                          data-tip={t('characters.gmBubblesNotCountedHint')}
                          aria-label={t('characters.gmBubblesNotCountedHint')}
                        >
                          <AlertTriangle size={11} />
                        </span>
                      ) : null}
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
                </div>
              </>
            ) : (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-base-300 px-3 py-2 text-sm text-base-content/60">
                <div className="flex items-center gap-1.5 font-medium text-base-content/70">
                  <LogoFiller /> {t('characters.fillerCharacter')}
                </div>
                <div className="flex items-center gap-1 text-xs text-base-content/55">
                  <Swords size={13} /> {character.adventures.length}
                </div>
              </div>
            )}
            {statusHint || registrationSupportHint || submissionBlockedReason ? (
              <div className="mt-3 space-y-2">
                {statusHint ? (
                  <div className={cn('rounded-md border px-2 py-1.5 text-xs font-medium', statusHintClass)}>
                    {statusHint}
                    {reviewedByHint ? (
                      <span className="ml-1 font-normal opacity-70"> · {reviewedByHint}</span>
                    ) : null}
                  </div>
                ) : null}
                {reviewNote && (guildStatus === 'declined' || guildStatus === 'needs_changes') ? (
                  <div className={cn('rounded-md border px-2 py-1.5 text-xs', statusHintClass, 'font-normal opacity-80')}>
                    <span className="font-medium">{t('common.note')}:</span> {reviewNote}
                  </div>
                ) : null}
                {registrationSupportHint ? (
                  <div className="rounded-md border border-info/20 bg-info/6 px-2 py-1.5 text-xs text-base-content/70">
                    {registrationSupportHint}
                  </div>
                ) : null}
                {submissionBlockedReason ? (
                  <div className="rounded-md border border-warning/25 bg-warning/10 px-2 py-1.5 text-xs text-warning">
                    {submissionBlockedReason}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={cn('mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5 sm:gap-1')}>
              {canSubmitForApproval ? (
                <div className="col-span-2 sm:col-span-4">
                  {submissionBlockedReason ? (
                    <div
                      className="tooltip tooltip-bottom w-full"
                      data-tip={submissionBlockedReason}
                      aria-label={submissionBlockedReason}
                    >
                      <Button
                        size="sm"
                        color="warning"
                        className="w-full justify-center"
                        disabled
                        aria-label={t('characters.registerWithMagiergilde')}
                        title={submissionBlockedReason}
                      >
                        <Clock size={14} />
                        <span>{t('characters.registerWithMagiergilde')}</span>
                      </Button>
                    </div>
                  ) : (
                    <SubmitForApprovalModal
                      character={character}
                      processing={isSubmittingForApproval}
                      onSubmit={submitForApproval}
                    />
                  )}
                </div>
              ) : (
                <Button as="a" href={route('characters.show', character.id)} size="sm" className={cn('col-span-2 sm:col-span-4')}>
                  <BookOpen size={14} />
                  {t('characters.details')}
                </Button>
              )}
              {requiresSubmissionBeforeDowntime ? (
                <div
                  className="tooltip tooltip-bottom w-full"
                  data-tip={submissionRequiredReason}
                  aria-label={submissionRequiredReason}
                >
                  <Button
                    size="sm"
                    className="w-full justify-center gap-1"
                    disabled
                    aria-label={simplifiedTracking ? t('characters.setLevel') : t('characters.addAdventureDisabled')}
                  >
                    {simplifiedTracking ? <Gauge size={14} /> : <Swords size={14} />}
                    <span className="md:hidden">{simplifiedTracking ? t('characters.setLevel') : t('characters.adventure')}</span>
                  </Button>
                </div>
              ) : simplifiedTracking ? (
                <SetCharacterLevelModal character={character} />
              ) : (
                <StoreAdventureModal character={character} guildCharacters={guildCharacters}></StoreAdventureModal>
              )}
              {requiresSubmissionBeforeDowntime ? (
                <div
                  className="tooltip tooltip-bottom w-full"
                  data-tip={submissionRequiredReason}
                  aria-label={submissionRequiredReason}
                >
                  <Button
                    size="sm"
                    className="w-full justify-center gap-1"
                    disabled
                    aria-label={t('characters.addDowntimeDisabled')}
                  >
                    <FlameKindling size={14} />
                    <span className="md:hidden">{t('characters.downtime')}</span>
                  </Button>
                </div>
              ) : canLogActivity ? (
                <StoreDowntimeModal character={character}></StoreDowntimeModal>
              ) : null}
              {requiresSubmissionBeforeDowntime ? (
                <div
                  className="tooltip tooltip-bottom w-full"
                  data-tip={submissionRequiredReason}
                  aria-label={submissionRequiredReason}
                >
                  <Button
                    size="sm"
                    className="w-full justify-center gap-1"
                    disabled
                    aria-label={t('characters.manageAlliesDisabled')}
                  >
                    <BookHeart size={14} />
                    <span className="md:hidden">{t('characters.allies')}</span>
                  </Button>
                </div>
              ) : (
                <AlliesModal character={character} guildCharacters={guildCharacters} />
              )}
              {!character.is_filler ? (
                <BubbleShopModal character={character} />
              ) : null}
              <Button
                as="a"
                size="sm"
                href={character.external_link}
                target="_blank"
                aria-label={t('characters.openExternalLink')}
                title={t('characters.openExternalLink')}
              >
                <ExternalLink size={14} />
                <span className="sm:hidden">{t('characters.link')}</span>
              </Button>
            </div>
          </CardContent>
        </CardBody>
      </Card>
    </div>
  )
}
