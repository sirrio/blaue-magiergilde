import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel } from '@/helper/levelProgression'
import { countsBubbleAdjustmentsForProgression, hasPseudoAdventures } from '@/helper/usesManualLevelTracking'
import { Character } from '@/types'

const calculateBubblesInCurrentLevel = (character: Character): number => {
  const level = calculateLevel(character)
  const bubbles = calculateBubble(character)

  // Pseudo chars: calculateBubble already returns bubblesRequiredForLevel(target_level)
  // with no start_tier offset, so the threshold must also be computed without it.
  const additional_bubbles = hasPseudoAdventures(character) ? 0 : additionalBubblesForStartTier(character.start_tier)
  const current_level_bubble_total = bubblesRequiredForLevel(level, character.progression_version_id) - additional_bubbles

  const bubbleShopSpend = countsBubbleAdjustmentsForProgression(character)
    ? Number(character.bubble_shop_spend ?? 0)
    : 0

  return bubbles - current_level_bubble_total - bubbleShopSpend
}

export { calculateBubblesInCurrentLevel }
