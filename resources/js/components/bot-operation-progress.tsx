import { cn } from '@/lib/utils'
import { BotOperation } from '@/types'
import { useEffect, useMemo, useRef } from 'react'

type BotOperationProgressProps = {
  operation: BotOperation | null
  onOperationChange: (operation: BotOperation | null) => void
  onCompleted?: (operation: BotOperation) => void
  onFailed?: (operation: BotOperation) => void
  className?: string
}

type ActionProgressConfig = {
  label: string
  steps: string[]
  ranges: Record<string, [number, number]>
}

const ACTION_CONFIG: Record<string, ActionProgressConfig> = {
  publish_draft: {
    label: 'Publish draft',
    steps: ['pending', 'posting_to_discord', 'rotating_pointers', 'completed'],
    ranges: {
      pending: [0, 10],
      posting_to_discord: [10, 90],
      rotating_pointers: [90, 98],
      completed: [100, 100],
    },
  },
  update_current_post: {
    label: 'Update current post',
    steps: ['pending', 'posting_to_discord', 'completed'],
    ranges: {
      pending: [0, 15],
      posting_to_discord: [15, 95],
      completed: [100, 100],
    },
  },
  post_backstock: {
    label: 'Post backstock',
    steps: ['pending', 'posting_to_discord', 'completed'],
    ranges: {
      pending: [0, 15],
      posting_to_discord: [15, 95],
      completed: [100, 100],
    },
  },
  post_auction: {
    label: 'Post auction',
    steps: ['pending', 'posting_to_discord', 'completed'],
    ranges: {
      pending: [0, 15],
      posting_to_discord: [15, 95],
      completed: [100, 100],
    },
  },
}

const STEP_LABELS: Record<string, string> = {
  pending: 'Queued',
  posting_to_discord: 'Posting to Discord',
  rotating_pointers: 'Updating Current/Draft',
  completed: 'Completed',
}

export const isTerminalBotOperation = (operation: BotOperation | null) => {
  return operation ? operation.status === 'completed' || operation.status === 'failed' : true
}

