import LogoFiller from '@/components/logo-filler'
import LogoTier from '@/components/logo-tier'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { InfoBox, InfoBoxLine, InfoBoxTitle } from '@/components/ui/info-box'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
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
import { usePage } from '@inertiajs/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Anvil, Archive, BookOpen, CheckCircle2, Clock, Coins, Crown, Download, Droplets, ExternalLink, FlameKindling, Grip, MapPin, Pencil, Settings, Swords, XCircle } from 'lucide-react'
import React from 'react'
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
  const draftOnlyMode = !(features?.character_status_switch ?? true)
  const canLogActivity = draftOnlyMode || guildStatus !== 'draft'
  const hasRoom = (character.room_count ?? 0) > 0
  const statusLabel = guildStatus === 'approved'
    ? 'Approved'
    : guildStatus === 'declined'
      ? 'Declined'
      : guildStatus === 'retired'
        ? 'Retired'
        : guildStatus === 'draft'
          ? 'Draft'
          : 'Pending'
  const statusIcon = guildStatus === 'approved'
    ? <CheckCircle2 size={14} />
    : guildStatus === 'declined'
      ? <XCircle size={14} />
      : guildStatus === 'retired'
        ? <Archive size={14} />
        : guildStatus === 'draft'
          ? <Pencil size={14} />
          : <Clock size={14} />
  const statusClass = guildStatus === 'approved'
    ? 'text-success'
    : guildStatus === 'declined'
      ? 'text-error'
      : guildStatus === 'retired'
        ? 'text-base-content/50'
        : guildStatus === 'draft'
          ? 'text-base-content/60'
          : 'text-warning'

  const factionDowntimeSeconds = calculateFactionDowntime(character)
  const otherDowntimeSeconds = calculateOtherDowntime(character)
  const totalDowntimeSeconds = factionDowntimeSeconds + otherDowntimeSeconds
  const remainingDowntimeSeconds = calculateRemainingDowntime(character)
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
  const adventuresCountWarningReason = 'Simple mode auto-level entries exist. Played adventures count is not reliable.'
  const factionLevelWarningReason = 'Simple mode auto-level entries exist. Faction level is not reliable.'

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
            <span className={cn('inline-flex items-center', statusClass)} title={`Status: ${statusLabel}`}>
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
              <Button as="a" href={route('characters.show', character.id)} size="sm" className={cn('col-span-2 sm:col-span-4')}>
                <BookOpen size={14} />
                Details
              </Button>
              {canLogActivity ? (
                simplifiedTracking ? (
                  <SetCharacterLevelModal character={character} />
                ) : (
                  <StoreAdventureModal character={character} guildCharacters={guildCharacters}></StoreAdventureModal>
                )
              ) : null}
              {canLogActivity ? (
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
                      <span className="sm:hidden">Downtime</span>
                    </Button>
                  </div>
                ) : (
                  <StoreDowntimeModal character={character}></StoreDowntimeModal>
                )
              ) : null}
              <AlliesModal character={character} guildCharacters={guildCharacters} />
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
