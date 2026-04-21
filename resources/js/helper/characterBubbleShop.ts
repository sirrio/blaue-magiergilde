import { calculateTier } from '@/helper/calculateTier'
import { Character } from '@/types'

export type CharacterBubbleShopPurchaseType =
  | 'skill_proficiency'
  | 'rare_language'
  | 'tool_or_language'
  | 'downtime'

export const characterBubbleShopPurchaseTypes: CharacterBubbleShopPurchaseType[] = [
  'skill_proficiency',
  'rare_language',
  'tool_or_language',
  'downtime',
]

const tierRank = (tier: Character['start_tier'] | 'et' | string | null | undefined): number => {
  if (tier === 'lt') return 2
  if (tier === 'ht') return 3
  if (tier === 'et') return 4
  return 1
}

export const getCharacterBubbleShopLegacySpend = (character: Character): number => {
  return Number(character.bubble_shop_legacy_spend ?? character.bubble_shop_spend ?? 0)
}

export const getCharacterBubbleShopQuantities = (character: Character): Record<CharacterBubbleShopPurchaseType, number> => {
  const quantities = Object.fromEntries(
    characterBubbleShopPurchaseTypes.map((type) => [type, 0]),
  ) as Record<CharacterBubbleShopPurchaseType, number>

  for (const purchase of character.bubble_shop_purchases ?? []) {
    if (!characterBubbleShopPurchaseTypes.includes(purchase.type)) {
      continue
    }

    quantities[purchase.type] = Number(purchase.quantity ?? 0)
  }

  return quantities
}

export const getCharacterBubbleShopMaxQuantity = (character: Character, type: CharacterBubbleShopPurchaseType): number | null => {
  const unlockedTierRank = Math.max(tierRank(character.start_tier), tierRank(calculateTier(character)))
  const quantities = getCharacterBubbleShopQuantities(character)
  const currentDowntimeQuantity = quantities.downtime ?? 0

  if (type === 'skill_proficiency') return 1
  if (type === 'rare_language') return 1
  if (type === 'tool_or_language') return 3
  if (type === 'downtime') {
    if (unlockedTierRank >= 4) return null
    if (unlockedTierRank >= 3) return Math.max(45, currentDowntimeQuantity)
    if (unlockedTierRank >= 2) return Math.max(15, currentDowntimeQuantity)
    return currentDowntimeQuantity
  }

  return 0
}

export const getCharacterBubbleShopCost = (type: CharacterBubbleShopPurchaseType): number => {
  if (type === 'skill_proficiency') return 6
  if (type === 'rare_language') return 4
  if (type === 'tool_or_language') return 2
  return 1
}

export const getCharacterBubbleShopStructuredSpend = (
  character: Character,
  quantities: Record<CharacterBubbleShopPurchaseType, number> = getCharacterBubbleShopQuantities(character),
): number => {
  return characterBubbleShopPurchaseTypes.reduce((total, type) => total + (quantities[type] * getCharacterBubbleShopCost(type)), 0)
}

export const getCharacterBubbleShopCoveredByLegacy = (
  character: Character,
  quantities: Record<CharacterBubbleShopPurchaseType, number> = getCharacterBubbleShopQuantities(character),
): number => {
  return Math.min(getCharacterBubbleShopLegacySpend(character), getCharacterBubbleShopStructuredSpend(character, quantities))
}

export const getCharacterBubbleShopEffectiveSpend = (
  character: Character,
  quantities: Record<CharacterBubbleShopPurchaseType, number> = getCharacterBubbleShopQuantities(character),
): number => {
  return Math.max(getCharacterBubbleShopLegacySpend(character), getCharacterBubbleShopStructuredSpend(character, quantities))
}

export const getCharacterBubbleShopAdditionalSpend = (
  character: Character,
  quantities: Record<CharacterBubbleShopPurchaseType, number> = getCharacterBubbleShopQuantities(character),
): number => {
  return Math.max(0, getCharacterBubbleShopStructuredSpend(character, quantities) - getCharacterBubbleShopLegacySpend(character))
}

export const getCharacterBubbleShopExtraDowntimeSeconds = (
  character: Character,
  quantities: Record<CharacterBubbleShopPurchaseType, number> = getCharacterBubbleShopQuantities(character),
): number => {
  return (quantities.downtime ?? 0) * 8 * 60 * 60
}
