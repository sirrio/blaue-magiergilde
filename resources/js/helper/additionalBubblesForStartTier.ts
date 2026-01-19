const additionalBubblesForStartTier = (startTier?: string | null): number => {
  const normalized = String(startTier ?? '').trim().toLowerCase()

  switch (normalized) {
    case 'lt':
      return 10
    case 'ht':
      return 55
    case 'bt':
    default:
      return 0
  }
}

export { additionalBubblesForStartTier }
