import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { Character } from '@/types'

const calculateLevel = (character: Character): number => {
  const bubbles = calculateBubble(character)
  const bubbleShopSpend = Number(character.bubble_shop_spend ?? 0)
  const normalizedBubbleShopSpend = Number.isFinite(bubbleShopSpend) ? bubbleShopSpend : 0
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
