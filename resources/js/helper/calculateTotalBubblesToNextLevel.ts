import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel } from '@/helper/levelProgression'
import { hasPseudoAdventures } from '@/helper/usesManualLevelTracking'
import { Character } from '@/types'

const calculateTotalBubblesToNextLevel = (character: Character): number => {
  const level = calculateLevel(character)

  const additional_bubbles = hasPseudoAdventures(character) ? 0 : additionalBubblesForStartTier(character.start_tier)
  const current_level_bubble_total = bubblesRequiredForLevel(level, character.progression_version_id) - additional_bubbles
  const next_level_bubble_total = bubblesRequiredForLevel(level + 1, character.progression_version_id) - additional_bubbles

  return next_level_bubble_total - current_level_bubble_total
}

export { calculateTotalBubblesToNextLevel }
