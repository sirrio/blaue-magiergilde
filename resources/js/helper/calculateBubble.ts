import { Adventure, Character, Game } from '@/types'

enum Bubble {
  MIN_DURATION = 10800,
}

const calculateBubble = (character: Character): number => {
  return calculateBubbleByAdventures(character.adventures) + character.dm_bubbles
}

const calculateBubbleByAdventures = (adventures: Adventure[]): number => {
  return adventures.reduce((bubble: number, adventure: Adventure): number => {
    return bubble + Math.floor(adventure.duration / Bubble.MIN_DURATION) + (adventure.has_additional_bubble ? 1 : 0)
  }, 0)
}

const calculateBubbleByGames = (games: Game[]): number => {
  return games.reduce((bubble: number, game: Game): number => {
    return bubble + Math.floor(game.duration / Bubble.MIN_DURATION) + (game.has_additional_bubble ? 1 : 0)
  }, 0)
}

const calculateBubbleByFillerCharacters = (characters: Character[]): number => {
  return characters.reduce((bubble: number, character: Character): number => {
    return character.is_filler ? bubble + calculateBubble(character) : bubble
  }, 0)
}

export { calculateBubble, calculateBubbleByAdventures, calculateBubbleByFillerCharacters, calculateBubbleByGames }
