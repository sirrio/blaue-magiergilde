let currentTotals: Record<number, number> | null = null

const clampLevel = (value: number): number => {
  return Math.min(20, Math.max(1, Math.round(value)))
}

const setLevelProgressionTotals = (totals?: Record<number, number> | null): void => {
  if (!totals || typeof totals !== 'object') {
    throw new Error('Missing level progression totals in shared page props.')
  }

  const normalizedTotals: Record<number, number> = {}

  Object.entries(totals).forEach(([level, requiredBubbles]) => {
    const normalizedLevel = Number(level)
    const normalizedRequiredBubbles = Number(requiredBubbles)

    if (
      Number.isInteger(normalizedLevel)
      && normalizedLevel >= 1
      && normalizedLevel <= 20
      && Number.isFinite(normalizedRequiredBubbles)
    ) {
      normalizedTotals[normalizedLevel] = Math.max(0, Math.floor(normalizedRequiredBubbles))
    }
  })

  if (Object.keys(normalizedTotals).length !== 20) {
    throw new Error('Level progression totals must contain exactly 20 levels.')
  }

  currentTotals = normalizedTotals
}

const requireTotals = (): Record<number, number> => {
  if (!currentTotals) {
    throw new Error('Level progression totals have not been initialized.')
  }

  return currentTotals
}

const bubblesRequiredForLevel = (level: number): number => {
  const normalizedLevel = clampLevel(level)

  return requireTotals()[normalizedLevel]
}

const bubblesRequiredForNextLevel = (level: number): number => {
  const normalizedLevel = clampLevel(level)

  if (normalizedLevel >= 20) {
    return 0
  }

  return bubblesRequiredForLevel(normalizedLevel + 1) - bubblesRequiredForLevel(normalizedLevel)
}

const levelFromAvailableBubbles = (availableBubbles: number): number => {
  let remainingBubbles = Math.max(0, Number.isFinite(availableBubbles) ? availableBubbles : 0)
  let level = 1

  while (level < 20) {
    const requiredForNextLevel = bubblesRequiredForNextLevel(level)

    if (remainingBubbles < requiredForNextLevel) {
      break
    }

    remainingBubbles -= requiredForNextLevel
    level += 1
  }

  return level
}

export { bubblesRequiredForLevel, bubblesRequiredForNextLevel, clampLevel, levelFromAvailableBubbles, setLevelProgressionTotals }
