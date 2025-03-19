import { Character } from '@/types'

const calculateClassString = (character: Character): string => {
  let result = character.character_classes.reduce((p, c) => p + '/ ' + c.name, '')
  result = result.slice(2, result.length)

  return result
}

export { calculateClassString }
