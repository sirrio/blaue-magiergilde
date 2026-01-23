import AppLayout from '@/layouts/app-layout'
import LogoTier from '@/components/logo-tier'
import DiscordIcon from '@/components/discord-icon'
import { Card, CardBody } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import type { GameAnnouncement, PageProps } from '@/types'
import { Head, usePage } from '@inertiajs/react'
import { CalendarRange, LayoutGrid, List as ListIcon, SquareArrowOutUpRight } from 'lucide-react'
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

const formatCompactDate = (value: string | null | undefined) => {
  const parts = parseGameDateParts(value)
  if (!parts) return null
  const padded = (item: number) => String(item).padStart(2, '0')
  return `${padded(parts.day)}.${padded(parts.month)}`
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
    weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
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
  const { features } = usePage<PageProps>().props
  const [search, setSearch] = useState('')
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [weekFilter, setWeekFilter] = useState<'all' | 'this_week' | 'next_week' | 'last_week'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const calendarEnabled = features?.games_calendar ?? true
  const activeViewMode = calendarEnabled ? viewMode : 'list'
  const todayKey = buildDateKey(new Date())

  const enrichedGames = useMemo(() => {
    return games.map((game) => {
      const startsParts = parseGameDateParts(game.starts_at)
      const startsDate = buildDateFromParts(startsParts)
      const authorName = game.discord_author_name?.trim() || 'Unknown'
      const avatarUrl = game.discord_author_avatar_url?.trim() || null
      const title = game.title?.trim() || 'Untitled game'
      const timeLabel =
        startsParts && startsParts.hour !== null && startsParts.minute !== null
          ? `${String(startsParts.hour).padStart(2, '0')}:${String(startsParts.minute).padStart(2, '0')}`
          : null
      const discordUrl =
        game.discord_guild_id && game.discord_channel_id && game.discord_message_id
          ? `https://discord.com/channels/${game.discord_guild_id}/${game.discord_channel_id}/${game.discord_message_id}`
          : null
      const discordAppUrl =
        game.discord_guild_id && game.discord_channel_id && game.discord_message_id
          ? `discord://-/channels/${game.discord_guild_id}/${game.discord_channel_id}/${game.discord_message_id}`
          : null

      return {
        ...game,
        startsParts,
        startsDate,
        authorName,
        avatarUrl,
        title,
        timeLabel,
        discordUrl,
        discordAppUrl,
      }
    })
  }, [games])

  const { weekStart, weekEnd, nextWeekStart, nextWeekEnd, lastWeekStart, lastWeekEnd } = useMemo(() => {
    const { start, end } = buildWeekBounds(new Date())
    const nextStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    const nextEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 7)
    const lastStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7)
    const lastEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7)
    return {
      weekStart: start,
      weekEnd: end,
      nextWeekStart: nextStart,
      nextWeekEnd: nextEnd,
      lastWeekStart: lastStart,
      lastWeekEnd: lastEnd,
    }
  }, [])

  const filteredGames = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return enrichedGames.filter((game) => {
      const tierKey = game.tier?.toLowerCase() ?? ''
      const matchesTier = selectedTiers.length === 0 || (tierKey && selectedTiers.includes(tierKey))
      if (!matchesTier) return false

      if (weekFilter !== 'all') {
        if (!game.startsDate) return false
        if (weekFilter === 'this_week' && (game.startsDate < weekStart || game.startsDate >= weekEnd)) {
          return false
        }
        if (
          weekFilter === 'next_week' &&
          (game.startsDate < nextWeekStart || game.startsDate >= nextWeekEnd)
        ) {
          return false
        }
        if (
          weekFilter === 'last_week' &&
          (game.startsDate < lastWeekStart || game.startsDate >= lastWeekEnd)
        ) {
          return false
        }
      }

      if (!searchTerm) return true
      const haystack = `${game.title} ${game.content ?? ''} ${game.authorName}`.toLowerCase()
      return haystack.includes(searchTerm)
    })
  }, [
    enrichedGames,
    lastWeekEnd,
    lastWeekStart,
    nextWeekEnd,
    nextWeekStart,
    search,
    selectedTiers,
    weekEnd,
    weekFilter,
    weekStart,
  ])

  const sortedGames = useMemo(() => {
    const items = [...filteredGames]
    items.sort((a, b) => {
      const aTime = a.startsDate?.getTime()
      const bTime = b.startsDate?.getTime()
      if (aTime == null && bTime == null) return 0
      if (aTime == null) return 1
      if (bTime == null) return -1
      return bTime - aTime
    })
    return items
  }, [filteredGames])

  const buildGroupedGames = (list: typeof filteredGames) => {
    const groups = new Map<
      string,
      {
        key: string
        label: ReturnType<typeof buildDateLabel> | null
        isToday: boolean
        entries: typeof filteredGames
      }
    >()

    list.forEach((game) => {
      const dateKey = game.startsDate ? buildDateKey(game.startsDate) : 'unknown'
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          key: dateKey,
          label: game.startsDate ? buildDateLabel(game.startsDate) : null,
          isToday: dateKey === todayKey,
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
    weekFilter === 'this_week'
      ? 'Week: This'
      : weekFilter === 'next_week'
        ? 'Week: Next'
        : weekFilter === 'last_week'
          ? 'Week: Last'
          : null,
  ].filter(Boolean) as string[]

  return (
    <AppLayout>
      <Head title="Games" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Games</h1>
            <p className="text-sm text-base-content/70">Recent announcements from Discord.</p>
            <p className="text-[11px] text-base-content/60">
              {games.length} entries
              {lastSyncedAt
                ? (() => {
                    const formatted = formatGameDate(lastSyncedAt, true)
                    return formatted ? ` · Last sync ${formatted}` : ''
                  })()
                : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[10px] text-base-content/60">
            <span>Timezone: {timeZoneLabel}</span>
            {calendarEnabled ? (
              <div role="tablist" className="tabs tabs-box tabs-xs">
                <button
                  role="tab"
                  type="button"
                  className={cn('tab', viewMode === 'list' && 'tab-active')}
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon size={12} />
                  List
                </button>
                <button
                  role="tab"
                  type="button"
                  className={cn('tab', viewMode === 'calendar' && 'tab-active')}
                  onClick={() => setViewMode('calendar')}
                >
                  <LayoutGrid size={12} />
                  Calendar
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <Card>
          <CardBody className="gap-1.5">
            <div className="rounded-box border border-base-200 bg-base-100 p-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-base-content/60">
                <span className="badge badge-ghost badge-xs">{filteredGames.length} of {games.length}</span>
                {activeFilters.length === 0 ? (
                  <span className="text-base-content/50">No filters</span>
                ) : (
                    activeFilters.map((filter) => (
                      <span key={filter} className="badge badge-ghost badge-xs">
                        {filter}
                      </span>
                    ))
                  )}
              </div>
              <div className="mt-1.5 grid gap-1.5 lg:grid-cols-[1fr,auto]">
                <Input
                  type="search"
                  placeholder="Search by title, author, or content..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  hideLabel
                  inputClassName="input-xs text-[11px]"
                >
                  Search
                </Input>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1">
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
                          <LogoTier tier={tier} width={12} />
                          {tier.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-base-content/60">Week:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'next_week', label: 'Next' },
                      { value: 'this_week', label: 'This' },
                      { value: 'last_week', label: 'Last' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'btn btn-xs',
                          weekFilter === option.value ? 'btn-primary' : 'btn-ghost',
                        )}
                        onClick={() => setWeekFilter(option.value as typeof weekFilter)}
                      >
                        <CalendarRange size={12} />
                        {option.label}
                      </button>
                    ))}
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
                {activeViewMode === 'calendar' ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Calendar · {calendarData.monthLabel}</h3>
                      <span className="text-[11px] text-base-content/60">Showing {filteredGames.length} games</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-[10px] text-base-content/50">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="text-center uppercase tracking-wide">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarData.weeks.flatMap((week, weekIndex) =>
                        week.map(({ date, key }) => {
                          const dayGames = calendarData.gamesByDate.get(key) ?? []
                          const isCurrentMonth = date.getMonth() === calendarData.monthIndex
                          return (
                            <div
                              key={`${key}-${weekIndex}`}
                              className={cn(
                                'min-h-[64px] rounded-box border border-base-200 bg-base-100 p-1 text-[9px]',
                                !isCurrentMonth && 'bg-base-200/40 text-base-content/40',
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{date.getDate()}</span>
                                {dayGames.length ? (
                                  <span className="badge badge-ghost badge-xs">{dayGames.length}</span>
                                ) : null}
                              </div>
                              <div className="mt-1 flex flex-col gap-1">
                                {dayGames.slice(0, 2).map((game) => (
                                  <div key={game.discord_message_id} className="flex items-center gap-1">
                                    {game.tier ? <LogoTier tier={game.tier.toLowerCase()} width={12} /> : null}
                                    <span className="text-base-content/70">{game.timeLabel ?? 'TBD'}</span>
                                    <span className="line-clamp-1">{game.title}</span>
                                  </div>
                                ))}
                                {dayGames.length > 2 ? (
                                  <span className="text-[10px] text-base-content/50">
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
                  <div className="flex flex-col gap-3">
                    {buildGroupedGames(sortedGames).map((group) => {
                      return (
                          <div key={group.key} className="grid gap-1.5 md:grid-cols-[auto,1fr]">
                              <div
                                className={cn(
                                  'flex min-w-[88px] items-center justify-center rounded-md px-1.5 py-0.5 text-center text-[11px] leading-tight',
                                  group.isToday
                                    ? 'bg-primary text-primary-content shadow-sm'
                                    : 'bg-primary/10 text-base-content/80',
                                )}
                              >
                                {group.label ? (
                                  <span className="text-[11px] uppercase tracking-wide">
                                    {group.label.weekday} {group.label.day} {group.label.month} {group.label.year}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-base-content/60">Unknown date</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                {group.entries.map((game) => {
                                  const now = new Date()
                                  const tierKey = game.tier?.toLowerCase() ?? ''
                                  const startsDate = formatCompactDate(game.starts_at)
                                  const postedDate = formatCompactDate(game.posted_at)
                                  const confidence = Number(game.confidence ?? 0)
                                  const confidenceColor = getConfidenceColor(confidence)
                                  const dateLine = startsDate
                                    ? game.timeLabel
                                      ? `${startsDate} · ${game.timeLabel}`
                                      : startsDate
                                    : 'TBD'
                                  const isPast = game.startsDate ? game.startsDate < now : true

                                  return (
                                    <div
                                      key={game.discord_message_id}
                                      className={cn(
                                        'group flex flex-col gap-1 rounded-box border border-base-200 bg-base-100/80 px-2 py-1 text-[11px] shadow-sm transition hover:border-base-300 hover:bg-base-100',
                                        isPast && 'opacity-60 grayscale-[0.2]',
                                      )}
                                      title={game.content ?? undefined}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            {tierKey ? (
                                              <span className="flex items-center">
                                                <LogoTier tier={tierKey} width={12} />
                                              </span>
                                            ) : null}
                                            <span className="text-[12px] font-semibold">{game.title}</span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1 text-[10px] text-base-content/60">
                                            <span>{dateLine}</span>
                                            {postedDate ? <span>· posted {postedDate}</span> : null}
                                            <span className="text-base-content/40">·</span>
                                            <div className="flex items-center gap-1">
                                              <div className="avatar">
                                                <div className="w-4 rounded-full bg-base-200">
                                                  {game.avatarUrl ? (
                                                    <img src={game.avatarUrl} alt={game.authorName} />
                                                  ) : (
                                                    <span className="text-[10px] font-semibold text-base-content/70">
                                                      {getInitials(game.authorName)}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <span className="text-base-content/70">{game.authorName}</span>
                                            </div>
                                            <span
                                              className={cn('h-1.5 w-1.5 rounded-full', confidenceColor)}
                                              title={`Parse confidence: ${confidence.toFixed(2)}`}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {game.discordAppUrl ? (
                                            <a
                                              href={game.discordAppUrl}
                                              className="btn btn-ghost btn-xs px-1"
                                              title="Open in Discord app"
                                            >
                                              <DiscordIcon width={14} />
                                            </a>
                                          ) : null}
                                          {game.discordUrl ? (
                                            <a
                                              href={game.discordUrl}
                                              className="btn btn-ghost btn-xs px-1"
                                              title="Open in browser"
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              <SquareArrowOutUpRight size={12} />
                                            </a>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                    })}
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
