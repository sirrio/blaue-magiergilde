import { calculateLevel } from '@/helper/calculateLevel'
import { Character } from '@/types'

const calculateTotalBubblesToNextLevel = (character: Character): number => {
  const level = calculateLevel(character)

  let additional_bubbles: number

  switch (character.start_tier) {
    case 'bt':
      additional_bubbles = 0
      break
    case 'lt':
      additional_bubbles = 10
      break
    case 'ht':
      additional_bubbles = 55
      break
    default:
      additional_bubbles = 0
  }

  const current_level_bubble_total = ((level - 1) * (level - 1 + 1)) / 2 - additional_bubbles
  const next_level_bubble_total = (level * (level + 1)) / 2 - additional_bubbles

  return next_level_bubble_total - current_level_bubble_total
}

export { calculateTotalBubblesToNextLevel }
