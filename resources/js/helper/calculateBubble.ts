import type { Adventure, Character, Game } from '@/types'
import { bubblesRequiredForLevel } from '@/helper/levelProgression'
import { countsBubbleAdjustmentsForProgression } from '@/helper/usesManualLevelTracking'

type BubbleCharacter = Pick<Character, 'adventures' | 'dm_bubbles' | 'is_filler' | 'simplified_tracking' | 'progression_version_id'>

enum Bubble {
  MIN_DURATION = 10800,
}

const calculateBubble = (character: BubbleCharacter): number => {
  const dmBubbles = countsBubbleAdjustmentsForProgression(character)
    ? Number(character.dm_bubbles ?? 0)
    : 0

  return calculateBubbleByAdventures(character.adventures, character.progression_version_id) + (Number.isFinite(dmBubbles) ? dmBubbles : 0)
}

const realAdventureBubbles = (adventure: Adventure): number => {
  const duration = Number(adventure.duration ?? 0)
  const normalizedDuration = Number.isFinite(duration) ? duration : 0
  return Math.floor(normalizedDuration / Bubble.MIN_DURATION) + (adventure.has_additional_bubble ? 1 : 0)
}

const calculateBubbleByAdventures = (
  adventures?: Adventure[],
  characterProgressionVersionId?: number | null,
): number => {
  const list = adventures ?? []

  const sorted = [...list].sort((a, b) => {
    const dateOrder = String(a.start_date).localeCompare(String(b.start_date))
    return dateOrder !== 0 ? dateOrder : a.id - b.id
  })

  const lastPseudoIndex = sorted.findLastIndex((a) => a.is_pseudo)
  if (lastPseudoIndex === -1) {
    return sorted.reduce((sum, a) => sum + realAdventureBubbles(a), 0)
  }

  // Pseudo-adventures set the level directly.  target_bubbles stores the
  // exact available-bubble count at pseudo-creation time (including dm,
  // start_tier and shop-spend effects baked in), which preserves any
  // fractional progress within a level.  Fall back to the level-floor
  // for older rows that pre-date the target_bubbles column.
  const lastPseudo = sorted[lastPseudoIndex]
  const pseudoBubbles =
    lastPseudo.target_bubbles != null
      ? Number(lastPseudo.target_bubbles)
      : bubblesRequiredForLevel(
          Number(lastPseudo.target_level ?? 1),
          lastPseudo.progression_version_id ?? characterProgressionVersionId,
        )
  const realBubblesAfter = sorted
    .slice(lastPseudoIndex + 1)
    .filter((a) => !a.is_pseudo)
    .reduce((sum, a) => sum + realAdventureBubbles(a), 0)

  return pseudoBubbles + realBubblesAfter
}

const calculateBubbleByGames = (games?: Game[]): number => {
  return (games ?? []).reduce((bubble: number, game: Game): number => {
    const duration = Number(game.duration ?? 0)
    const normalizedDuration = Number.isFinite(duration) ? duration : 0

    return bubble + Math.floor(normalizedDuration / Bubble.MIN_DURATION) + (game.has_additional_bubble ? 1 : 0)
  }, 0)
}

const calculateBubbleByFillerCharacters = (characters?: BubbleCharacter[]): number => {
  return (characters ?? []).reduce((bubble: number, character: BubbleCharacter): number => {
    return character.is_filler ? bubble + calculateBubble(character) : bubble
  }, 0)
}

export { calculateBubble, calculateBubbleByAdventures, calculateBubbleByFillerCharacters, calculateBubbleByGames }
export type { BubbleCharacter }
