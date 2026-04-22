import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel, bubblesRequiredForNextLevel, clampLevel, levelFromAvailableBubbles } from '@/helper/levelProgression'
import { countsBubbleAdjustmentsForProgression } from '@/helper/usesManualLevelTracking'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Droplets, Gauge } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  const progressionVersionId = character.progression_version_id ?? undefined
  const initialBubblesInLevel = (() => {
    const pseudo =
      [...character.adventures]
        .sort((a, b) => {
          const d = String(b.start_date).localeCompare(String(a.start_date))
          return d !== 0 ? d : b.id - a.id
        })
        .find((a) => a.is_pseudo) ?? null
    if (!pseudo || pseudo.target_bubbles == null || pseudo.target_level == null) return 0
    return Math.max(0, pseudo.target_bubbles - bubblesRequiredForLevel(pseudo.target_level, pseudo.progression_version_id ?? progressionVersionId))
  })()
  const { data, setData, post, processing } = useForm({ level: initialLevel, bubbles_in_level: initialBubblesInLevel })
  const [isOpen, setIsOpen] = useState(false)
  const targetLevel = clampLevel(Number.isFinite(Number(data.level)) ? Number(data.level) : initialLevel)
  const levelDelta = targetLevel - initialLevel
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
          .filter(
            (a) =>
              !a.is_pseudo &&
              (String(a.start_date) > String(latestPseudoAdventure.start_date) ||
                (String(a.start_date) === String(latestPseudoAdventure.start_date) && a.id > latestPseudoAdventure.id)),
          )
          .reduce((sum, a) => sum + bubblesForAdventure(a.duration, a.has_additional_bubble), 0),
      )
    : Math.max(
        0,
        character.adventures.reduce((sum, a) => sum + bubblesForAdventure(a.duration, a.has_additional_bubble), 0),
      )
  const minAllowedLevel = levelFromAvailableBubbles(
    immutableAdventureBubbles +
      (bubbleAdjustmentsCount ? Number(character.dm_bubbles ?? 0) : 0) +
      additionalBubblesForStartTier(character.start_tier) -
      (bubbleAdjustmentsCount ? Number(character.bubble_shop_spend ?? 0) : 0),
    progressionVersionId,
  )
  const minAllowedAvailableBubbles = Math.max(
    0,
    immutableAdventureBubbles +
      (bubbleAdjustmentsCount ? Number(character.dm_bubbles ?? 0) : 0) +
      additionalBubblesForStartTier(character.start_tier) -
      (bubbleAdjustmentsCount ? Number(character.bubble_shop_spend ?? 0) : 0),
  )
  const minSelectableLevel = character.is_filler ? 1 : minAllowedLevel
  const levelRestrictionReason = t('characters.levelRestrictionReason', { level: minSelectableLevel })
  const bubblesForTargetLevel = bubblesRequiredForNextLevel(targetLevel, progressionVersionId)
  const minBubblesInSelectedLevel =
    targetLevel >= 20
      ? 0
      : Math.min(
          Math.max(0, bubblesForTargetLevel - 1),
          Math.max(0, minAllowedAvailableBubbles - bubblesRequiredForLevel(targetLevel, progressionVersionId)),
        )
  const maxBubblesInSelectedLevel = targetLevel >= 20 ? 0 : Math.max(0, bubblesForTargetLevel - 1)
  const displayedBubblesInSelectedLevel = maxBubblesInSelectedLevel
  const targetBubblesInLevel = Math.max(
    minBubblesInSelectedLevel,
    Math.min(Number.isFinite(Number(data.bubbles_in_level)) ? Number(data.bubbles_in_level) : 0, maxBubblesInSelectedLevel),
  )
  const canSetBubbles = targetLevel < 20 && displayedBubblesInSelectedLevel > 0
  const hasChanges =
    levelDelta !== 0 || (canSetBubbles && targetBubblesInLevel !== (levelDelta === 0 ? initialBubblesInLevel : minBubblesInSelectedLevel))

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const newLevel = Math.max(initialLevel, minSelectableLevel)
    const newMinBubbles =
      newLevel >= 20
        ? 0
        : Math.min(
            Math.max(0, bubblesRequiredForNextLevel(newLevel, progressionVersionId) - 1),
            Math.max(0, minAllowedAvailableBubbles - bubblesRequiredForLevel(newLevel, progressionVersionId)),
          )
    const newMaxBubbles = newLevel >= 20 ? 0 : Math.max(0, bubblesRequiredForNextLevel(newLevel, progressionVersionId) - 1)
    setData((prev) => ({
      ...prev,
      level: newLevel,
      bubbles_in_level: Math.max(newMinBubbles, Math.min(newLevel === initialLevel ? initialBubblesInLevel : newMinBubbles, newMaxBubbles)),
    }))
  }, [initialLevel, initialBubblesInLevel, isOpen, minAllowedAvailableBubbles, minSelectableLevel, progressionVersionId, setData])

  const setLevel = (value: number) => {
    const clamped = clampLevel(value)
    const minBubbles =
      clamped >= 20
        ? 0
        : Math.min(
            Math.max(0, bubblesRequiredForNextLevel(clamped, progressionVersionId) - 1),
            Math.max(0, minAllowedAvailableBubbles - bubblesRequiredForLevel(clamped, progressionVersionId)),
          )
    const maxBubbles = clamped >= 20 ? 0 : Math.max(0, bubblesRequiredForNextLevel(clamped, progressionVersionId) - 1)
    setData((prev) => ({
      ...prev,
      level: clamped,
      bubbles_in_level: Math.max(minBubbles, Math.min(clamped === initialLevel ? initialBubblesInLevel : minBubbles, maxBubbles)),
    }))
  }

  useEffect(() => {
    if (targetBubblesInLevel !== data.bubbles_in_level) {
      setData('bubbles_in_level', targetBubblesInLevel)
    }
  }, [data.bubbles_in_level, setData, targetBubblesInLevel])

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
          {showLabel ? (
            <span className={labelClassName}>{t('characters.setLevel')}</span>
          ) : (
            <span className="md:hidden">{t('characters.setLevel')}</span>
          )}
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
            <span className="border-base-300 text-base-content/70 rounded-full border px-2 py-1">
              {t('characters.currentLevel', { level: initialLevel })}
            </span>
            <span className="border-primary/40 bg-primary/10 text-primary rounded-full border px-2 py-1">
              {t('characters.targetLevel', { level: targetLevel })}
            </span>
            {hasChanges && levelDelta !== 0 ? (
              <span className="border-base-300 text-base-content/70 rounded-full border px-2 py-1">
                {levelDelta > 0 ? '+' : ''}
                {levelDelta}
              </span>
            ) : null}
            {!character.is_filler ? (
              <span className="border-base-300 text-base-content/70 rounded-full border px-2 py-1">
                {t('characters.minAllowedLevel', { level: minSelectableLevel })}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-base-content/50 text-xs tracking-wide uppercase">{t('characters.selectLevel')}</p>
            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
              {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
                const isDisabled = processing || level < minSelectableLevel
                const isSelected = targetLevel === level
                const isPast = level < targetLevel

                return (
                  <div key={level} className="w-full" title={isDisabled ? levelRestrictionReason : undefined}>
                    <Button
                      size="xs"
                      variant="ghost"
                      className={cn(
                        'w-full justify-center border transition-colors',
                        isDisabled && !isPast && 'cursor-not-allowed opacity-20',
                        isPast && isDisabled && 'cursor-not-allowed border-primary/25 bg-primary/8 text-primary/35',
                        isPast && !isDisabled && 'border-primary/50 bg-primary/20 text-primary/70 hover:border-primary/70 hover:bg-primary/30',
                        isSelected && 'border-primary bg-primary text-primary-content font-bold',
                        !isDisabled && !isSelected && !isPast && 'border-base-300 bg-base-100 text-base-content hover:border-primary hover:bg-primary/15 hover:text-primary',
                      )}
                      onClick={() => setLevel(level)}
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
          {canSetBubbles && (
            <div className="space-y-2">
              <p className="text-base-content/50 text-xs tracking-wide uppercase">{t('characters.selectBubblesInLevel')}</p>
              <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
                {Array.from({ length: displayedBubblesInSelectedLevel + 1 }, (_, i) => {
                  const bubbleIndex = i
                  const isDisabled = bubbleIndex < minBubblesInSelectedLevel || bubbleIndex > maxBubblesInSelectedLevel
                  const isSelected = bubbleIndex === targetBubblesInLevel && !isDisabled
                  const isPastFilled = bubbleIndex < targetBubblesInLevel && !isDisabled
                  const isAvailable = bubbleIndex > targetBubblesInLevel && !isDisabled
                  return (
                    <Button
                      key={bubbleIndex}
                      size="xs"
                      variant="ghost"
                      type="button"
                      disabled={processing || isDisabled}
                      onClick={() =>
                        setData(
                          'bubbles_in_level',
                          targetBubblesInLevel === bubbleIndex ? Math.max(minBubblesInSelectedLevel, bubbleIndex - 1) : bubbleIndex,
                        )
                      }
                      aria-label={`${bubbleIndex} Bubble${bubbleIndex !== 1 ? 's' : ''}`}
                      className={cn(
                        'w-full justify-center gap-1 border transition-colors',
                        isDisabled && 'cursor-not-allowed border-primary/25 bg-primary/8 text-primary/35',
                        isSelected && 'border-primary bg-primary text-primary-content font-semibold',
                        isPastFilled && 'border-primary/50 bg-primary/20 text-primary/70',
                        isAvailable && 'border-base-300 bg-base-100 text-base-content/70 hover:border-primary hover:bg-primary/15 hover:text-primary',
                      )}
                      title={`${bubbleIndex} Bubble${bubbleIndex !== 1 ? 's' : ''}`}
                    >
                      <Droplets size={12} />
                      <span>{bubbleIndex}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {errors.level ? <p className="text-error text-xs">{errors.level}</p> : null}

          <div className="rounded-box border-warning/30 bg-warning/10 text-warning border p-3 text-xs">{t('characters.applyLevelHint')}</div>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing || !hasChanges}>
        {t('characters.applyLevel')}
      </ModalAction>
    </Modal>
  )
}

export default SetCharacterLevelModal
