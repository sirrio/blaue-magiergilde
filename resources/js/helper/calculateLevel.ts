import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble, type BubbleCharacter } from '@/helper/calculateBubble'
import { levelFromAvailableBubbles } from '@/helper/levelProgression'
import { countsBubbleAdjustmentsForProgression, hasPseudoAdventures } from '@/helper/usesManualLevelTracking'
import type { Character } from '@/types'

type LevelCharacter = BubbleCharacter & Pick<Character, 'bubble_shop_spend' | 'start_tier'>

const calculateLevel = (character: LevelCharacter): number => {
  const bubbles = calculateBubble(character)
  const bubbleShopSpend = countsBubbleAdjustmentsForProgression(character)
    ? Number(character.bubble_shop_spend ?? 0)
    : 0
  const normalizedBubbleShopSpend = Number.isFinite(bubbleShopSpend) ? bubbleShopSpend : 0
  const normalizedBubbles = Number.isFinite(bubbles) ? bubbles : 0
  if (character.is_filler) return 3
  // Pseudo-adventures encode the level directly via target_level — start_tier
  // is already accounted for in that stored value and must not be added again.
  const additional_bubbles = hasPseudoAdventures(character) ? 0 : additionalBubblesForStartTier(character.start_tier)

  const availableBubbles = Math.max(0, normalizedBubbles + additional_bubbles - normalizedBubbleShopSpend)

  return levelFromAvailableBubbles(availableBubbles, character.progression_version_id)
}

export { calculateLevel }
export type { LevelCharacter }
