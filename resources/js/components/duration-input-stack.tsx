import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const MAX_SESSION_MINUTES = 24 * 60
const DEFAULT_SESSION_MINUTES = 3 * 60

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

const formatLongTime = (minutes: number) => {
  const clamped = Math.max(0, Math.round(minutes))
  const hours = Math.floor(clamped / 60)
  const mins = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const parseLongTime = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!trimmed.includes(':')) {
    const parsedHours = Number(trimmed)
    if (!Number.isFinite(parsedHours)) return null
    return Math.max(0, Math.round(parsedHours * 60))
  }
  const [hours, minutes] = trimmed.split(':')
  if (minutes === undefined) return null
  const parsedHours = Number(hours)
  const parsedMinutes = Number(minutes)
  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) return null
  if (parsedMinutes < 0 || parsedMinutes > 59) return null
  return Math.max(0, Math.round(parsedHours * 60 + parsedMinutes))
}

const compactDurationFromMinutes = (minutes: number) => {
  const clamped = Math.max(0, Math.round(minutes))
  const hours = Math.floor(clamped / 60)
  const mins = clamped % 60

  if (mins === 0) {
    return String(hours)
  }

  return `${hours}${String(mins).padStart(2, '0')}`
}

const parseCompactDuration = (digits: string) => {
  const normalized = digits.replace(/\D/g, '').slice(0, 4)
  if (!normalized) {
    return null
  }

  if (normalized.length <= 2) {
    const hours = Number(normalized)
    if (!Number.isFinite(hours)) {
      return null
    }

    return clamp(hours * 60, MAX_SESSION_MINUTES)
  }

  const hhmm = normalized.padStart(4, '0')
  const hoursPart = hhmm.slice(0, 2)
  const minutesPart = hhmm.slice(2, 4)
  const hours = Number(hoursPart)
  const minutes = Number(minutesPart)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  const safeMinutes = clamp(minutes, 59)

  return clamp(hours * 60 + safeMinutes, MAX_SESSION_MINUTES)
}

const usePressRepeat = (action: () => void) => {
  const repeatRef = useRef<{ timeoutId: number | null; intervalId: number | null; didRepeat: boolean }>({
    timeoutId: null,
    intervalId: null,
    didRepeat: false,
  })

  const clearRepeat = useCallback(() => {
    if (repeatRef.current.timeoutId !== null) {
      window.clearTimeout(repeatRef.current.timeoutId)
      repeatRef.current.timeoutId = null
    }
    if (repeatRef.current.intervalId !== null) {
      window.clearInterval(repeatRef.current.intervalId)
      repeatRef.current.intervalId = null
    }
  }, [])

  useEffect(() => clearRepeat, [clearRepeat])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      clearRepeat()
      repeatRef.current.didRepeat = false
      repeatRef.current.timeoutId = window.setTimeout(() => {
        repeatRef.current.didRepeat = true
        action()
        repeatRef.current.intervalId = window.setInterval(action, 120)
      }, 300)
    },
    [action, clearRepeat],
  )

  const stop = useCallback(() => {
    clearRepeat()
  }, [clearRepeat])

  const onClick = useCallback(() => {
    if (repeatRef.current.didRepeat) {
      repeatRef.current.didRepeat = false
      return
    }
    action()
  }, [action])

  return {
    onPointerDown,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick,
  }
}

type DurationMode = 'session' | 'downtime'

type DurationInputStackProps = {
  value: number
  onChange: (value: number) => void
  errors?: React.ReactNode
  mode?: DurationMode
}

