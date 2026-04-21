import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
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
import { Droplets, ShoppingBag } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

type BubbleShopFormData = Record<CharacterBubbleShopPurchaseType, number>

const purchaseLabelKey: Record<CharacterBubbleShopPurchaseType, string> = {
  skill_proficiency: 'characters.bubbleShopSkillProficiency',
  rare_language: 'characters.bubbleShopRareLanguage',
  tool_or_language: 'characters.bubbleShopToolOrLanguage',
  lt_downtime: 'characters.bubbleShopLtDowntime',
  ht_downtime: 'characters.bubbleShopHtDowntime',
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

  const baseData = useMemo(() => getCharacterBubbleShopQuantities(character), [character])
  const form = useForm<BubbleShopFormData>(baseData)

  useEffect(() => {
    if (isOpen) {
      form.setData(getCharacterBubbleShopQuantities(character))
      form.clearErrors()
    }
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

  return (
    <Modal isOpen={isOpen} onClose={() => !form.processing && setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="sm"
          className={triggerClassName ?? 'w-full justify-center gap-1'}
          aria-label={t('characters.manageBubbleShop')}
          title={t('characters.manageBubbleShop')}
          onClick={() => setIsOpen(true)}
        >
          <ShoppingBag size={14} />
          {showLabel ? <span className={labelClassName}>{t('characters.manageBubbleShop')}</span> : <span className="md:hidden">{t('characters.bubbleShop')}</span>}
        </Button>
      </ModalTrigger>
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

              return (
                <div key={type} className="rounded-md border border-base-200 bg-base-100 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-base-content/55">
                        {t('characters.bubbleShopPurchaseMeta', { cost, max })}
                      </div>
                      {isLocked ? (
                        <div className="mt-1 text-xs text-warning">
                          {type === 'lt_downtime' ? t('characters.bubbleShopLtLocked') : t('characters.bubbleShopHtLocked')}
                        </div>
                      ) : null}
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={max}
                      step={1}
                      disabled={form.processing || isLocked}
                      className={cn(
                        'input input-sm w-24 text-right',
                        isLocked && 'input-disabled',
                      )}
                      value={String(form.data[type])}
                      onChange={(event) => {
                        const raw = Number(event.target.value)
                        const normalized = Number.isFinite(raw) ? Math.max(0, Math.min(max, Math.floor(raw))) : 0
                        form.setData(type, normalized)
                      }}
                    />
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
  )
}
