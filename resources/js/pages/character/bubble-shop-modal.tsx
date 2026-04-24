import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import { calculateLevel } from '@/helper/calculateLevel'
import {
  CharacterBubbleShopPurchaseType,
  characterBubbleShopPurchaseTypes,
  getCharacterBubbleShopCost,
  getCharacterBubbleShopMaxQuantity,
  getCharacterBubbleShopMaxSpendWithoutDownlevel,
  getCharacterBubbleShopQuantities,
  getCharacterBubbleShopStructuredSpend,
} from '@/helper/characterBubbleShop'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Droplets, Minus, Plus, ShoppingBag } from 'lucide-react'
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

  const currentLevel = calculateLevel(character)
  const currentSpend = getCharacterBubbleShopStructuredSpend(character, form.data)
  const maxSpendWithoutDownlevel = getCharacterBubbleShopMaxSpendWithoutDownlevel(character)
  const remainingSpendableWithoutDownlevel =
    maxSpendWithoutDownlevel === null ? null : Math.max(0, maxSpendWithoutDownlevel - currentSpend)

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
        className={triggerClassName ?? 'w-full justify-center gap-1'}
        aria-label={t('characters.manageBubbleShop')}
        title={t('characters.manageBubbleShop')}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={openModal}
      >
        <ShoppingBag size={14} />
        {showLabel ? (
          <span className={labelClassName}>{t('characters.manageBubbleShop')}</span>
        ) : (
          <span className="md:hidden">{t('characters.bubbleShop')}</span>
        )}
      </Button>
      <Modal isOpen={isOpen} onClose={() => !form.processing && setIsOpen(false)}>
        <ModalTitle>{t('characters.manageBubbleShop')}</ModalTitle>
        <ModalContent>
          <div className="space-y-4">
            {remainingSpendableWithoutDownlevel !== null ? (
              <div className="text-base-content/65 px-1 text-sm">
                {remainingSpendableWithoutDownlevel > 0 ? (
                  <div className="space-y-1">
                    <div>
                      Noch <span className="text-base-content font-semibold">{remainingSpendableWithoutDownlevel}</span>{' '}
                      {t('characters.bubbleShopSpendableFloorBody', {
                        count: remainingSpendableWithoutDownlevel,
                        level: currentLevel,
                      })}
                    </div>
                    <div className="text-base-content/50 text-xs">{t('characters.bubbleShopSpendableFloorSubhint')}</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>{t('characters.bubbleShopSpendableFloorReached', { level: currentLevel })}</div>
                    <div className="text-base-content/50 text-xs">{t('characters.bubbleShopSpendableFloorReachedSubhint')}</div>
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
                  <div key={type} className="border-base-200 bg-base-100 rounded-md border px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{label}</div>
                        <div className="text-base-content/60 mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="border-base-300 bg-base-100 inline-flex items-center gap-1 rounded-md border px-2 py-1 leading-none">
                            <Droplets size={12} className="text-info" />
                            <span>{t('characters.bubbleShopPurchaseCost', { cost })}</span>
                          </span>
                        </div>
                        {isLocked ? <div className="text-warning mt-1 text-xs">{t('characters.bubbleShopDowntimeLocked')}</div> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="text-base-content/45 text-[11px]">{t('characters.bubbleShopPurchaseMax', { max: maxLabel })}</div>
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
                              'border-base-300 bg-base-200 flex h-8 min-w-12 items-center justify-center rounded-md border px-2 text-sm font-semibold tabular-nums',
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
                              form.processing ||
                              isLocked ||
                              (max !== null && form.data[type] >= max) ||
                              (maxSpendWithoutDownlevel !== null &&
                                getCharacterBubbleShopStructuredSpend(character, {
                                  ...form.data,
                                  [type]: max === null ? form.data[type] + 1 : Math.min(max, form.data[type] + 1),
                                }) > maxSpendWithoutDownlevel)
                            }
                            aria-label={`${label} +1`}
                            title={`${label} +1`}
                            onClick={() => form.setData(type, max === null ? form.data[type] + 1 : Math.min(max, form.data[type] + 1))}
                          >
                            <Plus size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {errors[type] ? <p className="text-error mt-2 text-xs">{String(errors[type])}</p> : null}
                  </div>
                )
              })}
            </div>
            {errors.bubble_shop ? <p className="text-error text-xs">{String(errors.bubble_shop)}</p> : null}
          </div>
        </ModalContent>
        <ModalAction onClick={submit} disabled={form.processing}>
          {t('common.save')}
        </ModalAction>
      </Modal>
    </>
  )
}
