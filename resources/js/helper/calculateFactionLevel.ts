import { requireSnapshotNumber } from '@/helper/characterProgressionState'
import { Character } from '@/types'

const calculateFactionLevel = (character: Character): number => {
  return requireSnapshotNumber(character, 'faction_rank')
}

export { calculateFactionLevel }
