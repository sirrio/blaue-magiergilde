import LogoFiller from '@/components/logo-filler'
import LogoTier from '@/components/logo-tier'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { InfoBox, InfoBoxLine, InfoBoxTitle } from '@/components/ui/info-box'
import { Progress } from '@/components/ui/progress'
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
import { Character } from '@/types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Anvil, BookOpen, Coins, Crown, Droplets, ExternalLink, FlameKindling, Grip, Swords } from 'lucide-react'
import React from 'react'
import { useImage } from 'react-image'

function CharacterImage({ character, className }: { character: Character; className?: string }) {
  const { src } = useImage({
    srcList: ['storage/' + character.avatar, '/images/no-avatar.svg'],
  })
  return <img className={cn('aspect-square w-full rounded-full', className)} src={src} alt={character.name} />
}

export function CharacterCard({ character }: { character: Character }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: character.id })
  const dragStyle: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition }

  const level = calculateLevel(character)
  const tier = calculateTier(character)
  const progressValue = calculateBubblesInCurrentLevel(character)
  const progressMax = calculateTotalBubblesToNextLevel(character)
  const bubblesToNextLevel = calculateBubblesToNextLevel(character)

  const factionDowntimeSeconds = calculateFactionDowntime(character)
  const otherDowntimeSeconds = calculateOtherDowntime(character)
  const totalDowntimeSeconds = factionDowntimeSeconds + otherDowntimeSeconds
  const formattedDowntimes = {
    total: secondsToHourMinuteString(totalDowntimeSeconds),
    faction: secondsToHourMinuteString(factionDowntimeSeconds),
    other: secondsToHourMinuteString(otherDowntimeSeconds),
    remaining: secondsToHourMinuteString(calculateRemainingDowntime(character)),
  }

  return (
    <div ref={setNodeRef} style={dragStyle}>
      <Card className={cn('group')}>
        <CardBody>
          <CardAction className={cn('absolute top-2 right-2 gap-1')}>
            <Tooltip text="Move">
              <Button
                aria-label="Move"
                className={"hidden group-hover:flex"}
                size="xs"
                modifier="square"
                {...attributes}
                {...listeners}
              >
                <Grip size={14} />
              </Button>
            </Tooltip>
            <UpdateCharacterModal character={character} />
            <DestroyCharacterModal character={character} />
          </CardAction>
          <CardTitle className="pb-2 mb-2 border-b">
            {character.name} <LogoTier tier={tier} />
          </CardTitle>
          <CardContent>
            <div className={cn('text-xs')}>
              Level {level} {calculateClassString(character)}
            </div>
            <CharacterImage className="mt-4 mb-2" character={character} />
            {!character.is_filler ? (
              <>
                <Progress value={progressValue} max={progressMax} />
                <div className="flex items-center justify-end text-xs whitespace-pre">
                  <span>{bubblesToNextLevel}</span>
                  <Droplets size={13} />
                  <span> to next level</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <InfoBox className="bg-base-200 border-accent">
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
                  <InfoBox className="bg-base-200 border-accent">
                    <InfoBoxTitle>
                      <Anvil size={15} /> Factions
                    </InfoBoxTitle>
                    <InfoBoxLine className="capitalize">{character.faction}</InfoBoxLine>
                    <InfoBoxLine>Level: {calculateFactionLevel(character)}</InfoBoxLine>
                  </InfoBox>
                  <InfoBox className="bg-base-200 border-accent">
                    <InfoBoxTitle>
                      <FlameKindling size={15} /> Downtime
                    </InfoBoxTitle>
                    <InfoBoxLine>Total: {formattedDowntimes.total}</InfoBoxLine>
                    <InfoBoxLine>Faction: {formattedDowntimes.faction}</InfoBoxLine>
                    <InfoBoxLine>Other: {formattedDowntimes.other}</InfoBoxLine>
                    <InfoBoxLine className="font-semibold">Remaining: {formattedDowntimes.remaining}</InfoBoxLine>
                  </InfoBox>
                  <InfoBox className="bg-base-200 border-accent">
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
              <div className="flex justify-between">
                <div className="flex items-center whitespace-pre-wrap">
                  <LogoFiller /> Filler character
                </div>
                <div className="mt-1 flex items-center whitespace-pre-wrap">
                  <Swords size={15} /> Adventures: {character.adventures.length}
                </div>
              </div>
            )}
            <div className={cn('mt-4 grid grid-cols-4 gap-1')}>
              <Button as="a" href={route('characters.show', character.id)} size="sm" className={cn('col-span-4')}>
                <BookOpen size={14} />
                Details
              </Button>
              <StoreAdventureModal character={character}></StoreAdventureModal>
              <StoreDowntimeModal character={character}></StoreDowntimeModal>
              <AlliesModal character={character} />
              <Tooltip text="Open Sheet">
                <Button as="a" size="sm" aria-label="Open Sheet" href={character.external_link} target="_blank">
                  <ExternalLink size={14} />
                </Button>
              </Tooltip>
            </div>
          </CardContent>
        </CardBody>
      </Card>
    </div>
  )
}
