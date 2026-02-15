import LogoFiller from '@/components/logo-filler'
import LogoTier from '@/components/logo-tier'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { InfoBox, InfoBoxLine, InfoBoxTitle } from '@/components/ui/info-box'
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
import { Anvil, Archive, BookOpen, CheckCircle2, Clock, Coins, Crown, Download, Droplets, ExternalLink, FlameKindling, Grip, MapPin, Pencil, Swords, XCircle } from 'lucide-react'
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

export function CharacterCard({
  character,
  guildCharacters = [],
  simplifiedTrackingOverride,
  avatarMaskedOverride,
}: {
  character: Character
  guildCharacters?: Character[]
  simplifiedTrackingOverride?: boolean
  avatarMaskedOverride?: boolean
}) {
  const { features } = usePage<PageProps>().props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: character.id })
  const dragStyle: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition }

  const level = calculateLevel(character)
  const tier = calculateTier(character)
  const simplifiedTracking = simplifiedTrackingOverride ?? Boolean(character.simplified_tracking ?? character.user?.simplified_tracking)
  const avatarMasked = avatarMaskedOverride ?? (character.user?.avatar_masked ?? true)
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
  const formattedDowntimes = {
    total: secondsToHourMinuteString(totalDowntimeSeconds),
    faction: secondsToHourMinuteString(factionDowntimeSeconds),
    other: secondsToHourMinuteString(otherDowntimeSeconds),
    remaining: secondsToHourMinuteString(calculateRemainingDowntime(character)),
  }
  const factionLevel = character.faction_rank ?? calculateFactionLevel(character)

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <Card className={cn('group')}>
        <CardBody>
          <CardAction className={cn('absolute top-2 right-2 hidden gap-1 md:group-hover:flex')}>
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
            <Button
              className="flex"
              as="a"
              href={route('characters.download', character.id)}
              modifier="square"
              size="xs"
              aria-label="Download character"
              title="Download character"
            >
              <Download size={14} />
            </Button>
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
          <CardTitle className={cn('flex items-center gap-2 pb-0 pr-0 md:pr-20')}>
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
            <div className="mt-2 grid grid-cols-4 gap-1 md:hidden">
              <Button
                size="xs"
                variant="outline"
                className="justify-center"
                modifier="square"
                aria-label="Reorder character"
                title="Reorder character"
                {...attributes}
                {...listeners}
              >
                <Grip size={14} />
              </Button>
              <UpdateCharacterModal character={character}>
                <Button size="xs" variant="outline" className="justify-center" modifier="square" aria-label="Edit character" title="Edit character">
                  <Pencil size={14} />
                </Button>
              </UpdateCharacterModal>
              <Button
                as="a"
                href={route('characters.download', character.id)}
                size="xs"
                variant="outline"
                className="justify-center"
                modifier="square"
                aria-label="Download character"
                title="Download character"
              >
                <Download size={14} />
              </Button>
              <DestroyCharacterModal character={character}>
                <Button size="xs" color="error" className="justify-center" modifier="square" aria-label="Delete character" title="Delete character">
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
                  {!simplifiedTracking ? (
                    <InfoBox>
                      <InfoBoxTitle>
                        <Swords size={15} /> Adventures
                      </InfoBoxTitle>
                      <InfoBoxLine>Played: {character.adventures.length}</InfoBoxLine>
                      <InfoBoxLine>
                        Started in: <LogoTier width={13} tier={character.start_tier} />
                      </InfoBoxLine>
                      <InfoBoxLine>
                        Bubble Shop: {character.bubble_shop_spend}
                        <Droplets size={13} />
                      </InfoBoxLine>
                    </InfoBox>
                  ) : null}
                  <InfoBox>
                    <InfoBoxTitle>
                      <Anvil size={15} /> Factions
                    </InfoBoxTitle>
                    <InfoBoxLine className="capitalize">{character.faction}</InfoBoxLine>
                    <InfoBoxLine>Level: {factionLevel}</InfoBoxLine>
                  </InfoBox>
                  {!simplifiedTracking ? (
                    <InfoBox>
                      <InfoBoxTitle>
                        <FlameKindling size={15} /> Downtime
                      </InfoBoxTitle>
                      <InfoBoxLine>Total: {formattedDowntimes.total}</InfoBoxLine>
                      <InfoBoxLine>Faction: {formattedDowntimes.faction}</InfoBoxLine>
                      <InfoBoxLine>Other: {formattedDowntimes.other}</InfoBoxLine>
                      <InfoBoxLine className="font-semibold">Remaining: {formattedDowntimes.remaining}</InfoBoxLine>
                    </InfoBox>
                  ) : null}
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
            {simplifiedTracking ? (
              <div className={cn('mt-3 grid gap-2')}>
                <SetCharacterLevelModal character={character} />
                <Button
                  as="a"
                  size="sm"
                  href={character.external_link}
                  target="_blank"
                  className="w-full"
                  aria-label="Open external link"
                  title="Open external link"
                >
                  <ExternalLink size={14} />
                  Open link
                </Button>
              </div>
            ) : (
              <div className={cn('mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-1')}>
                <Button as="a" href={route('characters.show', character.id)} size="sm" className={cn('col-span-2 sm:col-span-4')}>
                  <BookOpen size={14} />
                  Details
                </Button>
                {canLogActivity ? (
                  <StoreAdventureModal character={character} guildCharacters={guildCharacters}></StoreAdventureModal>
                ) : null}
                {canLogActivity ? <StoreDowntimeModal character={character}></StoreDowntimeModal> : null}
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
            )}
          </CardContent>
        </CardBody>
      </Card>
    </div>
  )
}
