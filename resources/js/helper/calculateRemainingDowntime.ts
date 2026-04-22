import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { getCharacterBubbleShopExtraDowntimeSeconds } from '@/helper/characterBubbleShop'
import { hasPseudoAdventures } from '@/helper/usesManualLevelTracking'
import { Character, Downtime } from '@/types'

const calculateRemainingDowntime = (character: Character): number => {
  const bubbles = calculateBubble(character)

  // In mixed tracking mode (pseudo anchor + real adventures after it),
  // target_bubbles bakes in start-tier bonus bubbles (LT +10, HT +55) that were
  // never earned through play — those must be subtracted from the downtime base.
  // Bubble shop spend, on the other hand, was earned through real adventures and
  // therefore generated downtime; add it back.
  const isMixed =
    hasPseudoAdventures(character) && character.adventures.some((a) => !a.is_pseudo)
  const tierBubbles = isMixed ? additionalBubblesForStartTier(character.start_tier) : 0
  const shopBubbles = isMixed ? Number(character.bubble_shop_spend ?? 0) : 0

  const usedDuration = character.downtimes.reduce((duration: number, downtime: Downtime): number => {
    return duration + downtime.duration
  }, 0)

  const totalDuration = Math.max(0, bubbles - tierBubbles + shopBubbles) * 8 * 60 * 60
    + getCharacterBubbleShopExtraDowntimeSeconds(character)
  return totalDuration - usedDuration
}

export { calculateRemainingDowntime }
