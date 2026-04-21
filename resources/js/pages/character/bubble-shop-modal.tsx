import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import {
  CharacterBubbleShopPurchaseType,
  characterBubbleShopPurchaseTypes,
  getCharacterBubbleShopCost,
  getCharacterBubbleShopEffectiveSpend,
  getCharacterBubbleShopLegacySpend,
  getCharacterBubbleShopMaxEffectiveSpendWithoutDownlevel,
  getCharacterBubbleShopMaxQuantity,
  getCharacterBubbleShopQuantities,
  getCharacterBubbleShopStructuredSpend,
} from '@/helper/characterBubbleShop'
import { calculateLevel } from '@/helper/calculateLevel'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { AlertTriangle, Droplets, Minus, Plus, ShoppingBag } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

type BubbleShopFormData = Record<CharacterBubbleShopPurchaseType, number>

const purchaseLabelKey: Record<CharacterBubbleShopPurchaseType, string> = {
  skill_proficiency: 'characters.bubbleShopSkillProficiency',
  rare_language: 'characters.bubbleShopRareLanguage',
  tool_or_language: 'characters.bubbleShopToolOrLanguage',
  downtime: 'characters.bubbleShopDowntime',
}

export default function BubbleShopModal({
  character,
  triggerClassName,
  showLabel = false,
  labelClassName,
}: {
  character: Character
  triggerClassName?: string
  showLabel?: boolean
  labelClassName?: string
}) {
  const t = useTranslate()
  const { errors } = usePage<PageProps>().props
  const [isOpen, setIsOpen] = useState(false)
  const wasOpenRef = useRef(false)

  const baseData = useMemo(() => getCharacterBubbleShopQuantities(character), [character])
  const form = useForm<BubbleShopFormData>(baseData)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      form.setData(getCharacterBubbleShopQuantities(character))
      form.clearErrors()
    }

    wasOpenRef.current = isOpen
  }, [character, form, isOpen])

  const structuredSpend = getCharacterBubbleShopStructuredSpend(character, form.data)
  const legacySpend = getCharacterBubbleShopLegacySpend(character)
  const currentLevel = calculateLevel(character)
  const currentEffectiveSpend = getCharacterBubbleShopEffectiveSpend(character, form.data)
  const maxEffectiveSpendWithoutDownlevel = getCharacterBubbleShopMaxEffectiveSpendWithoutDownlevel(character)
  const remainingSpendableWithoutDownlevel = maxEffectiveSpendWithoutDownlevel === null
    ? null
    : Math.max(0, maxEffectiveSpendWithoutDownlevel - currentEffectiveSpend)
  const legacySpendRemaining = Math.max(legacySpend - structuredSpend, 0)
  const hasOutstandingLegacyRedistribution = legacySpendRemaining > 0

  const submit = () => {
    form.patch(route('characters.bubble-shop', character.id), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => setIsOpen(false),
    })
  }

  const openModal = (event?: React.MouseEvent<HTMLElement>) => {
    event?.preventDefault()
    event?.stopPropagation()
    setIsOpen(true)
  }

  return (
    <>
      <Button
        size="sm"
        className={cn(triggerClassName ?? 'w-full justify-center gap-1', hasOutstandingLegacyRedistribution && 'relative')}
        aria-label={t('characters.manageBubbleShop')}
        title={t('characters.manageBubbleShop')}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={openModal}
      >
        <ShoppingBag size={14} />
        {showLabel ? <span className={labelClassName}>{t('characters.manageBubbleShop')}</span> : <span className="md:hidden">{t('characters.bubbleShop')}</span>}
        {hasOutstandingLegacyRedistribution ? (
          <span className="badge badge-warning badge-xs absolute -right-1 -top-1 min-w-4 px-1 text-[10px] leading-none">
            {legacySpendRemaining > 9 ? '9+' : legacySpendRemaining}
          </span>
        ) : null}
      </Button>
      <Modal isOpen={isOpen} onClose={() => !form.processing && setIsOpen(false)}>
      <ModalTitle>{t('characters.manageBubbleShop')}</ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          {hasOutstandingLegacyRedistribution ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-3 text-xs text-base-content/75">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-warning">
                  <AlertTriangle size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-base-content">{t('characters.bubbleShopLegacyUnassigned')}</div>
                      <div className="mt-1 text-base-content/55">{t('characters.bubbleShopLegacyReasonTitle')}</div>
                    </div>
                    <div className="rounded-md border border-warning/30 bg-base-100 px-2 py-1 text-sm font-semibold text-base-content">
                      {legacySpendRemaining}
                    </div>
                  </div>

                  <div className="mt-2">{t('characters.bubbleShopLegacyReasonBody')}</div>
                  <div className="mt-2 font-medium text-warning-content/90 dark:text-warning">{t('characters.bubbleShopLegacySubhint', { count: legacySpendRemaining })}</div>
                </div>
              </div>
            </div>
          ) : null}

          {remainingSpendableWithoutDownlevel !== null ? (
            <div className="px-1 text-sm text-base-content/65">
              {remainingSpendableWithoutDownlevel > 0 ? (
                <div className="space-y-1">
                  <div>
                    Noch{' '}
                    <span className="font-semibold text-base-content">
                      {remainingSpendableWithoutDownlevel}
                    </span>{' '}
                    {t('characters.bubbleShopSpendableFloorBody', {
                      count: remainingSpendableWithoutDownlevel,
                      level: currentLevel,
                    })}
                  </div>
                  <div className="text-xs text-base-content/50">
                    {t('characters.bubbleShopSpendableFloorSubhint')}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div>
                    {t('characters.bubbleShopSpendableFloorReached', { level: currentLevel })}
                  </div>
                  <div className="text-xs text-base-content/50">
                    {t('characters.bubbleShopSpendableFloorReachedSubhint')}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            {characterBubbleShopPurchaseTypes.map((type) => {
              const max = getCharacterBubbleShopMaxQuantity(character, type)
              const cost = getCharacterBubbleShopCost(type)
              const label = t(purchaseLabelKey[type])
              const isLocked = max === 0
              const maxLabel = max === null ? t('common.unlimited') : max

              return (
                <div key={type} className="rounded-md border border-base-200 bg-base-100 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{label}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                        <span className="inline-flex items-center gap-1 rounded-md border border-base-300 bg-base-100 px-2 py-1 leading-none">
                          <Droplets size={12} className="text-info" />
                          <span>{t('characters.bubbleShopPurchaseCost', { cost })}</span>
                        </span>
                      </div>
                      {isLocked ? (
                        <div className="mt-1 text-xs text-warning">
                          {t('characters.bubbleShopDowntimeLocked')}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="text-[11px] text-base-content/45">
                        {t('characters.bubbleShopPurchaseMax', { max: maxLabel })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          modifier="square"
                          disabled={form.processing || isLocked || form.data[type] <= 0}
                          aria-label={`${label} -1`}
                          title={`${label} -1`}
                          onClick={() => form.setData(type, Math.max(0, form.data[type] - 1))}
                        >
                          <Minus size={12} />
                        </Button>
                        <div
                          className={cn(
                            'flex h-8 min-w-12 items-center justify-center rounded-md border border-base-300 bg-base-200 px-2 text-sm font-semibold tabular-nums',
                            isLocked && 'border-base-200 bg-base-200/60 text-base-content/40',
                          )}
                          aria-label={`${label}: ${form.data[type]}`}
                        >
                          {form.data[type]}
                        </div>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          modifier="square"
                          disabled={
                            form.processing
                            || isLocked
                            || (max !== null && form.data[type] >= max)
                            || (maxEffectiveSpendWithoutDownlevel !== null && getCharacterBubbleShopEffectiveSpend(character, {
                              ...form.data,
                              [type]: max === null ? (form.data[type] + 1) : Math.min(max, form.data[type] + 1),
                            }) > maxEffectiveSpendWithoutDownlevel)
                          }
                          aria-label={`${label} +1`}
                          title={`${label} +1`}
                          onClick={() => form.setData(type, max === null ? (form.data[type] + 1) : Math.min(max, form.data[type] + 1))}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {errors[type] ? <p className="mt-2 text-xs text-error">{String(errors[type])}</p> : null}
                </div>
              )
            })}
          </div>
          {errors.bubble_shop ? <p className="text-xs text-error">{String(errors.bubble_shop)}</p> : null}
        </div>
      </ModalContent>
      <ModalAction onClick={submit} disabled={form.processing}>
        {t('common.save')}
      </ModalAction>
      </Modal>
    </>
  )
}
