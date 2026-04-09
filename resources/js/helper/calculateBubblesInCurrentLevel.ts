import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel } from '@/helper/levelProgression'
import { Character } from '@/types'

const calculateBubblesInCurrentLevel = (character: Character): number => {
  const level = calculateLevel(character)
  const bubbles = calculateBubble(character)

  const additional_bubbles = additionalBubblesForStartTier(character.start_tier)
  const current_level_bubble_total = bubblesRequiredForLevel(level) - additional_bubbles

  return bubbles - current_level_bubble_total - character.bubble_shop_spend
}

export { calculateBubblesInCurrentLevel }
