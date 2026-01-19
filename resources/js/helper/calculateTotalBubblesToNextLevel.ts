import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateLevel } from '@/helper/calculateLevel'
import { Character } from '@/types'

const calculateTotalBubblesToNextLevel = (character: Character): number => {
  const level = calculateLevel(character)

  const additional_bubbles = additionalBubblesForStartTier(character.start_tier)
  const current_level_bubble_total = ((level - 1) * (level - 1 + 1)) / 2 - additional_bubbles
  const next_level_bubble_total = (level * (level + 1)) / 2 - additional_bubbles

  return next_level_bubble_total - current_level_bubble_total
}

export { calculateTotalBubblesToNextLevel }
