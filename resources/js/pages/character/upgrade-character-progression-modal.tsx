import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { calculateBubble } from '@/helper/calculateBubble'
import { calculateLevel } from '@/helper/calculateLevel'
import { bubblesRequiredForLevel, bubblesRequiredForNextLevel, clampLevel, levelFromAvailableBubbles } from '@/helper/levelProgression'
import { countsBubbleAdjustmentsForProgression, usesManualLevelTracking } from '@/helper/usesManualLevelTracking'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Droplets, RefreshCcw } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

const MAX_LEVEL = 20

const bubblesForAdventure = (duration: number, hasAdditionalBubble: boolean): number => {
  return Math.floor(duration / 10800) + (hasAdditionalBubble ? 1 : 0)
}

const clampBubbleProgress = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

const UpgradeCharacterProgressionModal = ({
  character,
  trigger,
}: {
  character: Character
  trigger?: React.ReactNode
}) => {
  const t = useTranslate()
  const { errors, activeLevelProgressionVersionId } = usePage<PageProps>().props
  const initialLevel = clampLevel(calculateLevel(character))
  const targetVersionId = activeLevelProgressionVersionId ?? character.progression_version_id ?? 1
  const currentVersionId = character.progression_version_id ?? targetVersionId
  const manualTracking = usesManualLevelTracking(character)
  const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character)

  const adventuresSorted = useMemo(() => {
    return [...character.adventures].sort((a, b) => {
      const dateOrder = String(b.start_date).localeCompare(String(a.start_date))
      if (dateOrder !== 0) {
        return dateOrder
      }

      return b.id - a.id
    })
  }, [character.adventures])

  const latestPseudoAdventure = adventuresSorted.find((a) => a.is_pseudo) ?? null
  const hasPseudoAdventure = latestPseudoAdventure !== null

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

  const currentAvailableBubbles = Math.max(
    0,
    calculateBubble(character)
      + additionalBubblesForStartTier(character.start_tier)
      - (bubbleAdjustmentsCount ? Number(character.bubble_shop_spend ?? 0) : 0),
  )
  const currentBubblesInDisplayedLevel = Math.max(
    0,
    currentAvailableBubbles - bubblesRequiredForLevel(initialLevel, currentVersionId),
  )
  const exactMinimumAvailableBubbles = manualTracking
    ? Math.max(
        0,
        immutableAdventureBubbles
          + (bubbleAdjustmentsCount ? Number(character.dm_bubbles ?? 0) : 0)
          + additionalBubblesForStartTier(character.start_tier)
          - (bubbleAdjustmentsCount ? Number(character.bubble_shop_spend ?? 0) : 0),
      )
    : bubblesRequiredForLevel(initialLevel, targetVersionId) + currentBubblesInDisplayedLevel

  const recalculatedLevel = levelFromAvailableBubbles(currentAvailableBubbles, targetVersionId)

  const initialBubblesInLevel = manualTracking
    ? (() => {
        const pseudo = adventuresSorted.find((a) => a.is_pseudo) ?? null
        if (!pseudo || pseudo.target_bubbles == null || pseudo.target_level == null) {
          return 0
        }

        return Math.max(
          0,
          Number(pseudo.target_bubbles) - bubblesRequiredForLevel(Number(pseudo.target_level), pseudo.progression_version_id ?? targetVersionId),
        )
      })()
    : Math.max(0, currentAvailableBubbles - bubblesRequiredForLevel(recalculatedLevel, targetVersionId))

  const minSelectableLevel = character.is_filler
    ? 1
    : levelFromAvailableBubbles(exactMinimumAvailableBubbles, targetVersionId)

  const maxSelectableLevel = hasPseudoAdventure ? recalculatedLevel : manualTracking ? MAX_LEVEL : recalculatedLevel
  const levelRestrictionReason = t('characters.levelRestrictionReason', { level: minSelectableLevel })
  const maxLevelRestrictionReason = t('characters.upgradeLevelCurveMaxLevelReason', { level: recalculatedLevel })

  const { data, setData, post, processing } = useForm({
    level: manualTracking ? Math.max(initialLevel, minSelectableLevel) : recalculatedLevel,
    bubbles_in_level: initialBubblesInLevel,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null)

  const rawTargetLevel = clampLevel(Number.isFinite(Number(data.level)) ? Number(data.level) : initialLevel)
  const targetLevel = Math.min(maxSelectableLevel, Math.max(minSelectableLevel, rawTargetLevel))

  const selectedLevelFloor = bubblesRequiredForLevel(targetLevel, targetVersionId)
  const selectedLevelMaxByCurve = targetLevel >= 20
    ? 0
    : Math.max(0, bubblesRequiredForNextLevel(targetLevel, targetVersionId) - 1)
  const selectedLevelMinByExactFloor = Math.max(0, exactMinimumAvailableBubbles - selectedLevelFloor)
  const selectedLevelMaxByCurrent = manualTracking
    ? selectedLevelMaxByCurve
    : Math.max(0, currentAvailableBubbles - selectedLevelFloor)
  const minBubblesInSelectedLevel = targetLevel >= 20
    ? 0
    : Math.min(selectedLevelMaxByCurve, selectedLevelMinByExactFloor)
  const maxBubblesInSelectedLevel = targetLevel >= 20
    ? 0
    : Math.min(selectedLevelMaxByCurve, selectedLevelMaxByCurrent)
  const displayedBubblesInSelectedLevel = selectedLevelMaxByCurve
  const targetBubblesInLevel = clampBubbleProgress(
    Number.isFinite(Number(data.bubbles_in_level)) ? Number(data.bubbles_in_level) : 0,
    minBubblesInSelectedLevel,
    maxBubblesInSelectedLevel,
  )
  const targetAvailableBubbles = selectedLevelFloor + targetBubblesInLevel

  const initialAvailableBubbles = manualTracking
    ? bubblesRequiredForLevel(initialLevel, targetVersionId) + initialBubblesInLevel
    : currentAvailableBubbles
  const levelDelta = targetLevel - initialLevel
  const canSetBubbles = targetLevel < 20 && displayedBubblesInSelectedLevel > 0
  const additionalBubbleShopSpend = manualTracking
    ? 0
    : Math.max(0, currentAvailableBubbles - targetAvailableBubbles)
  const resultingBubbleShopSpend = Number(character.bubble_shop_spend ?? 0) + additionalBubbleShopSpend
  const hasChanges = targetVersionId !== (character.progression_version_id ?? null)
    || targetAvailableBubbles !== initialAvailableBubbles

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const defaultLevel = manualTracking ? Math.max(initialLevel, minSelectableLevel) : recalculatedLevel
    const defaultLevelFloor = bubblesRequiredForLevel(defaultLevel, targetVersionId)
    const defaultMinBubbles = defaultLevel >= 20
      ? 0
      : Math.min(
          Math.max(0, bubblesRequiredForNextLevel(defaultLevel, targetVersionId) - 1),
          Math.max(0, exactMinimumAvailableBubbles - defaultLevelFloor),
        )
    const defaultMaxBubbles = defaultLevel >= 20
      ? 0
      : Math.min(
          Math.max(0, bubblesRequiredForNextLevel(defaultLevel, targetVersionId) - 1),
          manualTracking ? Number.POSITIVE_INFINITY : Math.max(0, currentAvailableBubbles - defaultLevelFloor),
        )
    const defaultBubbles = defaultLevel === initialLevel || (!manualTracking && defaultLevel === recalculatedLevel)
      ? initialBubblesInLevel
      : defaultMinBubbles

    setData({
      level: defaultLevel,
      bubbles_in_level: clampBubbleProgress(defaultBubbles, defaultMinBubbles, defaultMaxBubbles),
    })
  }, [
    currentAvailableBubbles,
    exactMinimumAvailableBubbles,
    initialBubblesInLevel,
    initialLevel,
    isOpen,
    manualTracking,
    minSelectableLevel,
    recalculatedLevel,
    setData,
    targetVersionId,
  ])

  useEffect(() => {
    if (!isOpen) {
      setHoveredLevel(null)
    }
  }, [isOpen])

  useEffect(() => {
    const normalizedLevel = targetLevel
    const normalizedBubbles = targetBubblesInLevel

    if (normalizedLevel !== data.level || normalizedBubbles !== data.bubbles_in_level) {
      setData((prev) => ({
        ...prev,
        level: normalizedLevel,
        bubbles_in_level: normalizedBubbles,
      }))
    }
  }, [data.bubbles_in_level, data.level, setData, targetBubblesInLevel, targetLevel])

  const setLevel = (value: number) => {
    const clampedLevel = Math.min(maxSelectableLevel, Math.max(minSelectableLevel, clampLevel(value)))
    const levelFloor = bubblesRequiredForLevel(clampedLevel, targetVersionId)
    const minBubbles = clampedLevel >= 20
      ? 0
      : Math.min(
          Math.max(0, bubblesRequiredForNextLevel(clampedLevel, targetVersionId) - 1),
          Math.max(0, exactMinimumAvailableBubbles - levelFloor),
        )
    const maxBubbles = clampedLevel >= 20
      ? 0
      : Math.min(
          Math.max(0, bubblesRequiredForNextLevel(clampedLevel, targetVersionId) - 1),
          manualTracking ? Number.POSITIVE_INFINITY : Math.max(0, currentAvailableBubbles - levelFloor),
        )
    const defaultBubbles = clampedLevel === initialLevel || (!manualTracking && clampedLevel === recalculatedLevel)
      ? initialBubblesInLevel
      : minBubbles

    setData((prev) => ({
      ...prev,
      level: clampedLevel,
      bubbles_in_level: clampBubbleProgress(defaultBubbles, minBubbles, maxBubbles),
    }))
  }

  const handleSubmit = () => {
    post(route('characters.upgrade-progression', character.id), {
      preserveScroll: true,
      preserveState: 'errors',
      onSuccess: () => setIsOpen(false),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        {trigger ? (
          <span
            onClick={() => setIsOpen(true)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {trigger}
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-center gap-1"
            aria-label={t('characters.upgradeLevelCurve')}
            title={t('characters.upgradeLevelCurve')}
            onClick={() => setIsOpen(true)}
          >
            <RefreshCcw size={14} />
            <span>{t('characters.upgradeLevelCurve')}</span>
          </Button>
        )}
      </ModalTrigger>
      <ModalTitle>
        <span className="inline-flex items-center gap-2">
          <RefreshCcw size={16} />
          {t('characters.upgradeLevelCurveTitle')}
        </span>
      </ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <p className="text-xs leading-5 text-base-content/75 sm:text-sm">
            {t('characters.upgradeLevelCurveBody')}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">{t('characters.currentLevel', { level: initialLevel })}</span>
            {targetVersionId !== currentVersionId ? (
              <span className="rounded-full border border-info/30 bg-info/10 px-2 py-1 text-info">
                {t('characters.recalculatedLevel', { level: recalculatedLevel })}
              </span>
            ) : null}
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-primary">{t('characters.targetLevel', { level: targetLevel })}</span>
            {manualTracking && hasChanges ? (
              <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">
                {levelDelta > 0 ? '+' : ''}
                {levelDelta}
              </span>
            ) : null}
            {manualTracking && !character.is_filler ? (
              <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">{t('characters.minAllowedLevel', { level: minSelectableLevel })}</span>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-base-content/50">{t('characters.selectLevel')}</p>
            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
              {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
                const isDisabled = processing || level < minSelectableLevel || level > maxSelectableLevel
                const isSelected = targetLevel === level
                const isBelowSelection = level < targetLevel && !isDisabled
                const isAboveSelection = level > targetLevel && !isDisabled
                const isBelowHoverPreview = hoveredLevel !== null && level < hoveredLevel && !isDisabled
                const isStrongAboveSelection = isAboveSelection && !isBelowHoverPreview
                const buttonReason = level > maxSelectableLevel ? maxLevelRestrictionReason : levelRestrictionReason

                return (
                  <div
                    key={level}
                    className="w-full"
                    title={isDisabled ? buttonReason : undefined}
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
                      title={isDisabled ? buttonReason : t('characters.setLevelAria', { level })}
                    >
                      {level}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          {canSetBubbles ? (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">
                {t('characters.selectBubblesInLevel')}
              </p>
              <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
                {Array.from({ length: displayedBubblesInSelectedLevel }, (_, i) => {
                  const bubbleIndex = i + 1
                  const isDisabled = bubbleIndex < minBubblesInSelectedLevel || bubbleIndex > maxBubblesInSelectedLevel
                  const isSelected = bubbleIndex <= targetBubblesInLevel && !isDisabled
                  const isBelowSelection = bubbleIndex < targetBubblesInLevel && !isDisabled
                  const isAboveSelection = bubbleIndex > targetBubblesInLevel && !isDisabled

                  return (
                    <Button
                      key={i}
                      size="xs"
                      variant="ghost"
                      type="button"
                      disabled={processing || isDisabled}
                      onClick={() => setData('bubbles_in_level', targetBubblesInLevel === bubbleIndex ? Math.max(minBubblesInSelectedLevel, bubbleIndex - 1) : bubbleIndex)}
                      aria-label={`${bubbleIndex} Bubble${bubbleIndex !== 1 ? 's' : ''}`}
                      className={cn(
                        'w-full justify-center gap-1 border transition-colors',
                        isDisabled && 'cursor-not-allowed border-base-300/50 text-base-content/20',
                        isBelowSelection && !isSelected && 'border-base-300/80 bg-base-200/40 text-base-content/60 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                        isAboveSelection && !isSelected && 'border-primary/60 text-primary hover:bg-primary/10',
                        isSelected && 'border-primary bg-primary/15 font-semibold text-primary',
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
          ) : null}

          {!manualTracking ? (
            <div className="rounded-box border border-base-300/70 bg-base-200/25 p-2.5 text-xs text-base-content/75 sm:text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{t('characters.upgradeLevelCurveSpendPreview', { count: additionalBubbleShopSpend })}</span>
                <span>{t('characters.upgradeLevelCurveTotalSpendPreview', { count: resultingBubbleShopSpend })}</span>
              </div>
            </div>
          ) : null}

          {errors.level ? <p className="text-xs text-error">{errors.level}</p> : null}

          <div className="rounded-box border border-info/20 bg-info/8 p-2.5 text-[11px] leading-5 text-base-content/75 sm:text-xs">
            {manualTracking
              ? t('characters.upgradeLevelCurveHint')
              : t('characters.upgradeLevelCurveAdventureHint')}
          </div>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing || !hasChanges}>
        {t('characters.upgradeLevelCurveApply')}
      </ModalAction>
    </Modal>
  )
}

export default UpgradeCharacterProgressionModal
