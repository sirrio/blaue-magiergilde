import { Character } from '@/types'

const calculateClassString = (character: Character): string => {
  const classes = Array.isArray(character.character_classes)
    ? character.character_classes
    : []

  const names = classes.map((c) => c.name).filter(Boolean)
  const uniqueNames = Array.from(new Set(names))

  return uniqueNames.join('/ ')
}

export { calculateClassString }
