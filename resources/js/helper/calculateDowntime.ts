import { Character, Downtime } from '@/types'

const calculateFactionDowntime = (character: Character): number => {
  return character.downtimes.reduce((duration: number, downtime: Downtime): number => {
    return duration + (downtime.type === 'faction' ? downtime.duration : 0)
  }, 0)
}

const calculateOtherDowntime = (character: Character): number => {
  return character.downtimes.reduce((duration: number, downtime: Downtime): number => {
    return duration + (downtime.type === 'other' ? downtime.duration : 0)
  }, 0)
}

export { calculateFactionDowntime, calculateOtherDowntime }
