import { calculateBubble } from '@/helper/calculateBubble'
import { usesManualLevelTracking } from '@/helper/usesManualLevelTracking'
import { Character, Downtime } from '@/types'

const calculateRemainingDowntime = (character: Character): number => {
  const bubbles = calculateBubble(character)

  const usedDuration = character.downtimes.reduce((duration: number, downtime: Downtime): number => {
    return duration + downtime.duration
  }, 0)

  if (usesManualLevelTracking(character) && character.manual_total_downtime_seconds != null) {
    return character.manual_total_downtime_seconds - usedDuration
  }

  const totalDuration = bubbles * 8 * 60 * 60
  return totalDuration - usedDuration
}

export { calculateRemainingDowntime }
