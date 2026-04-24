import { requireSnapshotNumber } from '@/helper/characterProgressionState'
import { Character } from '@/types'

const calculateBubblesInCurrentLevel = (character: Character): number => {
  return requireSnapshotNumber(character, 'bubbles_in_level')
}

export { calculateBubblesInCurrentLevel }
