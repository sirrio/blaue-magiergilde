import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel } from '@/helper/levelProgression'
import { countsBubbleAdjustmentsForProgression } from '@/helper/usesManualLevelTracking'
import { Character } from '@/types'

const calculateBubblesInCurrentLevel = (character: Character): number => {
  const level = calculateLevel(character)
  const bubbles = calculateBubble(character)

  const additional_bubbles = additionalBubblesForStartTier(character.start_tier)
  const current_level_bubble_total = bubblesRequiredForLevel(level) - additional_bubbles

  const bubbleShopSpend = countsBubbleAdjustmentsForProgression(character)
    ? Number(character.bubble_shop_spend ?? 0)
    : 0

  return bubbles - current_level_bubble_total - bubbleShopSpend
}

export { calculateBubblesInCurrentLevel }
