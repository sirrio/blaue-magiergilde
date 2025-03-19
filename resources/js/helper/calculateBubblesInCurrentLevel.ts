import { calculateBubble } from '@/helper/calculateBubble'
import { calculateLevel } from '@/helper/calculateLevel'
import { Character } from '@/types'

const calculateBubblesInCurrentLevel = (character: Character): number => {
  const level = calculateLevel(character)
  const bubbles = calculateBubble(character)

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

  return bubbles - current_level_bubble_total - character.bubble_shop_spend
}

export { calculateBubblesInCurrentLevel }
