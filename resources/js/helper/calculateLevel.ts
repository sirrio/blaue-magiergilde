import { requireSnapshotNumber } from '@/helper/characterProgressionState'
import type { Character } from '@/types'

type LevelCharacter = Pick<Character, 'is_filler' | 'progression_state'>

const calculateLevel = (character: LevelCharacter): number => {
  return requireSnapshotNumber(character, 'level')
}

export { calculateLevel }
export type { LevelCharacter }
