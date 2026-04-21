import { Character } from '@/types'

const hasPseudoAdventures = (character: Pick<Character, 'adventures'>): boolean => {
  return (character.adventures ?? []).some((adventure) => Boolean(adventure.is_pseudo))
}

const usesManualLevelTracking = (
  character: Pick<Character, 'simplified_tracking' | 'adventures'>,
): boolean => {
  return hasPseudoAdventures(character)
}

const countsBubbleAdjustmentsForProgression = (
  character: Pick<Character, 'simplified_tracking' | 'adventures'>,
): boolean => {
  return !usesManualLevelTracking(character)
}

export { countsBubbleAdjustmentsForProgression, hasPseudoAdventures, usesManualLevelTracking }
