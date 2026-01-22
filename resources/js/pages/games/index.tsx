import AppLayout from '@/layouts/app-layout'
import LogoTier from '@/components/logo-tier'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import type { GameAnnouncement } from '@/types'
import { Head } from '@inertiajs/react'
import { CalendarRange, LayoutGrid, List as ListIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

interface Props {
  games: GameAnnouncement[]
  lastSyncedAt?: string | null
}

const tierOptions = ['bt', 'lt', 'ht', 'et'] as const
const timeZoneLabel = 'Europe/Berlin'

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

const buildDateFromParts = (parts: ReturnType<typeof parseGameDateParts>) => {
  if (!parts) return null
  const hour = parts.hour ?? 12
  const minute = parts.minute ?? 0
  return new Date(parts.year, parts.month - 1, parts.day, hour, minute)
}

const buildDateKey = (date: Date) => {
  const padded = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${padded(date.getMonth() + 1)}-${padded(date.getDate())}`
}

const buildDateLabel = (date: Date) => {
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    month: date.toLocaleDateString(undefined, { month: 'short' }),
    day: String(date.getDate()).padStart(2, '0'),
    year: String(date.getFullYear()),
  }
}

const buildWeekBounds = (value: Date) => {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const weekday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - weekday)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
  return { start, end }
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.85) return 'bg-success'
  if (confidence >= 0.6) return 'bg-warning'
  return 'bg-error'
}

export default function GamesIndex({ games, lastSyncedAt }: Props) {
  const getInitials = useInitials()
  const [search, setSearch] = useState('')
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [onlyThisWeek, setOnlyThisWeek] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const enrichedGames = useMemo(() => {
    return games.map((game) => {
      const startsParts = parseGameDateParts(game.starts_at)
      const fallbackParts = parseGameDateParts(game.posted_at)
      const effectiveParts = startsParts ?? fallbackParts
      const startsDate = buildDateFromParts(effectiveParts)
      const authorName = game.discord_author_name?.trim() || 'Unknown'
      const avatarUrl = game.discord_author_avatar_url?.trim() || null
      const title = game.title?.trim() || 'Untitled game'
      const timeLabel =
        startsParts?.hour !== null && startsParts?.minute !== null
          ? `${String(startsParts.hour).padStart(2, '0')}:${String(startsParts.minute).padStart(2, '0')}`
          : null
      const discordUrl =
        game.discord_guild_id && game.discord_channel_id && game.discord_message_id
          ? `https://discord.com/channels/${game.discord_guild_id}/${game.discord_channel_id}/${game.discord_message_id}`
          : null

      return {
        ...game,
        startsParts: effectiveParts,
        startsDate,
        authorName,
        avatarUrl,
        title,
        timeLabel,
        discordUrl,
      }
    })
  }, [games])

  const { weekStart, weekEnd } = useMemo(() => {
    const { start, end } = buildWeekBounds(new Date())
    return { weekStart: start, weekEnd: end }
  }, [])

  const filteredGames = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return enrichedGames.filter((game) => {
      const tierKey = game.tier?.toLowerCase() ?? ''
      const matchesTier = selectedTiers.length === 0 || (tierKey && selectedTiers.includes(tierKey))
      if (!matchesTier) return false

      if (onlyThisWeek) {
        if (!game.startsDate) return false
        if (game.startsDate < weekStart || game.startsDate >= weekEnd) return false
      }

      if (!searchTerm) return true
      const haystack = `${game.title} ${game.content ?? ''} ${game.authorName}`.toLowerCase()
      return haystack.includes(searchTerm)
    })
  }, [enrichedGames, onlyThisWeek, search, selectedTiers, weekEnd, weekStart])

  const { upcomingGames, pastGames } = useMemo(() => {
    const now = new Date()
    const upcoming = filteredGames.filter((game) => game.startsDate && game.startsDate >= now)
    const past = filteredGames.filter((game) => !game.startsDate || game.startsDate < now)
    upcoming.sort((a, b) => (a.startsDate?.getTime() ?? 0) - (b.startsDate?.getTime() ?? 0))
    past.sort((a, b) => (b.startsDate?.getTime() ?? 0) - (a.startsDate?.getTime() ?? 0))
    return { upcomingGames: upcoming, pastGames: past }
  }, [filteredGames])

  const buildGroupedGames = (list: typeof filteredGames) => {
    const groups = new Map<
      string,
      {
        key: string
        label: ReturnType<typeof buildDateLabel> | null
        entries: typeof filteredGames
      }
    >()

    list.forEach((game) => {
      const dateKey = game.startsDate ? buildDateKey(game.startsDate) : 'unknown'
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          key: dateKey,
          label: game.startsDate ? buildDateLabel(game.startsDate) : null,
          entries: [],
        })
      }
      groups.get(dateKey)?.entries.push(game)
    })

    return Array.from(groups.values())
  }

  const calendarData = useMemo(() => {
    const baseDate = filteredGames.find((game) => game.startsDate)?.startsDate ?? new Date()
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const offset = (firstOfMonth.getDay() + 6) % 7
    const startDate = new Date(year, month, 1 - offset)
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index)
      const key = buildDateKey(date)
      return { date, key }
    })
    const gamesByDate = new Map<string, typeof filteredGames>()
    filteredGames.forEach((game) => {
      if (!game.startsDate) return
      const key = buildDateKey(game.startsDate)
      if (!gamesByDate.has(key)) {
        gamesByDate.set(key, [])
      }
      gamesByDate.get(key)?.push(game)
    })
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    return {
      weeks,
      monthLabel: baseDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      monthIndex: month,
      gamesByDate,
    }
  }, [filteredGames])

  const activeFilters = [
    search.trim() ? `Search: ${search.trim()}` : null,
    selectedTiers.length ? `Tier: ${selectedTiers.map((tier) => tier.toUpperCase()).join(', ')}` : null,
    onlyThisWeek ? 'This week' : null,
  ].filter(Boolean) as string[]

  return (
    <AppLayout>
      <Head title="Games" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Games</h1>
            <p className="text-base-content/70">Recent game announcements from Discord.</p>
            <p className="text-xs text-base-content/60">Timezone: {timeZoneLabel}</p>
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

            <div className="rounded-box border border-base-200 bg-base-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase text-base-content/50">Filters</p>
                  <h2 className="text-lg font-semibold">Game filters</h2>
                  <p className="text-xs text-base-content/60">Search, filter by tier, or switch views.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                  <span className="badge badge-ghost">{filteredGames.length} of {games.length}</span>
                  {activeFilters.length === 0 ? (
                    <span className="text-base-content/50">No filters</span>
                  ) : (
                    activeFilters.map((filter) => (
                      <span key={filter} className="badge badge-ghost">
                        {filter}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr,auto]">
                <Input
                  type="search"
                  placeholder="Search by title, author, or content..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                >
                  Search
                </Input>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={cn('btn btn-xs', onlyThisWeek ? 'btn-primary' : 'btn-ghost')}
                    onClick={() => setOnlyThisWeek((current) => !current)}
                  >
                    <CalendarRange size={14} />
                    This week
                  </button>
                  <div role="tablist" className="tabs tabs-box tabs-xs">
                    <button
                      role="tab"
                      type="button"
                      className={cn('tab', viewMode === 'list' && 'tab-active')}
                      onClick={() => setViewMode('list')}
                    >
                      <ListIcon size={14} />
                      List
                    </button>
                    <button
                      role="tab"
                      type="button"
                      className={cn('tab', viewMode === 'calendar' && 'tab-active')}
                      onClick={() => setViewMode('calendar')}
                    >
                      <LayoutGrid size={14} />
                      Calendar
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base-content/60">Tier:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className={cn('btn btn-xs', selectedTiers.length === 0 ? 'btn-primary' : 'btn-ghost')}
                      onClick={() => setSelectedTiers([])}
                    >
                      All
                    </button>
                    {tierOptions.map((tier) => {
                      const isActive = selectedTiers.includes(tier)
                      return (
                        <button
                          key={tier}
                          type="button"
                          className={cn('btn btn-xs', isActive ? 'btn-primary' : 'btn-ghost')}
                          onClick={() =>
                            setSelectedTiers((current) =>
                              isActive ? current.filter((entry) => entry !== tier) : [...current, tier],
                            )
                          }
                        >
                          <LogoTier tier={tier} width={14} />
                          {tier.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            {games.length === 0 ? (
              <div className="rounded-lg border border-dashed border-base-300 bg-base-200/40 p-6 text-center text-sm text-base-content/70">
                No announcements found yet.
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="rounded-lg border border-dashed border-base-300 bg-base-200/40 p-6 text-center text-sm text-base-content/70">
                No announcements match your filters.
              </div>
            ) : (
              <>
                {viewMode === 'calendar' ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Calendar · {calendarData.monthLabel}</h3>
                      <span className="text-xs text-base-content/60">Showing {filteredGames.length} games</span>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-xs text-base-content/50">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="text-center uppercase tracking-wide">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {calendarData.weeks.flatMap((week, weekIndex) =>
                        week.map(({ date, key }) => {
                          const dayGames = calendarData.gamesByDate.get(key) ?? []
                          const isCurrentMonth = date.getMonth() === calendarData.monthIndex
                          return (
                            <div
                              key={`${key}-${weekIndex}`}
                              className={cn(
                                'min-h-[120px] rounded-box border border-base-200 bg-base-100 p-2 text-xs',
                                !isCurrentMonth && 'bg-base-200/40 text-base-content/40',
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{date.getDate()}</span>
                                {dayGames.length ? (
                                  <span className="badge badge-ghost">{dayGames.length}</span>
                                ) : null}
                              </div>
                              <div className="mt-2 flex flex-col gap-2">
                                {dayGames.slice(0, 2).map((game) => (
                                  <div key={game.discord_message_id} className="flex items-center gap-1">
                                    {game.tier ? <LogoTier tier={game.tier.toLowerCase()} width={12} /> : null}
                                    <span className="text-base-content/70">{game.timeLabel ?? 'TBD'}</span>
                                    <span className="line-clamp-1">{game.title}</span>
                                  </div>
                                ))}
                                {dayGames.length > 2 ? (
                                  <span className="text-[11px] text-base-content/50">
                                    +{dayGames.length - 2} more
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          )
                        }),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    {[
                      { label: 'Upcoming', games: upcomingGames },
                      { label: 'Past', games: pastGames },
                    ].map((section) => (
                      <div key={section.label} className="flex flex-col gap-4">
                        <div className="sticky top-16 z-10 flex items-center justify-between rounded-box bg-base-100/90 px-2 py-2 backdrop-blur">
                          <span className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
                            {section.label}
                          </span>
                          <span className="text-xs text-base-content/60">{section.games.length} games</span>
                        </div>
                        {section.games.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-base-300 bg-base-200/40 p-6 text-center text-sm text-base-content/70">
                            No {section.label.toLowerCase()} announcements yet.
                          </div>
                        ) : (
                          buildGroupedGames(section.games).map((group) => (
                            <div key={group.key} className="grid gap-4 md:grid-cols-[auto,1fr]">
                              <div className="flex min-w-[140px] flex-col items-center justify-center rounded-box bg-base-200/60 px-4 py-3 text-center">
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
                                  const confidence = Number(game.confidence ?? 0)
                                  const confidenceColor = getConfidenceColor(confidence)

                                  return (
                                    <div
                                      key={game.discord_message_id}
                                      className="group flex flex-col gap-3 rounded-box border border-base-200 bg-base-100/80 p-4 shadow-sm"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <div className="avatar">
                                            <div className="w-10 rounded-full bg-base-200">
                                              {game.avatarUrl ? (
                                                <img src={game.avatarUrl} alt={game.authorName} />
                                              ) : (
                                                <span className="text-xs font-semibold text-base-content/70">
                                                  {getInitials(game.authorName)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-xs text-base-content/70">
                                            <div className="font-semibold text-base-content">
                                              {game.authorName}
                                            </div>
                                            <span className="text-base-content/50">Issuer</span>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="badge badge-primary badge-sm">
                                            {game.timeLabel ?? 'TBD'}
                                          </span>
                                          <span className="inline-flex items-center gap-1 text-xs text-base-content/60">
                                            <span
                                              className={cn('h-2 w-2 rounded-full', confidenceColor)}
                                              title={`Parse confidence: ${confidence.toFixed(2)}`}
                                            />
                                          </span>
                                          {tierKey ? (
                                            <span className="flex items-center">
                                              <LogoTier tier={tierKey} width={18} />
                                            </span>
                                          ) : null}
                                          <span className="font-semibold">{game.title}</span>
                                        </div>
                                      </div>
                                      <div className="text-sm text-base-content/70">
                                        {startsAt ? `Starts: ${startsAt}` : 'Start time not detected'}
                                        {postedAt ? ` · Posted ${postedAt}` : ''}
                                      </div>
                                      {game.content ? (
                                        <p className="line-clamp-2 text-sm text-base-content/60 group-hover:line-clamp-none group-focus-within:line-clamp-none">
                                          {game.content}
                                        </p>
                                      ) : null}
                                      <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60">
                                        {game.discordUrl ? (
                                          <a
                                            className="link link-hover opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                                            href={game.discordUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            View on Discord
                                          </a>
                                        ) : null}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
