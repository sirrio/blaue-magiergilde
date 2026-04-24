import { Character } from '@/types'

const hasLevelAnchor = (character: Pick<Character, 'progression_state'>): boolean => {
  return Boolean(character.progression_state?.has_level_anchor)
}

const usesManualLevelTracking = (character: Pick<Character, 'simplified_tracking' | 'progression_state'>): boolean => {
  return Boolean(character.simplified_tracking) || hasLevelAnchor(character)
}

const countsBubbleAdjustmentsForProgression = (character?: Pick<Character, 'simplified_tracking' | 'progression_state'>): boolean => {
  void character
  return true
}

export { countsBubbleAdjustmentsForProgression, hasLevelAnchor, usesManualLevelTracking }
