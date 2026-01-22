import AppLayout from '@/layouts/app-layout'
import LogoTier from '@/components/logo-tier'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { useInitials } from '@/hooks/use-initials'
import type { GameAnnouncement } from '@/types'
import { Head } from '@inertiajs/react'
import { useMemo } from 'react'

interface Props {
  games: GameAnnouncement[]
  lastSyncedAt?: string | null
}

const normalizeGameDateValue = (value: string) => {
  if (!value.includes('T')) return value

  let normalized = value.replace('T', ' ')
  normalized = normalized.replace(/\.\d+/, '')
  normalized = normalized.replace(/Z$/, '')
  normalized = normalized.replace(/([+-]\d{2}:?\d{2})$/, '')
  return normalized.trim()
}

const parseGameDateParts = (value: string | null | undefined) => {
  if (!value) return null
  const normalized = normalizeGameDateValue(value)
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: hour ? Number(hour) : null,
    minute: minute ? Number(minute) : null,
  }
}

const formatGameDate = (value: string | null | undefined, includeTime: boolean) => {
  if (!value) return null
  const parts = parseGameDateParts(value)
  if (!parts) return null
  const padded = (item: number) => String(item).padStart(2, '0')
  const date = `${padded(parts.day)}.${padded(parts.month)}.${parts.year}`
  if (includeTime && parts.hour !== null && parts.minute !== null) {
    return `${date} · ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
  }
  return date
}

export default function GamesIndex({ games, lastSyncedAt }: Props) {
  const getInitials = useInitials()
  const groupedGames = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string
        label: { weekday: string; month: string; day: string; year: string } | null
        entries: (GameAnnouncement & { startsParts: ReturnType<typeof parseGameDateParts> })[]
      }
    >()

    games.forEach((game) => {
      const startsParts = parseGameDateParts(game.starts_at ?? game.posted_at)
      const key = startsParts
        ? `${startsParts.year}-${String(startsParts.month).padStart(2, '0')}-${String(startsParts.day).padStart(2, '0')}`
        : 'unknown'

      if (!groups.has(key)) {
        const label = startsParts
          ? (() => {
              const date = new Date(startsParts.year, startsParts.month - 1, startsParts.day, 12)
              return {
                weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
                month: date.toLocaleDateString(undefined, { month: 'short' }),
                day: String(startsParts.day).padStart(2, '0'),
                year: String(startsParts.year),
              }
            })()
          : null
        groups.set(key, { key, label, entries: [] })
      }

      groups.get(key)?.entries.push({ ...game, startsParts })
    })

    return Array.from(groups.values())
  }, [games])

  return (
    <AppLayout>
      <Head title="Games" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Games</h1>
            <p className="text-base-content/70">Recent game announcements from Discord.</p>
          </div>
        </div>

        <Card>
          <CardBody className="gap-4">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>Announcements</span>
              <span className="text-sm font-normal text-base-content/60">
                {games.length} entries
                {lastSyncedAt
                  ? (() => {
                      const formatted = formatGameDate(lastSyncedAt, true)
                      return formatted ? ` · Last sync ${formatted}` : ''
                    })()
                  : ''}
              </span>
            </CardTitle>
            {games.length === 0 ? (
              <div className="rounded-lg border border-dashed border-base-300 bg-base-200/40 p-6 text-center text-sm text-base-content/70">
                No announcements found yet.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {groupedGames.map((group) => (
                  <div key={group.key} className="grid gap-4 md:grid-cols-[auto,1fr]">
                    <div className="flex min-w-[110px] flex-col items-center justify-center rounded-box bg-base-200/60 px-4 py-3 text-center">
                      {group.label ? (
                        <>
                          <span className="text-xs uppercase tracking-wide text-base-content/60">
                            {group.label.weekday}
                          </span>
                          <span className="text-2xl font-semibold">{group.label.day}</span>
                          <span className="text-xs text-base-content/60">
                            {group.label.month} {group.label.year}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-base-content/60">Unknown date</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      {group.entries.map((game) => {
                        const tierKey = game.tier?.toLowerCase() ?? ''
                        const startsAt = formatGameDate(game.starts_at, true)
                        const postedAt = formatGameDate(game.posted_at, false)
                        const title = game.title?.trim() || 'Untitled game'
                        const authorName = game.discord_author_name?.trim() || 'Unknown'
                        const avatarUrl = game.discord_author_avatar_url?.trim()
                        const timeLabel =
                          game.startsParts?.hour !== null && game.startsParts?.minute !== null
                            ? `${String(game.startsParts.hour).padStart(2, '0')}:${String(game.startsParts.minute).padStart(2, '0')}`
                            : null

                        return (
                          <div
                            key={game.discord_message_id}
                            className="flex flex-col gap-3 rounded-box border border-base-200 bg-base-100/80 p-4 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="badge badge-ghost">{timeLabel ?? 'TBD'}</span>
                                {tierKey ? (
                                  <span className="flex items-center">
                                    <LogoTier tier={tierKey} width={18} />
                                  </span>
                                ) : null}
                                <span className="font-semibold">{title}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-base-content/60">
                                <div className="avatar">
                                  <div className="w-8 rounded-full bg-base-200">
                                    {avatarUrl ? (
                                      <img src={avatarUrl} alt={authorName} />
                                    ) : (
                                      <span className="text-xs font-semibold text-base-content/70">
                                        {getInitials(authorName)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span>{authorName}</span>
                              </div>
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
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
