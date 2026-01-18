import { calculateBubble } from '@/helper/calculateBubble'
import { Character } from '@/types'

const calculateLevel = (character: Character): number => {
  const simplifiedTracking = Boolean(
    character.simplified_tracking ?? character.user?.simplified_tracking,
  )
  const manualLevel = Number(character.manual_level)
  if (simplifiedTracking && Number.isFinite(manualLevel) && manualLevel > 0) {
    return Math.min(20, Math.max(1, Math.floor(manualLevel)))
  }

  const bubbles = calculateBubble(character)
  const bubbleShopSpend = Number(character.bubble_shop_spend ?? 0)
  const normalizedBubbleShopSpend = Number.isFinite(bubbleShopSpend) ? bubbleShopSpend : 0
  const normalizedBubbles = Number.isFinite(bubbles) ? bubbles : 0
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

  if (character.is_filler) return 3

  const availableBubbles = Math.max(0, normalizedBubbles + additional_bubbles - normalizedBubbleShopSpend)

  return Math.min(
    20,
    Math.floor(1 + (Math.sqrt(8 * availableBubbles + 1) - 1) / 2),
  )
}

export { calculateLevel }
