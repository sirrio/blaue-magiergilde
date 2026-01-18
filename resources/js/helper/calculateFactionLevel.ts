import { calculateFactionDowntime } from '@/helper/calculateDowntime'
import { calculateLevel } from '@/helper/calculateLevel'
import { calculateTier } from '@/helper/calculateTier'
import { Character } from '@/types'

const calculateFactionLevel = (character: Character): number => {
  const tier = calculateTier(character)
  const level = calculateLevel(character)
  const downtime = calculateFactionDowntime(character)
  const adventures = character.adventures.length

  if (tier === 'bt' || character.faction === 'none') return 0

  if (adventures < 10) return 1

  if (level >= 18 && downtime >= 1800000) return 5

  if (level >= 14 && downtime >= 360000) return 4

  if (level >= 9 && downtime >= 360000) return 3

  return 2
}

export { calculateFactionLevel }
