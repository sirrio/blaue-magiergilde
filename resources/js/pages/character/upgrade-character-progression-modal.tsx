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

const UpgradeCharacterProgressionModal = ({ character, trigger }: { character: Character; trigger?: React.ReactNode }) => {
  const t = useTranslate()
  const { errors, activeLevelProgressionVersionId } = usePage<PageProps>().props
  if (typeof activeLevelProgressionVersionId !== 'number' || activeLevelProgressionVersionId <= 0) {
    throw new Error('Missing active level progression version in page props.')
  }
  const initialLevel = clampLevel(calculateLevel(character))
  const targetVersionId = activeLevelProgressionVersionId
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

  const currentAvailableBubbles = Math.max(
    0,
    calculateBubble(character) +
      additionalBubblesForStartTier(character.start_tier) -
      (bubbleAdjustmentsCount ? Number(character.bubble_shop_spend ?? 0) : 0),
  )
  const minimumAllowedAvailableBubbles = manualTracking
    ? Math.max(
        0,
        immutableAdventureBubbles +
          (bubbleAdjustmentsCount ? Number(character.dm_bubbles ?? 0) : 0) +
          additionalBubblesForStartTier(character.start_tier) -
          (bubbleAdjustmentsCount ? Number(character.bubble_shop_spend ?? 0) : 0),
      )
    : bubblesRequiredForLevel(initialLevel, targetVersionId)

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

  const minSelectableLevel = character.is_filler ? 1 : manualTracking ? levelFromAvailableBubbles(minimumAllowedAvailableBubbles, targetVersionId) : initialLevel

  const maxSelectableLevel = hasPseudoAdventure ? recalculatedLevel : manualTracking ? MAX_LEVEL : recalculatedLevel
  const levelRestrictionReason = t('characters.levelRestrictionReason', { level: minSelectableLevel })
  const maxLevelRestrictionReason = t('characters.upgradeLevelCurveMaxLevelReason', { level: recalculatedLevel })

  const { data, setData, post, processing } = useForm({
    level: manualTracking ? Math.max(initialLevel, minSelectableLevel) : recalculatedLevel,
    bubbles_in_level: initialBubblesInLevel,
  })
  const [isOpen, setIsOpen] = useState(false)

  const rawTargetLevel = clampLevel(Number.isFinite(Number(data.level)) ? Number(data.level) : initialLevel)
  const targetLevel = Math.min(maxSelectableLevel, Math.max(minSelectableLevel, rawTargetLevel))

  const selectedLevelFloor = bubblesRequiredForLevel(targetLevel, targetVersionId)
  const selectedLevelMaxByCurve = targetLevel >= 20 ? 0 : Math.max(0, bubblesRequiredForNextLevel(targetLevel, targetVersionId) - 1)
  const selectedLevelMinByExactFloor = manualTracking ? Math.max(0, minimumAllowedAvailableBubbles - selectedLevelFloor) : 0
  const selectedLevelMaxByCurrent = manualTracking ? selectedLevelMaxByCurve : Math.max(0, currentAvailableBubbles - selectedLevelFloor)
  const minBubblesInSelectedLevel = targetLevel >= 20 ? 0 : Math.min(selectedLevelMaxByCurve, selectedLevelMinByExactFloor)
  const maxBubblesInSelectedLevel = targetLevel >= 20 ? 0 : Math.min(selectedLevelMaxByCurve, selectedLevelMaxByCurrent)
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
  const canSetBubbles = targetLevel < 20 && displayedBubblesInSelectedLevel > 0

  const oldCurveBubblesInLevel = initialLevel >= 20 ? null : Math.max(0, currentAvailableBubbles - bubblesRequiredForLevel(initialLevel, currentVersionId))
  const oldCurveMaxBubblesInLevel = initialLevel >= 20 ? null : Math.max(0, bubblesRequiredForNextLevel(initialLevel, currentVersionId))
  const newCurveMaxBubblesInLevel = targetLevel >= 20 ? null : Math.max(0, bubblesRequiredForNextLevel(targetLevel, targetVersionId))
  const additionalBubbleShopSpend = manualTracking ? 0 : Math.max(0, currentAvailableBubbles - targetAvailableBubbles)
  const hasChanges = targetVersionId !== (character.progression_version_id ?? null) || targetAvailableBubbles !== initialAvailableBubbles

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const defaultLevel = manualTracking ? Math.max(initialLevel, minSelectableLevel) : recalculatedLevel
    const defaultLevelFloor = bubblesRequiredForLevel(defaultLevel, targetVersionId)
    const defaultMinBubbles =
      defaultLevel >= 20
        ? 0
        : Math.min(
            Math.max(0, bubblesRequiredForNextLevel(defaultLevel, targetVersionId) - 1),
            manualTracking ? Math.max(0, minimumAllowedAvailableBubbles - defaultLevelFloor) : 0,
          )
    const defaultMaxBubbles =
      defaultLevel >= 20
        ? 0
        : Math.min(
            Math.max(0, bubblesRequiredForNextLevel(defaultLevel, targetVersionId) - 1),
            manualTracking ? Number.POSITIVE_INFINITY : Math.max(0, currentAvailableBubbles - defaultLevelFloor),
          )
    const defaultBubbles =
      defaultLevel === initialLevel || (!manualTracking && defaultLevel === recalculatedLevel) ? initialBubblesInLevel : defaultMinBubbles

    setData({
      level: defaultLevel,
      bubbles_in_level: clampBubbleProgress(defaultBubbles, defaultMinBubbles, defaultMaxBubbles),
    })
  }, [
    currentAvailableBubbles,
    minimumAllowedAvailableBubbles,
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
    const minBubbles =
      clampedLevel >= 20
        ? 0
        : Math.min(
            Math.max(0, bubblesRequiredForNextLevel(clampedLevel, targetVersionId) - 1),
            manualTracking ? Math.max(0, minimumAllowedAvailableBubbles - levelFloor) : 0,
          )
    const maxBubbles =
      clampedLevel >= 20
        ? 0
        : Math.min(
            Math.max(0, bubblesRequiredForNextLevel(clampedLevel, targetVersionId) - 1),
            manualTracking ? Number.POSITIVE_INFINITY : Math.max(0, currentAvailableBubbles - levelFloor),
          )
    const defaultBubbles =
      clampedLevel === initialLevel || (!manualTracking && clampedLevel === recalculatedLevel) ? initialBubblesInLevel : minBubbles

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
          <span onClick={() => setIsOpen(true)} onMouseDown={(event) => event.stopPropagation()}>
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
        <div className="space-y-4">
          {/* Vorher / Nachher */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-base-200 bg-base-200/30 p-3 text-center">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-base-content/40">Aktuell</div>
              <div className="text-3xl font-bold tabular-nums text-base-content/50">{initialLevel}</div>
              {oldCurveBubblesInLevel !== null && oldCurveMaxBubblesInLevel !== null && oldCurveMaxBubblesInLevel > 0 ? (
                <div className="mt-1 flex items-center justify-center gap-0.5 text-[11px] tabular-nums text-base-content/35">
                  <Droplets size={10} />
                  <span>{oldCurveBubblesInLevel} / {oldCurveMaxBubblesInLevel}</span>
                </div>
              ) : (
                <div className="mt-1 text-[10px] text-base-content/30">alte Kurve</div>
              )}
            </div>
            <div className="rounded-lg border border-primary/25 bg-primary/7 p-3 text-center">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-primary/60">
                {manualTracking || targetLevel !== recalculatedLevel ? 'Ziel' : 'Neu berechnet'}
              </div>
              <div className="text-3xl font-bold tabular-nums text-primary">{targetLevel}</div>
              {newCurveMaxBubblesInLevel !== null && newCurveMaxBubblesInLevel > 0 ? (
                <div className="mt-1 flex items-center justify-center gap-0.5 text-[11px] tabular-nums text-primary/45">
                  <Droplets size={10} />
                  <span>{targetBubblesInLevel} / {newCurveMaxBubblesInLevel}</span>
                </div>
              ) : (
                <div className="mt-1 text-[10px] text-primary/50">neue Kurve</div>
              )}
            </div>
          </div>

          {/* Floor-Hinweis als plain text, nur wenn relevant */}
          {!manualTracking && minSelectableLevel > 1 ? (
            <p className="text-[11px] leading-relaxed text-base-content/50">
              {t('characters.upgradeLevelCurveAdventureFloorHint', { level: minSelectableLevel, maxLevel: recalculatedLevel })}
            </p>
          ) : null}
          {manualTracking && !character.is_filler && minSelectableLevel > 1 ? (
            <p className="text-[11px] text-base-content/50">
              {t('characters.minAllowedLevel', { level: minSelectableLevel })}
            </p>
          ) : null}

          {/* Level-Grid */}
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-base-content/50">{t('characters.selectLevel')}</p>
            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
              {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((level) => {
                const isDisabled = processing || level < minSelectableLevel || level > maxSelectableLevel
                const isSelected = targetLevel === level
                const isPast = level < targetLevel
                const buttonReason = level > maxSelectableLevel ? maxLevelRestrictionReason : levelRestrictionReason

                return (
                  <div key={level} className="w-full" title={isDisabled ? buttonReason : undefined}>
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
                      title={isDisabled ? buttonReason : t('characters.setLevelAria', { level })}
                    >
                      {level}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bubble-Grid */}
          {canSetBubbles ? (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">{t('characters.selectBubblesInLevel')}</p>
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
          ) : null}

          {/* Bubble-Shop-Impact — nur wenn tatsächlich Auswirkung */}
          {!manualTracking && additionalBubbleShopSpend > 0 ? (
            <div className="rounded-md border border-warning/20 bg-warning/8 px-3 py-2.5 text-xs leading-relaxed text-base-content/70">
              {t('characters.upgradeLevelCurveSpendPreview', { count: additionalBubbleShopSpend })}
            </div>
          ) : null}

          {errors.level ? <p className="text-xs text-error">{errors.level}</p> : null}

          {/* Einzelner kontextueller Hinweis */}
          <div className="rounded-md border border-base-200 bg-base-200/30 px-3 py-2.5 text-[11px] leading-relaxed text-base-content/55">
            {manualTracking ? t('characters.upgradeLevelCurveHint') : t('characters.upgradeLevelCurveAdventureHint')}
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
