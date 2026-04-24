import type { LevelCharacter } from '@/helper/calculateLevel'
import { requireSnapshotString } from '@/helper/characterProgressionState'

const calculateTier = (character: LevelCharacter): string => {
  const snapshot = requireSnapshotString(character, 'tier')
  if (character.is_filler) return 'filler'

  return snapshot
}

export { calculateTier }
