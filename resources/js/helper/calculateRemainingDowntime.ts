import { requireSnapshotNumber } from '@/helper/characterProgressionState'
import { Character } from '@/types'

const calculateRemainingDowntime = (character: Character): number => {
  return requireSnapshotNumber(character, 'downtime_total_seconds') - requireSnapshotNumber(character, 'downtime_logged_seconds')
}

export { calculateRemainingDowntime }
