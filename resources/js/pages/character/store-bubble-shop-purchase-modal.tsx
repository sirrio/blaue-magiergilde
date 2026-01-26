import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { Character, PageProps } from '@/types'
import { router, usePage } from '@inertiajs/react'
import { Coins } from 'lucide-react'
import React, { useState } from 'react'

type PurchaseOption = {
  value: 'skill_prof' | 'rare_language' | 'language' | 'tool'
  label: string
  cost: number
  disabled?: boolean
  disabledReason?: string
  usageText?: string
}

const StoreBubbleShopPurchaseModal = ({
  character,
  options,
  availableBubbles,
  summary,
  trigger,
}: {
  character: Character
  options: PurchaseOption[]
  availableBubbles: number
  summary?: {
    skillUsed: number
    rareUsed: number
    sharedUsed: number
  }
  trigger?: React.ReactNode
}) => {
  const { errors } = usePage<PageProps>().props
  const [pendingType, setPendingType] = useState<PurchaseOption['value'] | null>(null)
  const hasEnabledOption = options.some((option) => !option.disabled)
  const isSubmitting = pendingType !== null

  const handlePurchase = (option: PurchaseOption) => {
    if (option.disabled || isSubmitting) return

    setPendingType(option.value)
    router.post(
      route('characters.shop-purchases.store', { character: character.id }),
      { type: option.value },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => setPendingType(null),
      },
    )
  }

  return (
    <Modal>
      <ModalTrigger>
        {trigger ?? (
          <button type="button" className="btn btn-sm">
            <Coins size={14} />
            Add purchase
          </button>
        )}
      </ModalTrigger>
      <ModalTitle>Bubble Shop Purchase</ModalTitle>
      <ModalContent>
        <form className="space-y-3">
          <div className="flex items-center justify-between text-xs text-base-content/60">
            <span>Available bubbles</span>
            <span className="badge badge-ghost">{availableBubbles}</span>
          </div>
          <p className="text-xs text-base-content/60">
            Limits: 1 skill proficiency, 1 rare language, 3 combined languages/tools.
          </p>
          {summary ? (
            <div className="grid grid-cols-3 gap-2 rounded-box border border-base-200 bg-base-200/30 px-3 py-2 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-base-content">Skill prof</div>
                <div className="text-base-content/60">{summary.skillUsed}/1 used</div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-base-content">Rare lang</div>
                <div className="text-base-content/60">{summary.rareUsed}/1 used</div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-base-content">Shared</div>
                <div className="text-base-content/60">{summary.sharedUsed}/3 used</div>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            {options.map((option) => {
              const isPending = pendingType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'w-full rounded-box border border-base-200 px-3 py-2 text-left transition hover:border-base-300 hover:bg-base-200/40',
                    option.disabled && 'opacity-60 hover:border-base-200 hover:bg-transparent',
                    isPending && 'border-primary/70 bg-primary/5',
                  )}
                  onClick={() => handlePurchase(option)}
                  disabled={option.disabled || isSubmitting}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{option.label}</div>
                      {option.usageText ? (
                        <div className="text-xs text-base-content/60">{option.usageText}</div>
                      ) : null}
                    </div>
                    <span className="badge badge-outline">{option.cost} bubbles</span>
                  </div>
                  {option.disabledReason ? (
                    <div className="mt-1 text-xs text-warning/80">{option.disabledReason}</div>
                  ) : isPending ? (
                    <div className="mt-1 text-xs text-primary/80">Saving...</div>
                  ) : (
                    <div className="mt-1 text-xs text-base-content/60">
                      Purchase for {option.cost} bubbles.
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          {!hasEnabledOption ? (
            <div className="text-xs text-warning/80">
              No purchases available right now.
            </div>
          ) : null}
          {errors.type ? <div className="text-xs text-error">{errors.type}</div> : null}
        </form>
      </ModalContent>
    </Modal>
  )
}

export default StoreBubbleShopPurchaseModal
