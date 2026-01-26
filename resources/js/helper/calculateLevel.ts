import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble, type BubbleCharacter } from '@/helper/calculateBubble'
import { calculateBubbleShopSpend } from '@/helper/calculateBubbleShopSpend'
import type { Character } from '@/types'

type LevelCharacter = BubbleCharacter &
  Pick<Character, 'bubble_shop_spend' | 'start_tier' | 'shop_purchases'>

const calculateLevel = (character: LevelCharacter): number => {
  const bubbles = calculateBubble(character)
  const normalizedBubbleShopSpend = calculateBubbleShopSpend(character)
  const normalizedBubbles = Number.isFinite(bubbles) ? bubbles : 0
  if (character.is_filler) return 3
  const additional_bubbles = additionalBubblesForStartTier(character.start_tier)

  const availableBubbles = Math.max(0, normalizedBubbles + additional_bubbles - normalizedBubbleShopSpend)

  return Math.min(
    20,
    Math.floor(1 + (Math.sqrt(8 * availableBubbles + 1) - 1) / 2),
  )
}

export { calculateLevel }
export type { LevelCharacter }
