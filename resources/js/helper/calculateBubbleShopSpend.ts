import { Character } from '@/types'

const calculateBubbleShopSpend = (
  character: Pick<Character, 'bubble_shop_spend' | 'shop_purchases'>,
): number => {
  const manualSpend = Number(character.bubble_shop_spend ?? 0)
  const normalizedManual = Number.isFinite(manualSpend) ? manualSpend : 0
  const purchaseSpend = Array.isArray(character.shop_purchases)
    ? character.shop_purchases.reduce((total, purchase) => total + Number(purchase.cost ?? 0), 0)
    : 0

  return normalizedManual + purchaseSpend
}

export { calculateBubbleShopSpend }
