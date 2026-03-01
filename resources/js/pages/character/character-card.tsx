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
import { calculateBubblesToNextLevel } from '@/helper/calculateBubblesToNextLevel'
import { calculateClassString } from '@/helper/calculateClassString'
import { calculateFactionDowntime, calculateOtherDowntime } from '@/helper/calculateDowntime'
import { calculateFactionLevel } from '@/helper/calculateFactionLevel'
import { calculateLevel } from '@/helper/calculateLevel'
import { calculateRemainingDowntime } from '@/helper/calculateRemainingDowntime'
import { calculateTier } from '@/helper/calculateTier'
import { calculateTotalBubblesToNextLevel } from '@/helper/calculateTotalBubblesToNextLevel'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { cn } from '@/lib/utils'
import { AlliesModal } from '@/pages/character/allies-modal'
import DestroyCharacterModal from '@/pages/character/destroy-character-modal'
import StoreAdventureModal from '@/pages/character/store-adventure-modal'
import StoreDowntimeModal from '@/pages/character/store-downtime-modal'
import UpdateCharacterModal from '@/pages/character/update-character-modal'
import SetCharacterLevelModal from '@/pages/character/set-character-level-modal'
import { Character } from '@/types'
import { PageProps } from '@/types'
import { router, usePage } from '@inertiajs/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, Anvil, Archive, BookHeart, BookOpen, CheckCircle2, Clock, Coins, Crown, Download, Droplets, ExternalLink, FlameKindling, Gauge, Grip, MapPin, Pencil, Settings, Swords, XCircle } from 'lucide-react'
import React, { useState } from 'react'
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
  characterId,
  isTrackingModeUpdating = false,
  isAvatarMaskedUpdating = false,
  onTrackingModeChange,
  onAvatarMaskedChange,
  triggerVariant = 'ghost',
  triggerSize = 'xs',
  triggerClassName,
}: {
  simplifiedTracking: boolean
  avatarMasked: boolean
  characterId: number
  isTrackingModeUpdating?: boolean
  isAvatarMaskedUpdating?: boolean
  onTrackingModeChange?: (value: boolean) => void
  onAvatarMaskedChange?: (value: boolean) => void
  triggerVariant?: 'ghost' | 'outline'
  triggerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  triggerClassName?: string
}) {
  return (
    <Modal>
      <ModalTrigger>
        <Button
          size={triggerSize}
          variant={triggerVariant}
          modifier="square"
          className={triggerClassName}
          aria-label="Character settings"
          title="Character settings"
        >
          <Settings size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Character Settings</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <label className={cn('flex items-center justify-between gap-3 text-sm', isTrackingModeUpdating && 'opacity-60')}>
            <span>Simplified tracking</span>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={simplifiedTracking}
              disabled={isTrackingModeUpdating || !onTrackingModeChange}
              onChange={(event) => onTrackingModeChange?.(event.target.checked)}
            />
          </label>
          <label className={cn('flex items-center justify-between gap-3 text-sm', isAvatarMaskedUpdating && 'opacity-60')}>
            <span>Token mask</span>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={avatarMasked}
              disabled={isAvatarMaskedUpdating || !onAvatarMaskedChange}
              onChange={(event) => onAvatarMaskedChange?.(event.target.checked)}
            />
          </label>
          <div className="border-t border-base-200 pt-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button as="a" href={route('characters.download', characterId)} size="sm" variant="outline" className="w-full">
                <Download size={14} />
                Download JSON
              </Button>
              <Button
                as="a"
                href={route('characters.download', { character: characterId, format: 'pretty' })}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Download size={14} />
                Download Pretty
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
  onSubmit: (registrationNote: string, onSuccess: () => void) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [registrationNote, setRegistrationNote] = useState(character.registration_note ?? '')
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
            setIsOpen(true)
          }}
          disabled={processing}
          aria-label="Register with Magiergilde"
          title="Register with Magiergilde"
        >
          <Clock size={14} />
          <span>Register with Magiergilde</span>
        </Button>
      </ModalTrigger>
      <ModalTitle>Register Character With Magiergilde</ModalTitle>
      <ModalContent>
        <p className="text-sm text-base-content/80">
          This changes <span className="font-semibold">{character.name}</span> from {fromLabel} to active (pending) and registers it with
          the Magiergilde for review.
        </p>
        <p className="text-xs text-base-content/60">
          The review team checks whether the character can be used in the Magiergilde and may request changes if something is missing or needs
          clarification.
        </p>
        <TextArea
          value={registrationNote}
          onChange={(event) => setRegistrationNote(event.target.value)}
          placeholder="Add review-relevant info, for example rare language choices, filler-character notes, or anything the Magiergilde should know..."
        >
          Registration notes (optional)
        </TextArea>
        <p className="text-xs text-base-content/60">
          Use this for anything the review team should know when checking the character, for example rare language choices, filler characters,
          or special rulings.
        </p>
        <p className="mt-2 text-xs text-base-content/60">
          After Magiergilde review, you cannot switch approved or declined characters back by yourself.
        </p>
      </ModalContent>
      <ModalAction onClick={() => onSubmit(registrationNote.trim(), () => setIsOpen(false))} disabled={processing}>
        Register character
      </ModalAction>
    </Modal>
  )
}

