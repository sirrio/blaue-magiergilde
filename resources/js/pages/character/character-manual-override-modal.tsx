import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Pencil } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

type ManualOverrideField = 'adventures' | 'factionRank'

type ManualOverridePayload = {
  manual_adventures_count_enabled?: boolean
  manual_adventures_count?: number
  manual_faction_rank_enabled?: boolean
  manual_faction_rank?: number
}

function manualOverrideConfig(field: ManualOverrideField, t: (key: string) => string) {
  if (field === 'adventures') {
    return {
      enabledKey: 'manual_adventures_count_enabled' as const,
      valueKey: 'manual_adventures_count' as const,
      title: t('characters.manualAdventuresCountLabel'),
      inputLabel: t('characters.manualAdventuresCountLabel'),
      min: 0,
      max: 1024,
    }
  }

  return {
    enabledKey: 'manual_faction_rank_enabled' as const,
    valueKey: 'manual_faction_rank' as const,
    title: t('characters.manualFactionRankLabel'),
    inputLabel: t('characters.manualFactionRankLabel'),
    min: 0,
    max: 5,
  }
}

export default function CharacterManualOverrideModal({
  character,
  field,
  value,
  children,
}: {
  character: Character
  field: ManualOverrideField
  value: number | null
  children?: React.ReactNode
}) {
  const t = useTranslate()
  const { errors } = usePage<PageProps>().props
  const config = manualOverrideConfig(field, t)
  const [isOpen, setIsOpen] = useState(false)
  const wasOpenRef = useRef(false)

  const openOverrideModal = (event?: React.MouseEvent<HTMLElement>): void => {
    event?.preventDefault()
    event?.stopPropagation()
    setIsOpen(true)
  }

  const form = useForm({
    manual_adventures_count_enabled: false,
    manual_adventures_count: 0,
    manual_faction_rank_enabled: false,
    manual_faction_rank: 0,
  })

  const buildPayload = (enabled: boolean): ManualOverridePayload => {
    if (field === 'adventures') {
      return {
        manual_adventures_count_enabled: enabled,
        manual_adventures_count: Number(form.data.manual_adventures_count),
      }
    }

    return {
      manual_faction_rank_enabled: enabled,
      manual_faction_rank: Number(form.data.manual_faction_rank),
    }
  }

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      form.setData({
        manual_adventures_count_enabled: field === 'adventures' && value !== null,
        manual_adventures_count: field === 'adventures' ? (value ?? 0) : 0,
        manual_faction_rank_enabled: field === 'factionRank' && value !== null,
        manual_faction_rank: field === 'factionRank' ? (value ?? 0) : 0,
      })
      form.clearErrors()
    }

    wasOpenRef.current = isOpen
  }, [field, form, isOpen, value])

  const saveOverride = () => {
    form.transform(() => buildPayload(true))
    form.patch(route('characters.manual-overrides', character.id), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setIsOpen(false)
      },
    })
  }

  const resetOverride = () => {
    form.setData(config.enabledKey, false)
    form.transform(() => buildPayload(false))
    form.patch(route('characters.manual-overrides', character.id), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setIsOpen(false)
      },
    })
  }

  const triggerElement = children && React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ onClick?: (event: React.MouseEvent<HTMLElement>) => void; onMouseDown?: (event: React.MouseEvent<HTMLElement>) => void }>, {
        ...(((children as React.ReactElement).props ?? {}) as Record<string, unknown>),
        onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
          ;(children as React.ReactElement<{ onMouseDown?: (event: React.MouseEvent<HTMLElement>) => void }>).props?.onMouseDown?.(event)
          event.stopPropagation()
        },
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          ;(children as React.ReactElement<{ onClick?: (event: React.MouseEvent<HTMLElement>) => void }>).props?.onClick?.(event)
          openOverrideModal(event)
        },
      })
    : (
        <Button
          size="xs"
          variant="ghost"
          modifier="square"
          className="h-4 min-h-0 w-4 p-0 text-base-content/45"
          aria-label={config.title}
          title={config.title}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={openOverrideModal}
        >
          <Pencil size={10} />
        </Button>
      )

  return (
    <>
      {triggerElement}
      <Modal isOpen={isOpen} onClose={() => !form.processing && setIsOpen(false)}>
      <ModalTitle>{config.title}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <p className="text-xs text-base-content/60">{t('characters.manualOverrideHint')}</p>
          {field === 'factionRank' ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-base-content/50">{config.inputLabel}</p>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }, (_, index) => index + 1).map((rank) => {
                  const isSelected = Number(form.data.manual_faction_rank) === rank && form.data.manual_faction_rank_enabled

                  return (
                    <Button
                      key={rank}
                      type="button"
                      size="xs"
                      variant="ghost"
                      className={cn(
                        'w-full justify-center border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/15 font-semibold text-primary'
                          : 'border-base-300/80 bg-base-200/40 text-base-content/70 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                      )}
                      onClick={() => {
                        form.setData('manual_faction_rank_enabled', true)
                        form.setData('manual_faction_rank', rank)
                      }}
                      disabled={form.processing}
                      aria-label={`${config.inputLabel} ${rank}`}
                      title={`${config.inputLabel} ${rank}`}
                    >
                      {rank}
                    </Button>
                  )
                })}
              </div>
              {errors.manual_faction_rank ? <p className="text-xs text-error">{errors.manual_faction_rank}</p> : null}
            </div>
          ) : (
            <Input
              type="number"
              min={config.min}
              max={config.max}
              value={String(form.data[config.valueKey])}
              onChange={(event) => {
                form.setData(config.enabledKey, true)
                form.setData(config.valueKey, Number(event.target.value))
              }}
              errors={errors[config.valueKey]}
            >
              {config.inputLabel}
            </Input>
          )}
          {value !== null ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              disabled={form.processing}
              onClick={resetOverride}
            >
              {t('characters.manualOverrideReset')}
            </Button>
          ) : null}
        </div>
      </ModalContent>
      <ModalAction onClick={saveOverride} disabled={form.processing}>
        {t('characters.manualOverrideSave')}
      </ModalAction>
      </Modal>
    </>
  )
}
