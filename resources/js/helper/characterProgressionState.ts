import type { Character, CharacterProgressionState } from '@/types'

type SnapshotCharacter = Pick<Character, 'progression_state'>

const numberFromSnapshot = (snapshot: CharacterProgressionState | null | undefined, key: keyof CharacterProgressionState): number | null => {
  const value = snapshot?.[key]

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const stringFromSnapshot = (snapshot: CharacterProgressionState | null | undefined, key: keyof CharacterProgressionState): string | null => {
  const value = snapshot?.[key]

  return typeof value === 'string' && value.trim() !== '' ? value : null
}

export const requireSnapshotNumber = (character: SnapshotCharacter, key: keyof CharacterProgressionState): number => {
  const value = numberFromSnapshot(character.progression_state, key)

  if (value === null) {
    throw new Error(`Missing character progression snapshot value: ${String(key)}`)
  }

  return value
}

export const requireSnapshotString = (character: SnapshotCharacter, key: keyof CharacterProgressionState): string => {
  const value = stringFromSnapshot(character.progression_state, key)

  if (value === null) {
    throw new Error(`Missing character progression snapshot value: ${String(key)}`)
  }

  return value
}
