import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import React, { useEffect, useMemo, useState } from 'react'

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
  const [downtimeInput, setDowntimeInput] = useState(formatLongTime(totalMinutes))
  const [downtimeFocused, setDowntimeFocused] = useState(false)

  const setMinutes = (next: number) => {
    onChange(clamp(next, MAX_SESSION_MINUTES) * 60)
  }

  useEffect(() => {
    if (!isSession) return
    if (value === 0) {
      onChange(DEFAULT_SESSION_MINUTES * 60)
    }
  }, [isSession, value, onChange])

  useEffect(() => {
    if (isSession || downtimeFocused) return
    setDowntimeInput(formatLongTime(totalMinutes))
  }, [isSession, totalMinutes, downtimeFocused])

  if (isSession) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Button type="button" size="xs" color="error" onClick={() => setMinutes(sessionMinutes - 15)}>
              -15m
            </Button>
            <Button type="button" size="xs" color="error" onClick={() => setMinutes(sessionMinutes - 60)}>
              -1h
            </Button>
          </div>
          <div className="rounded-xl bg-base-200 px-4 py-2 text-3xl font-semibold tracking-[0.12em] text-base-content tabular-nums">
            {sessionDisplay}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="xs" color="success" onClick={() => setMinutes(sessionMinutes + 15)}>
              +15m
            </Button>
            <Button type="button" size="xs" color="success" onClick={() => setMinutes(sessionMinutes + 60)}>
              +1h
            </Button>
          </div>
        </div>
        {errors && <p className="fieldset-label text-error">{errors}</p>}
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
      {errors && <p className="fieldset-label text-error">{errors}</p>}
    </div>
  )
}

export default DurationInputStack