export default function BotOperationProgress({
  operation,
  onOperationChange,
  onCompleted,
  onFailed,
  className,
}: BotOperationProgressProps) {
  const handledTerminal = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!operation || isTerminalBotOperation(operation)) {
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      let delayMs = 900
      try {
        const response = await fetch(route('admin.bot-operations.show', operation.id), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
          credentials: 'same-origin',
          cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (!cancelled) {
            onOperationChange(
              operation
                ? { ...operation, status: 'failed', error: String(payload?.error ?? 'Operation polling failed.') }
                : null,
            )
          }
          return
        }

        const nextOperation = (payload?.operation ?? null) as BotOperation | null
        if (!nextOperation || cancelled) {
          return
        }

        onOperationChange(nextOperation)
        delayMs = nextOperation.status === 'posting_to_discord' ? 180 : 800

        if (nextOperation.status === 'completed') {
          if (!handledTerminal.current.has(nextOperation.id)) {
            handledTerminal.current.add(nextOperation.id)
            onCompleted?.(nextOperation)
          }
          return
        }

        if (nextOperation.status === 'failed') {
          if (!handledTerminal.current.has(nextOperation.id)) {
            handledTerminal.current.add(nextOperation.id)
            onFailed?.(nextOperation)
          }
          return
        }
      } catch {
        if (!cancelled) {
          onOperationChange(
            operation
              ? { ...operation, status: 'failed', error: 'Could not read operation status.' }
              : null,
          )
        }
        return
      }

      if (!cancelled) {
        timer = setTimeout(poll, delayMs)
      }
    }

    timer = setTimeout(poll, 180)

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [onCompleted, onFailed, onOperationChange, operation])

  const computed = useMemo(() => {
    if (!operation) {
      return null
    }

    const config = ACTION_CONFIG[operation.action] ?? {
      label: operation.action.replaceAll('_', ' '),
      steps: ['pending', 'completed'],
      ranges: {
        pending: [0, 50],
        completed: [100, 100],
      },
    }

    const step = operation.status === 'failed' ? (operation.step ?? 'pending') : (operation.step ?? operation.status)
    const stepIndex = config.steps.indexOf(step)
    const resolvedStepIndex = stepIndex < 0 ? 0 : stepIndex
    const postedLines = Number(operation?.meta?.posted_lines ?? 0)
    const totalLines = Number(operation?.meta?.total_lines ?? 0)
    const isPostingToDiscord = operation.status === 'posting_to_discord'
    const hasLineProgress = Boolean(isPostingToDiscord && totalLines > 0)
    const activeRange = step ? (config.ranges[step] ?? null) : null

    const progress = operation.status === 'completed'
      ? 100
      : (() => {
          if (isPostingToDiscord && !hasLineProgress) {
            return 28
          }

          const stepCount = Math.max(1, config.steps.length)
          const fallbackStart = (resolvedStepIndex / stepCount) * 100
          const fallbackEnd = ((resolvedStepIndex + 1) / stepCount) * 100
          const stepStart = activeRange ? activeRange[0] : fallbackStart
          const stepEnd = activeRange ? activeRange[1] : fallbackEnd

          if (hasLineProgress) {
            const ratio = Math.max(0, Math.min(1, postedLines / totalLines))
            return Math.round(stepStart + (stepEnd - stepStart) * ratio)
          }

          return Math.round(stepEnd)
        })()

    const pendingTooLong = (() => {
      if (operation.status !== 'pending' || !operation.created_at) {
        return false
      }
      const createdAtMs = new Date(operation.created_at).getTime()
      if (!Number.isFinite(createdAtMs)) {
        return false
      }
      return Date.now() - createdAtMs > 10_000
    })()

    return {
      config,
      step,
      postedLines,
      totalLines,
      hasLineProgress,
      isPostingToDiscord,
      stepIndex: resolvedStepIndex,
      progress,
      pendingTooLong,
    }
  }, [operation])

  if (!operation || !computed) {
    return null
  }

  return (
    <div className={cn('mt-3 rounded-box border border-base-200 bg-base-100/40 p-3', className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/70">
        <span className="font-semibold">Bot action</span>
        <span className="rounded-full border border-base-200 px-2 py-0.5">
          #{String(operation.id).padStart(3, '0')}
        </span>
        <span className="rounded-full border border-base-200 px-2 py-0.5">
          {computed.config.label}
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 capitalize',
            operation.status === 'completed'
              ? 'border-success/40 text-success'
              : operation.status === 'failed'
                ? 'border-error/40 text-error'
                : 'border-info/40 text-info',
          )}
        >
          {operation.status.replaceAll('_', ' ')}
        </span>
      </div>
      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[11px] text-base-content/70">
          <span>
            {STEP_LABELS[computed.step ?? 'pending'] ?? String(computed.step ?? 'pending').replaceAll('_', ' ')}
            {computed.hasLineProgress ? ` (${computed.postedLines}/${computed.totalLines})` : ''}
          </span>
          <span>{computed.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-base-200">
          <div
            className={cn(
              'h-full transition-all duration-300',
              computed.isPostingToDiscord && !computed.hasLineProgress ? 'animate-pulse' : '',
              operation.status === 'failed' ? 'bg-error' : operation.status === 'completed' ? 'bg-success' : 'bg-info',
            )}
            style={{ width: `${computed.progress}%` }}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {computed.config.steps.map((step, index) => {
          const isCompleted = operation.status === 'completed' ? index <= computed.stepIndex : index < computed.stepIndex
          const isCurrent = operation.status !== 'completed' && operation.status !== 'failed' && index === computed.stepIndex

          return (
            <span
              key={`${operation.id}-${step}`}
              className={cn(
                'rounded-full border px-2 py-1 text-[11px]',
                isCompleted
                  ? 'border-success/40 bg-success/10 text-success'
                  : isCurrent
                    ? 'border-info/40 bg-info/10 text-info'
                    : 'border-base-200 text-base-content/60',
              )}
            >
              {STEP_LABELS[step] ?? step.replaceAll('_', ' ')}
            </span>
          )
        })}
        {operation.status === 'failed' ? (
          <span className="rounded-full border border-error/40 bg-error/10 px-2 py-1 text-[11px] text-error">
            Failed
          </span>
        ) : null}
      </div>
      {operation.error ? (
        <p className="mt-2 text-xs text-error">{operation.error}</p>
      ) : null}
      {computed.hasLineProgress && operation?.meta?.last_line ? (
        <p className="mt-2 text-xs text-base-content/70">Last line: {operation.meta.last_line}</p>
      ) : null}
      {computed.isPostingToDiscord && !computed.hasLineProgress ? (
        <p className="mt-2 text-xs text-base-content/70">Waiting for live line progress from bot...</p>
      ) : null}
      {computed.pendingTooLong ? (
        <p className="mt-2 text-xs text-warning">
          Operation is still queued. If this persists, start the queue worker (`php artisan queue:work`).
        </p>
      ) : null}
    </div>
  )
}
