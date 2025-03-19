import { Character } from '@/types'

const calculateCoinsSpend = (characters: Character[]): number => {
  return characters.reduce((bubble: number, character: Character): number => {
    return bubble + character.dm_coins
  }, 0)
}

export { calculateCoinsSpend }