const DurationInputStack = ({
  value,
  onChange,
  errors,
  mode = 'session',
}: DurationInputStackProps) => {
  const totalMinutes = Math.max(0, Math.round(value / 60))
  const isSession = mode === 'session'
  const sessionMinutes = clamp(totalMinutes || DEFAULT_SESSION_MINUTES, MAX_SESSION_MINUTES)
  const sessionDisplay = useMemo(() => formatLongTime(sessionMinutes), [sessionMinutes])
  const sessionMinutesRef = useRef(sessionMinutes)
  const [sessionInput, setSessionInput] = useState(compactDurationFromMinutes(sessionMinutes))
  const [sessionFocused, setSessionFocused] = useState(false)
  const [downtimeInput, setDowntimeInput] = useState(formatLongTime(totalMinutes))
  const [downtimeFocused, setDowntimeFocused] = useState(false)

  const setMinutes = useCallback(
    (next: number) => {
      onChange(clamp(next, MAX_SESSION_MINUTES) * 60)
    },
    [onChange],
  )

  const adjustMinutes = useCallback(
    (delta: number) => {
      setMinutes(sessionMinutesRef.current + delta)
    },
    [setMinutes],
  )

  useEffect(() => {
    if (!isSession) return
    if (value === 0) {
      onChange(DEFAULT_SESSION_MINUTES * 60)
    }
  }, [isSession, value, onChange])

  useEffect(() => {
    sessionMinutesRef.current = sessionMinutes
  }, [sessionMinutes])

  useEffect(() => {
    if (!isSession || sessionFocused) return
    setSessionInput(compactDurationFromMinutes(sessionMinutes))
  }, [isSession, sessionMinutes, sessionFocused])

  useEffect(() => {
    if (isSession || downtimeFocused) return
    setDowntimeInput(formatLongTime(totalMinutes))
  }, [isSession, totalMinutes, downtimeFocused])

  const minusQuarterHandlers = usePressRepeat(() => adjustMinutes(-15))
  const minusHourHandlers = usePressRepeat(() => adjustMinutes(-60))
  const plusQuarterHandlers = usePressRepeat(() => adjustMinutes(15))
  const plusHourHandlers = usePressRepeat(() => adjustMinutes(60))

  if (isSession) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Button type="button" size="xs" color="error" {...minusQuarterHandlers}>
              -15m
            </Button>
            <Button type="button" size="xs" color="error" {...minusHourHandlers}>
              -1h
            </Button>
          </div>
          <input
            type="text"
            value={sessionFocused ? sessionInput : sessionDisplay}
            onFocus={(event) => {
              setSessionFocused(true)
              setSessionInput(compactDurationFromMinutes(sessionMinutesRef.current))
              event.currentTarget.select()
            }}
            onClick={(event) => event.currentTarget.select()}
            onBlur={() => {
              setSessionFocused(false)
              const normalizedInput = sessionInput.replace(/\D/g, '')
              if (normalizedInput.length === 0 || /^0+$/.test(normalizedInput)) {
                setSessionInput(compactDurationFromMinutes(sessionMinutesRef.current))
                return
              }

              const parsed = parseCompactDuration(normalizedInput)
              if (parsed !== null) {
                setMinutes(parsed)
                setSessionInput(compactDurationFromMinutes(parsed))
              } else {
                setSessionInput(compactDurationFromMinutes(sessionMinutesRef.current))
              }
            }}
            onChange={(event) => setSessionInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            className="w-32 rounded-xl bg-base-200 px-4 py-2 text-center text-3xl font-semibold tracking-[0.12em] text-base-content tabular-nums outline-none"
            aria-label="Duration (hh:mm)"
          />
          <div className="flex gap-2">
            <Button type="button" size="xs" color="success" {...plusQuarterHandlers}>
              +15m
            </Button>
            <Button type="button" size="xs" color="success" {...plusHourHandlers}>
              +1h
            </Button>
          </div>
        </div>
        {errors ? (
          <label className="label pt-1">
            <span className="label-text-alt text-error">{errors}</span>
          </label>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={downtimeInput}
        onFocus={(event) => {
          setDowntimeFocused(true)
          event.currentTarget.select()
        }}
        onClick={(event) => event.currentTarget.select()}
        onBlur={() => {
          setDowntimeFocused(false)
          const parsed = parseLongTime(downtimeInput)
          if (parsed !== null) {
            onChange(parsed * 60)
            setDowntimeInput(formatLongTime(parsed))
          } else {
            setDowntimeInput(formatLongTime(totalMinutes))
          }
        }}
        onChange={(event) => setDowntimeInput(event.target.value)}
        placeholder="HH:MM"
      >
        Duration (hh:mm)
      </Input>
      {errors ? (
        <label className="label pt-1">
          <span className="label-text-alt text-error">{errors}</span>
        </label>
      ) : null}
    </div>
  )
}

export default DurationInputStack
