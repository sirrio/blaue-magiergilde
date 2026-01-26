import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { calculateBubbleShopSpend } from '@/helper/calculateBubbleShopSpend'
import { calculateLevel } from '@/helper/calculateLevel'
import { Character } from '@/types'

const calculateBubblesInCurrentLevel = (character: Character): number => {
  const level = calculateLevel(character)
  const bubbles = calculateBubble(character)

  const additional_bubbles = additionalBubblesForStartTier(character.start_tier)
  const current_level_bubble_total = ((level - 1) * (level - 1 + 1)) / 2 - additional_bubbles

  return bubbles - current_level_bubble_total - calculateBubbleShopSpend(character)
}

export { calculateBubblesInCurrentLevel }
