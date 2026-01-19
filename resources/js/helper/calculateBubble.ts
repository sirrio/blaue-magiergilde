import type { Adventure, Character, Game } from '@/types'

type BubbleCharacter = Pick<Character, 'adventures' | 'dm_bubbles' | 'is_filler'>

enum Bubble {
  MIN_DURATION = 10800,
}

const calculateBubble = (character: BubbleCharacter): number => {
  const dmBubbles = Number(character.dm_bubbles ?? 0)

  return calculateBubbleByAdventures(character.adventures) + (Number.isFinite(dmBubbles) ? dmBubbles : 0)
}

const calculateBubbleByAdventures = (adventures?: Adventure[]): number => {
  return (adventures ?? []).reduce((bubble: number, adventure: Adventure): number => {
    const duration = Number(adventure.duration ?? 0)
    const normalizedDuration = Number.isFinite(duration) ? duration : 0

    return (
      bubble +
      Math.floor(normalizedDuration / Bubble.MIN_DURATION) +
      (adventure.has_additional_bubble ? 1 : 0)
    )
  }, 0)
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
