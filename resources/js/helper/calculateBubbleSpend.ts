import { Character } from '@/types'
import { calculateBubbleShopSpend } from '@/helper/calculateBubbleShopSpend'

const calculateBubbleSpend = (characters: Character[]): number => {
  return characters.reduce((bubble: number, character: Character): number => {
    return bubble + calculateBubbleShopSpend(character)
  }, 0)
}

export { calculateBubbleSpend }
