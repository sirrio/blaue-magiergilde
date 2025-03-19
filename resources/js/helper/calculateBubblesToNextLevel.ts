import { calculateBubblesInCurrentLevel } from '@/helper/calculateBubblesInCurrentLevel'
import { calculateTotalBubblesToNextLevel } from '@/helper/calculateTotalBubblesToNextLevel'
import { Character } from '@/types'

const calculateBubblesToNextLevel = (character: Character): number => {
  return calculateTotalBubblesToNextLevel(character) - calculateBubblesInCurrentLevel(character)
}

export { calculateBubblesToNextLevel }