export function CharacterCard({
  character,
  guildCharacters = [],
  onTrackingModeChange,
  isTrackingModeUpdating = false,
  onAvatarMaskedChange,
  isAvatarMaskedUpdating = false,
}: {
  character: Character
  guildCharacters?: Character[]
  onTrackingModeChange?: (value: boolean) => void
  isTrackingModeUpdating?: boolean
  onAvatarMaskedChange?: (value: boolean) => void
  isAvatarMaskedUpdating?: boolean
}) {
  const { features } = usePage<PageProps>().props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: character.id })
  const dragStyle: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition }

  const level = calculateLevel(character)
  const tier = calculateTier(character)
  const simplifiedTracking = character.simplified_tracking ?? false
  const avatarMasked = character.avatar_masked ?? true
  const progressValue = calculateBubblesInCurrentLevel(character)
  const progressMax = calculateTotalBubblesToNextLevel(character)
  const bubblesToNextLevel = calculateBubblesToNextLevel(character)
  const additionalBubbles = additionalBubblesForStartTier(character.start_tier)
  const earnedBubbles = calculateBubble(character) + additionalBubbles
  const isBubbleOverspent = character.bubble_shop_spend > earnedBubbles
  const guildStatus = character.guild_status ?? 'pending'
  const reviewNote = character.review_note?.trim() ?? ''
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
  const statusTooltip = guildStatus === 'draft'
    ? 'Draft only. This character is not registered with the Magiergilde yet.'
    : guildStatus === 'declined'
      ? reviewNote
        ? `Declined by the Magiergilde. Note: ${reviewNote}`
        : 'Declined by the Magiergilde.'
    : guildStatus === 'needs_changes'
      ? reviewNote
        ? `Changes requested by the Magiergilde. Note: ${reviewNote}`
        : 'Changes requested by the Magiergilde. Update and register again for review.'
    : guildStatus === 'pending'
      ? 'Registered with the Magiergilde. Waiting for review.'
      : `Status: ${statusLabel}`
  const isStatusSwitchEnabled = features?.character_status_switch ?? true
  const canSubmitForApproval = isStatusSwitchEnabled && requiresRegistration
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false)

  const factionDowntimeSeconds = calculateFactionDowntime(character)
  const otherDowntimeSeconds = calculateOtherDowntime(character)
  const remainingDowntimeSeconds = Math.max(0, calculateRemainingDowntime(character))
  const totalDowntimeSeconds = factionDowntimeSeconds + otherDowntimeSeconds + remainingDowntimeSeconds
  const remainingDowntimeGold = Math.max(0, (remainingDowntimeSeconds / 3600) * 15)
  const remainingDowntimeGoldLabel = Number.isInteger(remainingDowntimeGold)
    ? remainingDowntimeGold.toString()
    : remainingDowntimeGold.toFixed(1).replace(/\.0$/, '')
  const remainingDowntimeTooltip = `Potential earnings: ${remainingDowntimeGoldLabel} Gold (15 Gold / hour)`
  const formattedDowntimes = {
    total: secondsToHourMinuteString(totalDowntimeSeconds),
    faction: secondsToHourMinuteString(factionDowntimeSeconds),
    other: secondsToHourMinuteString(otherDowntimeSeconds),
    remaining: secondsToHourMinuteString(remainingDowntimeSeconds),
  }
  const factionLevel = character.faction_rank ?? calculateFactionLevel(character)
  const hasAutoLevelAdventure = character.adventures.some((adventure) => Boolean(adventure.is_pseudo))
  const downtimeDisabledInSimpleMode = simplifiedTracking && hasAutoLevelAdventure
  const downtimeDisabledReason = 'Downtime cannot be calculated correctly after simple mode auto-level adventures.'
  const submissionRequiredReason = 'Register with the Magiergilde first.'
  const adventuresCountWarningReason = 'Simple mode auto-level entries exist. Played adventures count is not reliable.'
  const factionLevelWarningReason = 'Simple mode auto-level entries exist. Faction level is not reliable.'

  const submitForApproval = (registrationNote: string, onSuccess: () => void) => {
    if (isSubmittingForApproval || !canSubmitForApproval) {
      return
    }

    setIsSubmittingForApproval(true)
    router.post(
      route('characters.submit-approval', character.id),
      {
        registration_note: registrationNote,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          onSuccess()
        },
        onFinish: () => {
          setIsSubmittingForApproval(false)
        },
      },
    )
  }

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <Card className={cn('group')}>
        <CardBody>
          <CardAction className={cn('absolute top-2 right-2 hidden gap-1 md:group-hover:flex')}>
            <CharacterSettingsModal
              simplifiedTracking={simplifiedTracking}
              avatarMasked={avatarMasked}
              characterId={character.id}
              isTrackingModeUpdating={isTrackingModeUpdating}
              isAvatarMaskedUpdating={isAvatarMaskedUpdating}
              onTrackingModeChange={onTrackingModeChange}
              onAvatarMaskedChange={onAvatarMaskedChange}
            />
            <Button
              className="flex"
              size="xs"
              modifier="square"
              aria-label="Reorder character"
              title="Reorder character"
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
                aria-label="Edit character"
                title="Edit character"
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
                aria-label="Delete character"
                title="Delete character"
              >
                <XCircle size={14} />
              </Button>
            </DestroyCharacterModal>
          </CardAction>
          <CardTitle className={cn('flex items-center gap-2 pb-0 pr-0 md:pr-28')}>
            <span
              className={cn('tooltip tooltip-bottom inline-flex items-center', statusClass)}
              data-tip={statusTooltip}
              title={statusTooltip}
            >
              {statusIcon}
            </span>
            <span className="truncate">{character.name}</span>
            {hasRoom ? (
              <span className="text-primary/70" title="Room assigned">
                <MapPin size={14} />
              </span>
            ) : null}
          </CardTitle>
          <CardContent>
            <div className={cn('flex items-center gap-1 text-xs')}>
              <LogoTier tier={tier} width={12} />
              <span>
                Level {level} {calculateClassString(character)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 md:hidden">
              <CharacterSettingsModal
                simplifiedTracking={simplifiedTracking}
                avatarMasked={avatarMasked}
                characterId={character.id}
                isTrackingModeUpdating={isTrackingModeUpdating}
                isAvatarMaskedUpdating={isAvatarMaskedUpdating}
                onTrackingModeChange={onTrackingModeChange}
                onAvatarMaskedChange={onAvatarMaskedChange}
                triggerVariant="outline"
                triggerSize="sm"
                triggerClassName="w-full justify-center"
              />
              <UpdateCharacterModal character={character}>
                <Button size="sm" variant="outline" className="w-full justify-center" aria-label="Edit character" title="Edit character">
                  <Pencil size={14} />
                </Button>
              </UpdateCharacterModal>
              <DestroyCharacterModal character={character}>
                <Button size="sm" variant="outline" color="error" className="w-full justify-center" aria-label="Delete character" title="Delete character">
                  <XCircle size={14} />
                </Button>
              </DestroyCharacterModal>
            </div>
            <CharacterImage className="mx-auto mb-2 mt-3 w-full max-w-44 sm:max-w-56" character={character} masked={avatarMasked} />
            {!character.is_filler ? (
              <>
                {!simplifiedTracking ? (
                  <>
                    <Progress value={progressValue} max={progressMax} />
                    <div className="flex items-center justify-end text-xs">
                      {isBubbleOverspent ? (
                        <span className="text-error/80">Overspent bubbles</span>
                      ) : (
                        <>
                          <span>{bubblesToNextLevel}</span>
                          <Droplets size={13} />
                          <span> to next level</span>
                        </>
                      )}
                    </div>
                  </>
                ) : null}
                <div className={cn('mt-3 grid grid-cols-2 gap-1.5')}>
                  <InfoBox>
                    <InfoBoxTitle>
                      <Swords size={15} /> Adventures
                    </InfoBoxTitle>
                    <InfoBoxLine>
                      Played:{' '}
                      {downtimeDisabledInSimpleMode ? (
                        <span className="tooltip tooltip-warning tooltip-bottom" data-tip={adventuresCountWarningReason} title={adventuresCountWarningReason}>
                          <span className="cursor-help font-semibold text-warning">?</span>
                        </span>
                      ) : (
                        character.adventures.length
                      )}
                    </InfoBoxLine>
                    <InfoBoxLine>
                      Started in: <LogoTier width={13} tier={character.start_tier} />
                    </InfoBoxLine>
                    <InfoBoxLine>
                      Bubble Shop: {character.bubble_shop_spend}
                      <Droplets size={13} />
                    </InfoBoxLine>
                  </InfoBox>
                  <InfoBox>
                    <InfoBoxTitle>
                      <Anvil size={15} /> Factions
                    </InfoBoxTitle>
                    <InfoBoxLine className="capitalize">{character.faction}</InfoBoxLine>
                    <InfoBoxLine>
                      Level:{' '}
                      {downtimeDisabledInSimpleMode ? (
                        <span className="tooltip tooltip-warning tooltip-bottom" data-tip={factionLevelWarningReason} title={factionLevelWarningReason}>
                          <span className="cursor-help font-semibold text-warning">?</span>
                        </span>
                      ) : (
                        factionLevel
                      )}
                    </InfoBoxLine>
                  </InfoBox>
                  <InfoBox>
                    <InfoBoxTitle>
                      <FlameKindling size={15} /> Downtime
                    </InfoBoxTitle>
                    {downtimeDisabledInSimpleMode ? (
                      <InfoBoxLine className="text-warning">Cannot calculate downtime while simple mode entries exist.</InfoBoxLine>
                    ) : (
                      <>
                        <InfoBoxLine>Total: {formattedDowntimes.total}</InfoBoxLine>
                        <InfoBoxLine>Faction: {formattedDowntimes.faction}</InfoBoxLine>
                        <InfoBoxLine>Other: {formattedDowntimes.other}</InfoBoxLine>
                        <div className="tooltip tooltip-info tooltip-bottom w-full" data-tip={remainingDowntimeTooltip} title={remainingDowntimeTooltip}>
                          <InfoBoxLine className="font-semibold cursor-help">Remaining: {formattedDowntimes.remaining}</InfoBoxLine>
                        </div>
                      </>
                    )}
                  </InfoBox>
                  <InfoBox>
                    <InfoBoxTitle>
                      <Crown size={15} /> Game Master
                    </InfoBoxTitle>
                    <InfoBoxLine>
                      Bubbles: {character.dm_bubbles}
                      <Droplets size={13} />
                    </InfoBoxLine>
                    <InfoBoxLine>
                      Coins: {character.dm_coins}
                      <Coins size={13} />
                    </InfoBoxLine>
                  </InfoBox>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center whitespace-pre-wrap">
                  <LogoFiller /> Filler character
                </div>
                <div className="mt-1 flex items-center whitespace-pre-wrap">
                  <Swords size={15} /> Adventures: {character.adventures.length}
                </div>
              </div>
            )}
            <div className={cn('mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-1')}>
              {canSubmitForApproval ? (
                <div className="col-span-2 sm:col-span-4">
                  <SubmitForApprovalModal
                    character={character}
                    processing={isSubmittingForApproval}
                    onSubmit={submitForApproval}
                  />
                </div>
              ) : (
                <Button as="a" href={route('characters.show', character.id)} size="sm" className={cn('col-span-2 sm:col-span-4')}>
                  <BookOpen size={14} />
                  Details
                </Button>
              )}
              {requiresSubmissionBeforeDowntime ? (
                <div
                  className="tooltip tooltip-bottom w-full"
                  data-tip={submissionRequiredReason}
                  title={submissionRequiredReason}
                >
                  <Button
                    size="sm"
                    className="w-full justify-center gap-1"
                    disabled
                    aria-label={simplifiedTracking ? 'Set level disabled' : 'Add adventure disabled'}
                    title={submissionRequiredReason}
                  >
                    {simplifiedTracking ? <Gauge size={14} /> : <Swords size={14} />}
                    <span className="md:hidden">{simplifiedTracking ? 'Set level' : 'Adventure'}</span>
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
                  title={submissionRequiredReason}
                >
                  <Button
                    size="sm"
                    className="w-full justify-center gap-1"
                    disabled
                    aria-label="Add downtime disabled"
                    title={submissionRequiredReason}
                  >
                    <FlameKindling size={14} />
                    <span className="md:hidden">Downtime</span>
                  </Button>
                </div>
              ) : canLogActivity ? (
                downtimeDisabledInSimpleMode ? (
                  <div className="tooltip tooltip-bottom w-full" data-tip={downtimeDisabledReason} title={downtimeDisabledReason}>
                    <Button
                      size="sm"
                      className="w-full justify-center gap-1"
                      disabled
                      aria-label="Add downtime disabled"
                      title={downtimeDisabledReason}
                    >
                      <FlameKindling size={14} />
                      <span className="md:hidden">Downtime</span>
                    </Button>
                  </div>
                ) : (
                  <StoreDowntimeModal character={character}></StoreDowntimeModal>
                )
              ) : null}
              {requiresSubmissionBeforeDowntime ? (
                <div
                  className="tooltip tooltip-bottom w-full"
                  data-tip={submissionRequiredReason}
                  title={submissionRequiredReason}
                >
                  <Button
                    size="sm"
                    className="w-full justify-center gap-1"
                    disabled
                    aria-label="Manage allies disabled"
                    title={submissionRequiredReason}
                  >
                    <BookHeart size={14} />
                    <span className="md:hidden">Allies</span>
                  </Button>
                </div>
              ) : (
                <AlliesModal character={character} guildCharacters={guildCharacters} />
              )}
              <Button
                as="a"
                size="sm"
                href={character.external_link}
                target="_blank"
                aria-label="Open external link"
                title="Open external link"
              >
                <ExternalLink size={14} />
                <span className="sm:hidden">Link</span>
              </Button>
            </div>
          </CardContent>
        </CardBody>
      </Card>
    </div>
  )
}
