import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import {
  CharacterBubbleShopPurchaseType,
  characterBubbleShopPurchaseTypes,
  getCharacterBubbleShopAdditionalSpend,
  getCharacterBubbleShopCost,
  getCharacterBubbleShopCoveredByLegacy,
  getCharacterBubbleShopEffectiveSpend,
  getCharacterBubbleShopExtraDowntimeSeconds,
  getCharacterBubbleShopLegacySpend,
  getCharacterBubbleShopMaxQuantity,
  getCharacterBubbleShopQuantities,
  getCharacterBubbleShopStructuredSpend,
} from '@/helper/characterBubbleShop'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
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

  const structuredSpend = getCharacterBubbleShopStructuredSpend(character, form.data)
  const legacySpend = getCharacterBubbleShopLegacySpend(character)
  const coveredByLegacy = getCharacterBubbleShopCoveredByLegacy(character, form.data)
  const effectiveSpend = getCharacterBubbleShopEffectiveSpend(character, form.data)
  const additionalSpend = getCharacterBubbleShopAdditionalSpend(character, form.data)
  const extraDowntime = secondsToHourMinuteString(getCharacterBubbleShopExtraDowntimeSeconds(character, form.data))

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
        {showLabel ? <span className={labelClassName}>{t('characters.manageBubbleShop')}</span> : <span className="md:hidden">{t('characters.bubbleShop')}</span>}
      </Button>
      <Modal isOpen={isOpen} onClose={() => !form.processing && setIsOpen(false)}>
      <ModalTitle>{t('characters.manageBubbleShop')}</ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-md border border-base-200 bg-base-100 px-3 py-2">
              <div className="text-base-content/55">{t('characters.bubbleShopLegacyStand')}</div>
              <div className="mt-1 font-semibold">{legacySpend}</div>
            </div>
            <div className="rounded-md border border-base-200 bg-base-100 px-3 py-2">
              <div className="text-base-content/55">{t('characters.bubbleShopStructuredSpend')}</div>
              <div className="mt-1 font-semibold">{structuredSpend}</div>
            </div>
            <div className="rounded-md border border-base-200 bg-base-100 px-3 py-2">
              <div className="text-base-content/55">{t('characters.bubbleShopCoveredByLegacy')}</div>
              <div className="mt-1 font-semibold">{coveredByLegacy}</div>
            </div>
            <div className="rounded-md border border-base-200 bg-base-100 px-3 py-2">
              <div className="text-base-content/55">{t('characters.bubbleShopEffectiveSpend')}</div>
              <div className="mt-1 font-semibold">{effectiveSpend}</div>
            </div>
          </div>

          <div className="rounded-md border border-info/15 bg-info/6 px-3 py-2 text-xs text-base-content/70">
            <div>{t('characters.bubbleShopLegacyHint')}</div>
            <div className="mt-1 inline-flex items-center gap-1 font-medium text-info">
              <Droplets size={12} />
              <span>{t('characters.bubbleShopAdditionalSpendPreview', { count: additionalSpend })}</span>
            </div>
            <div className="mt-1">{t('characters.bubbleShopExtraDowntimePreview', { duration: extraDowntime })}</div>
          </div>

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
                      <div className="text-xs text-base-content/55">
                        {t('characters.bubbleShopPurchaseMeta', { cost, max: maxLabel })}
                      </div>
                      {isLocked ? (
                        <div className="mt-1 text-xs text-warning">
                          {t('characters.bubbleShopDowntimeLocked')}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
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
                        disabled={form.processing || isLocked || (max !== null && form.data[type] >= max)}
                        aria-label={`${label} +1`}
                        title={`${label} +1`}
                        onClick={() => form.setData(type, max === null ? (form.data[type] + 1) : Math.min(max, form.data[type] + 1))}
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                  {errors[type] ? <p className="mt-2 text-xs text-error">{String(errors[type])}</p> : null}
                </div>
              )
            })}
          </div>
        </div>
      </ModalContent>
      <ModalAction onClick={submit} disabled={form.processing}>
        {t('common.save')}
      </ModalAction>
      </Modal>
    </>
  )
}
