import { Character } from '@/types'

const calculateCoinsSpend = (characters: Character[]): number => {
  return characters.reduce((bubble: number, character: Character): number => {
    return bubble + Number(character.progression_state?.dm_coins ?? 0)
  }, 0)
}

export { calculateCoinsSpend }
