import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { calculateLevel } from '@/helper/calculateLevel'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Gauge } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const MIN_LEVEL = 1
const MAX_LEVEL = 20

const clampLevel = (value: number): number => {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(value)))
}

const bubblesForAdventure = (duration: number, hasAdditionalBubble: boolean): number => {
  return Math.floor(duration / 10800) + (hasAdditionalBubble ? 1 : 0)
}

const levelFromBubbles = (availableBubbles: number): number => {
  const effective = Math.max(0, availableBubbles)
  const level = Math.floor(1 + (Math.sqrt(8 * effective + 1) - 1) / 2)

  return clampLevel(level)
}

const additionalBubblesForStartTier = (startTier?: Character['start_tier']): number => {
  if (startTier === 'lt') return 10
  if (startTier === 'ht') return 55
  return 0
}

const SetCharacterLevelModal = ({ character }: { character: Character }) => {
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
  const latestAdventure = adventuresSorted[0]
  const latestPseudo = latestAdventure?.is_pseudo ? latestAdventure : null
  const realAdventureBubbles = character.adventures
    .filter((adventure) => !adventure.is_pseudo)
    .reduce((sum, adventure) => sum + bubblesForAdventure(adventure.duration, adventure.has_additional_bubble), 0)
  const pseudoAdventureBubbles = character.adventures
    .filter((adventure) => Boolean(adventure.is_pseudo))
    .reduce((sum, adventure) => sum + bubblesForAdventure(adventure.duration, adventure.has_additional_bubble), 0)
  const latestPseudoBubbles = latestPseudo ? bubblesForAdventure(latestPseudo.duration, latestPseudo.has_additional_bubble) : 0
  const immutableAdventureBubbles = latestPseudo
    ? Math.max(0, realAdventureBubbles + Math.max(0, pseudoAdventureBubbles - latestPseudoBubbles))
    : Math.max(0, realAdventureBubbles + pseudoAdventureBubbles)
  const minAllowedLevel = levelFromBubbles(
    immutableAdventureBubbles
      + Number(character.dm_bubbles ?? 0)
      + additionalBubblesForStartTier(character.start_tier)
      - Number(character.bubble_shop_spend ?? 0),
  )
  const minSelectableLevel = character.is_filler ? MIN_LEVEL : minAllowedLevel
  const levelRestrictionReason = `Cannot set below level ${minSelectableLevel} due to non-simplified adventure progress.`

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
        <Button size="sm" className="w-full justify-center gap-1" aria-label="Set level" title="Set level" onClick={() => setIsOpen(true)}>
          <Gauge size={14} />
          <span className="md:hidden">Set level</span>
        </Button>
      </ModalTrigger>
      <ModalTitle>
        <span className="inline-flex items-center gap-2">
          <Gauge size={16} />
          Set level
        </span>
      </ModalTitle>
      <ModalContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">Current: {initialLevel}</span>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-primary">Target: {targetLevel}</span>
            {hasChanges ? (
              <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">
                {levelDelta > 0 ? '+' : ''}
                {levelDelta}
              </span>
            ) : null}
            {!character.is_filler ? (
              <span className="rounded-full border border-base-300 px-2 py-1 text-base-content/70">Min allowed: {minSelectableLevel}</span>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-base-content/50">Select level</p>
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
                      aria-label={`Set level ${level}`}
                      title={isDisabled ? levelRestrictionReason : `Set level ${level}`}
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
            Applies simplified-level adjustment. Adventure-based tracking values may become unreliable.
          </div>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing || !hasChanges}>
        Apply level
      </ModalAction>
    </Modal>
  )
}

export default SetCharacterLevelModal
