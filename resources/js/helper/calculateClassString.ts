import { Character } from '@/types'

const calculateClassString = (character: Character): string => {
  const classes = Array.isArray(character.character_classes)
    ? character.character_classes
    : []

  return classes.map((c) => c.name).join('/ ')
}

export { calculateClassString }
