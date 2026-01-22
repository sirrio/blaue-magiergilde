import AppLayout from '@/layouts/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { List, ListRow } from '@/components/ui/list'
import { cn } from '@/lib/utils'
import type { GameAnnouncement } from '@/types'
import { Head, router } from '@inertiajs/react'
import { format, isValid, parse, parseISO } from 'date-fns'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from '@/components/ui/toast'

interface Props {
  games: GameAnnouncement[]
  canSync: boolean
  lastSyncedAt?: string | null
}

const tierLabelMap: Record<string, string> = {
  bt: 'BT',
  lt: 'LT',
  ht: 'HT',
  et: 'ET',
}

const tierClassMap: Record<string, string> = {
  bt: 'text-tier-bt',
  lt: 'text-tier-lt',
  ht: 'text-tier-ht',
  et: 'text-tier-et',
}

const normalizeGameDateValue = (value: string) => {
  if (!value.includes('T')) return value

  let normalized = value.replace('T', ' ')
  normalized = normalized.replace(/\.\d+/, '')
  normalized = normalized.replace(/Z$/, '')
  normalized = normalized.replace(/([+-]\d{2}:?\d{2})$/, '')
  return normalized.trim()
}

const parseGameDate = (value?: string | null) => {
  if (!value) return null
  const normalized = normalizeGameDateValue(value)
  const parsed = parse(normalized, 'yyyy-MM-dd HH:mm:ss', new Date())
  if (isValid(parsed)) return parsed

  const fallback = parseISO(value)
  return isValid(fallback) ? fallback : null
}

export default function GamesIndex({ games, canSync, lastSyncedAt }: Props) {
  const syncInFlight = useRef(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSync = () => {
    router.post(route('games.sync'))
  }

  useEffect(() => {
    if (!canSync) return

    let isMounted = true

    const runSync = async () => {
      if (!isMounted || syncInFlight.current) return
      if (document.visibilityState === 'hidden') return

      syncInFlight.current = true
      try {
        const token = document
          .querySelector('meta[name="csrf-token"]')
          ?.getAttribute('content')

        const response = await fetch(route('games.sync'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Games-Auto-Sync': '1',
            ...(token ? { 'X-CSRF-TOKEN': token } : {}),
          },
          body: JSON.stringify({}),
        })

        if (response.ok) {
          setSyncError(null)
          router.reload({
            only: ['games', 'lastSyncedAt'],
            preserveScroll: true,
            preserveState: true,
          })
        } else {
          let message = 'Auto sync failed.'
          try {
            const payload = await response.json()
            if (payload?.error) message = String(payload.error)
          } catch {
            // ignore
          }
          setSyncError(message)
          toast.show(message, 'error')
        }
      } finally {
        syncInFlight.current = false
      }
    }

    runSync()
    const interval = window.setInterval(runSync, 30000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [canSync])

  return (
    <AppLayout>
      <Head title="Games" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Games</h1>
            <p className="text-base-content/70">Recent game announcements from Discord.</p>
          </div>
          {canSync ? (
            <Button variant="outline" onClick={handleSync} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync from Discord
            </Button>
          ) : null}
        </div>

        <Card>
          <CardBody className="gap-4">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>Announcements</span>
              <span className="text-sm font-normal text-base-content/60">
                {games.length} entries
                {lastSyncedAt
                  ? (() => {
                      const parsed = parseGameDate(lastSyncedAt)
                      return parsed ? ` · Last sync ${format(parsed, 'dd.MM.yyyy HH:mm')}` : ''
                    })()
                  : ''}
              </span>
            </CardTitle>
            {syncError ? (
              <div className="alert alert-warning text-sm">
                <span>{syncError}</span>
              </div>
            ) : null}
            {games.length === 0 ? (
              <div className="rounded-lg border border-dashed border-base-300 bg-base-200/40 p-6 text-center text-sm text-base-content/70">
                No announcements found yet.
              </div>
            ) : (
              <List className="bg-transparent shadow-none">
                {games.map((game) => {
                  const tierKey = game.tier?.toLowerCase() ?? ''
                  const tierLabel = tierLabelMap[tierKey] ?? (game.tier ? game.tier.toUpperCase() : null)
                  const tierClass = tierClassMap[tierKey] ?? 'text-base-content/70'
                  const startsAtDate = parseGameDate(game.starts_at)
                  const postedAtDate = parseGameDate(game.posted_at)
                  const startsAt = startsAtDate ? format(startsAtDate, 'dd.MM.yyyy · HH:mm') : null
                  const postedAt = postedAtDate ? format(postedAtDate, 'dd.MM.yyyy') : null
                  const title = game.title?.trim() || 'Untitled game'

                  return (
                    <ListRow key={game.discord_message_id} className="items-start gap-4">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/70">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {tierLabel ? (
                            <span className={cn('text-sm font-semibold uppercase', tierClass)}>
                              {tierLabel}
                            </span>
                          ) : null}
                          <span className="font-semibold">{title}</span>
                        </div>
                        <div className="text-sm text-base-content/70">
                          {startsAt ? `Starts: ${startsAt}` : 'Start time not detected'}
                          {postedAt ? ` · Posted ${postedAt}` : ''}
                        </div>
                        {game.content ? (
                          <p className="line-clamp-2 text-sm text-base-content/60">
                            {game.content}
                          </p>
                        ) : null}
                        {game.discord_author_name ? (
                          <div className="text-xs text-base-content/50">
                            By {game.discord_author_name}
                          </div>
                        ) : null}
                      </div>
                    </ListRow>
                  )
                })}
              </List>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
