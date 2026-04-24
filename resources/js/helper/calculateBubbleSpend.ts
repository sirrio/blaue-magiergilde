import { Character } from '@/types'

const calculateBubbleSpend = (characters: Character[]): number => {
  return characters.reduce((bubble: number, character: Character): number => {
    return bubble + Number(character.progression_state?.dm_bubbles ?? 0)
  }, 0)
}

export { calculateBubbleSpend }
