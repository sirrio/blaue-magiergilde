import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { calculateLevel } from '@/helper/calculateLevel'
import { clampLevel, levelFromAvailableBubbles } from '@/helper/levelProgression'
import { countsBubbleAdjustmentsForProgression } from '@/helper/usesManualLevelTracking'
import { useTranslate } from '@/lib/i18n'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Gauge } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const MAX_LEVEL = 20

const bubblesForAdventure = (duration: number, hasAdditionalBubble: boolean): number => {
  return Math.floor(duration / 10800) + (hasAdditionalBubble ? 1 : 0)
}

const additionalBubblesForStartTier = (startTier?: Character['start_tier']): number => {
  if (startTier === 'lt') return 10
  if (startTier === 'ht') return 55
  return 0
}

const SetCharacterLevelModal = ({
  character,
  triggerClassName,
  showLabel = false,
  labelClassName,
}: {
  character: Character
  triggerClassName?: string
  showLabel?: boolean
  labelClassName?: string
}) => {
  const t = useTranslate()
  const { errors } = usePage<PageProps>().props
  const initialLevel = clampLevel(calculateLevel(character))
  const { data, setData, post, processing } = useForm({ level: initialLevel })
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null)
  const targetLevel = clampLevel(Number.isFinite(Number(data.level)) ? Number(data.level) : initialLevel)
  const levelDelta = targetLevel - initialLevel
  const hasChanges = levelDelta !== 0
  const adventuresSorted = [...character.adventures].sort((a, b) => {
    const dateOrder = String(b.start_date).localeCompare(String(a.start_date))
    if (dateOrder !== 0) {
      return dateOrder
    }
    return b.id - a.id
  })
  const latestPseudoAdventure = adventuresSorted.find((a) => a.is_pseudo) ?? null
  const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character)

  // Only real adventures AFTER the last pseudo count towards the immutable
  // floor — earlier ones are superseded by the pseudo level override.
  const immutableAdventureBubbles = latestPseudoAdventure
    ? Math.max(
        0,
        character.adventures
          .filter((a) => !a.is_pseudo && (
            String(a.start_date) > String(latestPseudoAdventure.start_date)
            || (String(a.start_date) === String(latestPseudoAdventure.start_date) && a.id > latestPseudoAdventure.id)
          ))
          .reduce((sum, a) => sum + bubblesForAdventure(a.duration, a.has_additional_bubble), 0),
      )
    : Math.max(
        0,
        character.adventures.reduce((sum, a) => sum + bubblesForAdventure(a.duration, a.has_additional_bubble), 0),
      )
  const minAllowedLevel = levelFromAvailableBubbles(
    immutableAdventureBubbles
      + (bubbleAdjustmentsCount ? Number(character.dm_bubbles ?? 0) : 0)
      + additionalBubblesForStartTier(character.start_tier)
      - (bubbleAdjustmentsCount ? Number(character.bubble_shop_spend ?? 0) : 0),
  )
  const minSelectableLevel = character.is_filler ? 1 : minAllowedLevel
  const levelRestrictionReason = t('characters.levelRestrictionReason', { level: minSelectableLevel })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setData('level', Math.max(initialLevel, minSelectableLevel))
  }, [initialLevel, isOpen, minSelectableLevel, setData])

  useEffect(() => {
    if (!isOpen) {
      setHoveredLevel(null)
    }
  }, [isOpen])

  const setLevel = (value: number) => {
    setData('level', clampLevel(value))
  }

  const handleSubmit = () => {
    post(route('characters.quick-level', character.id), {
      preserveScroll: true,
      preserveState: 'errors',
      onSuccess: () => setIsOpen(false),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="sm"
          className={triggerClassName ?? 'w-full justify-center gap-1'}
          aria-label={t('characters.setLevel')}
          title={t('characters.setLevel')}
          onClick={() => setIsOpen(true)}
        >
          <Gauge size={14} />
          {showLabel ? <span className={labelClassName}>{t('characters.setLevel')}</span> : <span className="md:hidden">{t('characters.setLevel')}</span>}
        </Button>
      </ModalTrigger>
      <ModalTitle>
        <span className="inline-flex items-center gap-2">
          <Gauge size={16} />
          {t('characters.setLevelTitle')}
        </span>
      </ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">{t('characters.currentLevel', { level: initialLevel })}</span>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-primary">{t('characters.targetLevel', { level: targetLevel })}</span>
            {hasChanges ? (
              <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">
                {levelDelta > 0 ? '+' : ''}
                {levelDelta}
              </span>
            ) : null}
            {!character.is_filler ? (
              <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">{t('characters.minAllowedLevel', { level: minSelectableLevel })}</span>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-base-content/50">{t('characters.selectLevel')}</p>
            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
              {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
                const isDisabled = processing || level < minSelectableLevel
                const isSelected = targetLevel === level
                const isBelowSelection = level < targetLevel && !isDisabled
                const isAboveSelection = level > targetLevel && !isDisabled
                const isBelowHoverPreview = hoveredLevel !== null && level < hoveredLevel && !isDisabled
                const isStrongAboveSelection = isAboveSelection && !isBelowHoverPreview

                return (
                  <div
                    key={level}
                    className="w-full"
                    title={isDisabled ? levelRestrictionReason : undefined}
                  >
                    <Button
                      size="xs"
                      variant="ghost"
                      className={cn(
                        'w-full justify-center border transition-colors',
                        isBelowSelection && !isSelected && 'border-base-300/80 bg-base-200/40 text-base-content/60 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                        isStrongAboveSelection && !isSelected && 'border-primary/60 text-primary hover:bg-primary/10',
                        isSelected && 'border-primary bg-primary/15 font-semibold text-primary',
                        isBelowHoverPreview && !isSelected && 'border-base-300/80 bg-primary/10 text-primary',
                      )}
                      onClick={() => setLevel(level)}
                      onMouseEnter={() => setHoveredLevel(level)}
                      onMouseLeave={() => setHoveredLevel(null)}
                      disabled={isDisabled}
                      aria-label={t('characters.setLevelAria', { level })}
                      title={isDisabled ? levelRestrictionReason : t('characters.setLevelAria', { level })}
                    >
                      {level}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
          {errors.level ? <p className="text-xs text-error">{errors.level}</p> : null}

          <div className="rounded-box border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            {t('characters.applyLevelHint')}
          </div>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing || !hasChanges}>
        {t('characters.applyLevel')}
      </ModalAction>
    </Modal>
  )
}

export default SetCharacterLevelModal
