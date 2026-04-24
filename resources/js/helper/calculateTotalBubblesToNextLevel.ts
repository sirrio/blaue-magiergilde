import { requireSnapshotNumber } from '@/helper/characterProgressionState'
import { Character } from '@/types'

const calculateTotalBubblesToNextLevel = (character: Character): number => {
  return requireSnapshotNumber(character, 'bubbles_required_for_next_level')
}

export { calculateTotalBubblesToNextLevel }
