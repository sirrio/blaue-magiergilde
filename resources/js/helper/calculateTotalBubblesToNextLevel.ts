import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel } from '@/helper/levelProgression'
import { Character } from '@/types'

const calculateTotalBubblesToNextLevel = (character: Character): number => {
  const level = calculateLevel(character)

  const additional_bubbles = additionalBubblesForStartTier(character.start_tier)
  const current_level_bubble_total = bubblesRequiredForLevel(level) - additional_bubbles
  const next_level_bubble_total = bubblesRequiredForLevel(level + 1) - additional_bubbles

  return next_level_bubble_total - current_level_bubble_total
}

export { calculateTotalBubblesToNextLevel }
