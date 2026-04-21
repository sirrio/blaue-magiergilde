let currentTotalsByVersion: Record<number, Record<number, number>> | null = null
let currentActiveVersionId: number | null = null

const clampLevel = (value: number): number => {
  return Math.min(20, Math.max(1, Math.round(value)))
}

const normalizeTotals = (totals?: Record<number, number> | null): Record<number, number> => {
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

  return normalizedTotals
}

const setLevelProgressionVersions = (
  totalsByVersion?: Record<number, Record<number, number>> | null,
  activeVersionId?: number | null,
): void => {
  if (!totalsByVersion || typeof totalsByVersion !== 'object') {
    throw new Error('Missing level progression totals by version in shared page props.')
  }

  const normalizedByVersion: Record<number, Record<number, number>> = {}

  Object.entries(totalsByVersion).forEach(([versionId, totals]) => {
    const normalizedVersionId = Number(versionId)

    if (Number.isInteger(normalizedVersionId) && normalizedVersionId > 0) {
      normalizedByVersion[normalizedVersionId] = normalizeTotals(totals)
    }
  })

  const normalizedActiveVersionId = Number(activeVersionId)

  if (
    !Number.isInteger(normalizedActiveVersionId)
    || normalizedActiveVersionId <= 0
    || !(normalizedActiveVersionId in normalizedByVersion)
  ) {
    throw new Error('Missing active level progression version in shared page props.')
  }

  currentTotalsByVersion = normalizedByVersion
  currentActiveVersionId = normalizedActiveVersionId
}

const setLevelProgressionTotals = (totals?: Record<number, number> | null): void => {
  const normalizedTotals = normalizeTotals(totals)
  currentTotalsByVersion = { 1: normalizedTotals }
  currentActiveVersionId = 1
}

const requireTotalsByVersion = (): Record<number, Record<number, number>> => {
  if (!currentTotalsByVersion) {
    throw new Error('Level progression totals have not been initialized.')
  }

  return currentTotalsByVersion
}

const requireActiveVersionId = (): number => {
  if (!currentActiveVersionId) {
    throw new Error('Active level progression version has not been initialized.')
  }

  return currentActiveVersionId
}

const resolveVersionId = (versionId?: number | null): number => {
  if (Number.isInteger(versionId) && Number(versionId) > 0) {
    return Number(versionId)
  }

  return requireActiveVersionId()
}

const requireTotals = (versionId?: number | null): Record<number, number> => {
  const resolvedVersionId = resolveVersionId(versionId)
  const totalsByVersion = requireTotalsByVersion()
  const totals = totalsByVersion[resolvedVersionId]

  if (!totals) {
    throw new Error(`Level progression totals for version ${resolvedVersionId} have not been initialized.`)
  }

  return totals
}

const bubblesRequiredForLevel = (level: number, versionId?: number | null): number => {
  const normalizedLevel = clampLevel(level)

  return requireTotals(versionId)[normalizedLevel]
}

const bubblesRequiredForNextLevel = (level: number, versionId?: number | null): number => {
  const normalizedLevel = clampLevel(level)

  if (normalizedLevel >= 20) {
    return 0
  }

  return bubblesRequiredForLevel(normalizedLevel + 1, versionId) - bubblesRequiredForLevel(normalizedLevel, versionId)
}

const levelFromAvailableBubbles = (availableBubbles: number, versionId?: number | null): number => {
  let remainingBubbles = Math.max(0, Number.isFinite(availableBubbles) ? availableBubbles : 0)
  let level = 1

  while (level < 20) {
    const requiredForNextLevel = bubblesRequiredForNextLevel(level, versionId)

    if (remainingBubbles < requiredForNextLevel) {
      break
    }

    remainingBubbles -= requiredForNextLevel
    level += 1
  }

  return level
}

export {
  bubblesRequiredForLevel,
  bubblesRequiredForNextLevel,
  clampLevel,
  levelFromAvailableBubbles,
  setLevelProgressionTotals,
  setLevelProgressionVersions,
}
