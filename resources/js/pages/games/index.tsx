import AppLayout from '@/layouts/app-layout'
import LogoTier from '@/components/logo-tier'
import DiscordIcon from '@/components/discord-icon'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import type { GameAnnouncement, PageProps } from '@/types'
import { Head, Link, router, usePage } from '@inertiajs/react'
import {
  Archive,
  CalendarClock,
  LayoutGrid,
  List as ListIcon,
  SquareArrowOutUpRight,
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface Props {
  games: GameAnnouncement[]
  mode: 'upcoming' | 'archive'
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
    hasMorePages: boolean
  }
  lastSyncedAt?: string | null
}

const tierOptions = ['bt', 'lt', 'ht', 'et'] as const

const parseTierList = (tier: string | null | undefined): string[] => {
  return String(tier || '')
    .toLowerCase()
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}
const timeZoneLabel = 'Europe/Berlin'

const tierAccent: Record<string, { border: string; text: string; soft: string }> = {
  bt: { border: 'border-tier-bt', text: 'text-tier-bt', soft: 'bg-tier-bt/10' },
  lt: { border: 'border-tier-lt', text: 'text-tier-lt', soft: 'bg-tier-lt/10' },
  ht: { border: 'border-tier-ht', text: 'text-tier-ht', soft: 'bg-tier-ht/15' },
  et: { border: 'border-tier-et', text: 'text-tier-et', soft: 'bg-tier-et/15' },
}

const monthShort = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const weekdayShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.85) return 'bg-success'
  if (confidence >= 0.6) return 'bg-warning'
  return 'bg-error'
}

const STOP_WORDS = new Set([
  'ich', 'du', 'wir', 'ihr', 'sie', 'er', 'es',
  'um', 'am', 'im', 'an', 'auf', 'bei', 'zu', 'zur', 'zum',
  'und', 'oder', 'aber', 'denn', 'doch',
  'der', 'die', 'das', 'den', 'dem', 'des',
  'ein', 'eine', 'einen', 'einem', 'einer',
  'mit', 'für', 'fur', 'von', 'vom', 'bis', 'so',
  'noch', 'jetzt', 'mal', 'mehr',
])

const cleanContentForDisplay = (content: string | null | undefined): string => {
  let str = String(content || '')
  if (!str) return ''
  str = str
    .replace(/<a?:[A-Za-z0-9_]+:\d+>/g, ' ')
    .replace(/:MG_[A-Z0-9_]+~?\d*:/gi, ' ')
    .replace(/<t:\d{9,12}(?::[tTdDfFR])?>/g, ' ')
    .replace(/<@[!&]?\d+>/g, ' ')
    .replace(/<#\d+>/g, ' ')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\*)\*(?!\*)/g, ' ')
    .replace(/(?<![_a-zA-Z0-9])_(?![_a-zA-Z0-9])/g, ' ')
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[.\-/]\d{1,2}(?:[.\-/]\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}\s*[.:h]\s*\d{2}\s*(?:uhr|Uhr)?\b/g, ' ')
    .replace(/\b\d{1,2}\s*(?:uhr|Uhr)\b/g, ' ')
    .replace(/\b(?:mo|di|mi|do|fr|sa|so)\b\.?,?/gi, ' ')
    .replace(/\b(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b,?/gi, ' ')
    .replace(/\b(?:heute|morgen|gestern|übermorgen|uebermorgen)\b/gi, ' ')
    .replace(/\b(?:ca\.?|circa|etwa|gegen|ungefähr|ungefaehr|approx\.?)\b/gi, ' ')
    .replace(/\(\s*[+\-±~]+\s*\)/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\s|·•–—-]{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  for (const q of ['"', '“', '”', '„', '‟']) {
    const count = (str.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    if (count === 1) str = str.split(q).join('').trim()
  }
  return str.replace(/^[\s·•|–—\-,.:;*_/\\]+|[\s·•|–—\-,.:;*_/\\]+$/g, '').trim()
}

const isLabelMeaningful = (label: string): boolean => {
  if (!label || label.length < 4) return false
  const alnum = label.replace(/[^\p{L}\p{N}]+/gu, '')
  if (alnum.length < 3) return false
  if (STOP_WORDS.has(label.toLowerCase())) return false
  return true
}

const resolveGameLabel = (
  title: string | null | undefined,
  content: string | null | undefined,
  maxLength = 80,
): string => {
  const trimmedTitle = String(title || '').trim()
  if (trimmedTitle) {
    return trimmedTitle.length > maxLength ? `${trimmedTitle.slice(0, maxLength - 1)}…` : trimmedTitle
  }
  const cleaned = cleanContentForDisplay(content)
  if (isLabelMeaningful(cleaned)) {
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned
  }
  return 'Untitled game'
}

const formatRelative = (date: Date, now: Date) => {
  const diffMs = date.getTime() - now.getTime()
  const future = diffMs >= 0
  const absMin = Math.round(Math.abs(diffMs) / 60000)
  if (absMin < 60) return future ? `in ${absMin} min` : `vor ${absMin} min`
  const absH = Math.round(absMin / 60)
  if (absH < 24) return future ? `in ${absH} h` : `vor ${absH} h`
  const absD = Math.round(absH / 24)
  if (absD < 14) return future ? `in ${absD} Tagen` : `vor ${absD} Tagen`
  const absW = Math.round(absD / 7)
  return future ? `in ${absW} Wochen` : `vor ${absW} Wochen`
}

export default function GamesIndex({ games, mode, pagination, lastSyncedAt }: Props) {
  const getInitials = useInitials()
  const { features } = usePage<PageProps>().props
  const [search, setSearch] = useState('')
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const calendarEnabled = (features?.games_calendar ?? true) && mode === 'upcoming'
  const activeViewMode = calendarEnabled ? viewMode : 'list'
  const isArchive = mode === 'archive'
  const todayKey = buildDateKey(new Date())

  const enrichedGames = useMemo(() => {
    return games.map((game) => {
      const startsParts = parseGameDateParts(game.starts_at)
      const startsDate = buildDateFromParts(startsParts)
      const authorName = game.discord_author_name?.trim() || 'Unknown'
      const avatarUrl = game.discord_author_avatar_url?.trim() || null
      const title = resolveGameLabel(game.title, game.content, 80)
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
        tierList: parseTierList(game.tier),
      }
    })
  }, [games])

  const now = useMemo(() => new Date(), [])

  const filteredGames = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return enrichedGames.filter((game) => {
      const matchesTier =
        selectedTiers.length === 0 ||
        game.tierList.some((tier) => selectedTiers.includes(tier))
      if (!matchesTier) return false

      if (!searchTerm) return true
      const haystack = `${game.title} ${game.content ?? ''} ${game.authorName}`.toLowerCase()
      return haystack.includes(searchTerm)
    })
  }, [enrichedGames, search, selectedTiers])

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

  const navigateToPage = (page: number) => {
    router.get(
      route(isArchive ? 'games.archive' : 'games.index'),
      { page },
      { preserveState: true, preserveScroll: true, replace: true },
    )
  }

  const renderGameRow = (game: (typeof filteredGames)[number]) => {
    const tierKeys = game.tierList
    const primaryAccent = tierKeys[0] ? tierAccent[tierKeys[0]] : undefined
    const confidence = Number(game.confidence ?? 0)
    const confidenceColor = getConfidenceColor(confidence)
    const isPast = game.startsDate ? game.startsDate < now : false
    const isToday = game.startsDate ? buildDateKey(game.startsDate) === todayKey : false
    const relative = game.startsDate ? formatRelative(game.startsDate, now) : null

    const day = game.startsParts ? String(game.startsParts.day).padStart(2, '0') : '—'
    const monthLabel = game.startsParts ? monthShort[game.startsParts.month - 1] : ''
    const weekdayLabel = game.startsDate ? weekdayShort[game.startsDate.getDay()] : ''

    return (
      <ListRow
        key={game.discord_message_id}
        className={cn('gap-3', isPast && !isArchive && 'opacity-70')}
      >
        <div
          className={cn(
            'flex w-14 shrink-0 flex-col items-center justify-center rounded-box border-l-4 px-1 py-1 text-center leading-tight',
            isToday
              ? 'bg-primary text-primary-content'
              : isPast
                ? 'bg-base-200/60 text-base-content/60'
                : 'bg-base-200 text-base-content/80',
            primaryAccent ? primaryAccent.border : 'border-base-300',
          )}
        >
          <span className="text-[10px] uppercase tracking-wide opacity-80">{weekdayLabel}</span>
          <span className="text-xl font-bold leading-none tabular-nums">{day}</span>
          <span className="text-[10px] uppercase tracking-wide opacity-80">{monthLabel}</span>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {isToday && !isArchive ? (
              <span className="badge badge-primary badge-sm">Heute</span>
            ) : null}
            {tierKeys.map((tk) => {
              const acc = tierAccent[tk]
              return (
                <span
                  key={tk}
                  className={cn(
                    'badge badge-sm gap-1 border-0',
                    acc ? acc.soft : 'bg-base-200',
                    acc ? acc.text : 'text-base-content/70',
                  )}
                >
                  <LogoTier tier={tk} width={10} />
                  {tk.toUpperCase()}
                </span>
              )
            })}
            <h3 className="min-w-0 truncate text-base font-semibold leading-snug" title={game.content ?? undefined}>
              {game.title}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/60">
            {game.timeLabel ? (
              <span className="font-medium tabular-nums text-base-content/80">{game.timeLabel}</span>
            ) : (
              <span className="italic text-base-content/40">Zeit unbekannt</span>
            )}
            {relative ? (
              <>
                <span className="text-base-content/30">·</span>
                <span>{relative}</span>
              </>
            ) : null}
            <span className="text-base-content/30">·</span>
            <div className="flex items-center gap-1.5">
              <div className="avatar">
                <div className="w-4 rounded-full bg-base-200">
                  {game.avatarUrl ? (
                    <img src={game.avatarUrl} alt={game.authorName} />
                  ) : (
                    <span className="text-[9px] font-semibold text-base-content/70">
                      {getInitials(game.authorName)}
                    </span>
                  )}
                </div>
              </div>
              <span>{game.authorName}</span>
            </div>
            <span
              className={cn('h-1.5 w-1.5 rounded-full', confidenceColor)}
              title={`Parse confidence: ${confidence.toFixed(2)}`}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {game.discordAppUrl ? (
            <a
              href={game.discordAppUrl}
              className="btn btn-ghost btn-sm px-2"
              title="Open in Discord app"
            >
              <DiscordIcon width={16} />
            </a>
          ) : null}
          {game.discordUrl ? (
            <a
              href={game.discordUrl}
              className="btn btn-ghost btn-sm px-2"
              title="Open in browser"
              target="_blank"
              rel="noreferrer"
            >
              <SquareArrowOutUpRight size={14} />
            </a>
          ) : null}
        </div>
      </ListRow>
    )
  }

  return (
    <AppLayout>
      <Head title={isArchive ? 'Games · Archiv' : 'Games'} />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{isArchive ? 'Archiv' : 'Games'}</h1>
            <p className="text-sm text-base-content/70">
              {isArchive
                ? 'Vergangene Spielankündigungen.'
                : 'Kommende Spielankündigungen aus Discord.'}
            </p>
            <p className="text-xs text-base-content/60">
              {pagination.total} Einträge
              {pagination.lastPage > 1 ? ` · Seite ${pagination.currentPage}/${pagination.lastPage}` : ''}
              {lastSyncedAt
                ? (() => {
                    const formatted = formatGameDate(lastSyncedAt, true)
                    return formatted ? ` · Letzter Sync ${formatted}` : ''
                  })()
                : ''}
              {` · Zeitzone ${timeZoneLabel}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {calendarEnabled ? (
              <div role="tablist" className="tabs tabs-border">
                <button
                  role="tab"
                  type="button"
                  className={cn('tab gap-1.5', viewMode === 'list' && 'tab-active')}
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon size={14} />
                  Liste
                </button>
                <button
                  role="tab"
                  type="button"
                  className={cn('tab gap-1.5', viewMode === 'calendar' && 'tab-active')}
                  onClick={() => setViewMode('calendar')}
                >
                  <LayoutGrid size={14} />
                  Kalender
                </button>
              </div>
            ) : null}
            <Link
              href={route(isArchive ? 'games.index' : 'games.archive')}
              className="btn btn-sm btn-ghost gap-1.5"
            >
              {isArchive ? (
                <>
                  <CalendarClock size={14} />
                  Kommend
                </>
              ) : (
                <>
                  <Archive size={14} />
                  Archiv
                </>
              )}
            </Link>
          </div>
        </section>

        <div className="space-y-3 rounded-box border border-base-200 bg-base-100 p-4">
          <Input
            type="search"
            placeholder="Suchen nach Titel, Autor, Inhalt..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          >
            Suche
          </Input>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-base-content/60">Tier:</span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  className={cn('btn btn-xs', selectedTiers.length === 0 ? 'btn-primary' : 'btn-ghost')}
                  onClick={() => setSelectedTiers([])}
                >
                  Alle
                </button>
                {tierOptions.map((tier) => {
                  const isActive = selectedTiers.includes(tier)
                  const accent = tierAccent[tier]
                  return (
                    <button
                      key={tier}
                      type="button"
                      className={cn(
                        'btn btn-xs gap-1',
                        isActive ? 'btn-primary' : 'btn-ghost',
                        !isActive && accent && accent.text,
                      )}
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
          <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/50">
            <span>
              {filteredGames.length} von {games.length} auf dieser Seite
            </span>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center text-sm text-base-content/70">
            {isArchive
              ? 'Noch keine vergangenen Ankündigungen im Archiv.'
              : 'Aktuell keine kommenden Spiele angekündigt.'}
            {!isArchive ? (
              <div className="mt-3">
                <Link href={route('games.archive')} className="btn btn-sm btn-ghost gap-1.5">
                  <Archive size={14} />
                  Archiv ansehen
                </Link>
              </div>
            ) : null}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center text-sm text-base-content/70">
            Keine Ankündigungen passen zu den Filtern.
          </div>
        ) : activeViewMode === 'calendar' ? (
          <div className="space-y-3 rounded-box border border-base-200 bg-base-100 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Kalender · {calendarData.monthLabel}</h3>
              <span className="text-xs text-base-content/60">{filteredGames.length} Spiele</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-base-content/50">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarData.weeks.flatMap((week, weekIndex) =>
                week.map(({ date, key }) => {
                  const dayGames = calendarData.gamesByDate.get(key) ?? []
                  const isCurrentMonth = date.getMonth() === calendarData.monthIndex
                  const isToday = key === todayKey
                  return (
                    <div
                      key={`${key}-${weekIndex}`}
                      className={cn(
                        'min-h-[80px] rounded-box border bg-base-100 p-1.5 text-[10px]',
                        isToday ? 'border-primary' : 'border-base-200',
                        !isCurrentMonth && 'bg-base-200/40 text-base-content/40',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('font-semibold', isToday && 'text-primary')}>
                          {date.getDate()}
                        </span>
                        {dayGames.length ? (
                          <span className="badge badge-ghost badge-xs">{dayGames.length}</span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-col gap-1">
                        {dayGames.slice(0, 3).map((game) => {
                          const tiers = game.tierList
                          const acc = tiers[0] ? tierAccent[tiers[0]] : undefined
                          return (
                            <div
                              key={game.discord_message_id}
                              className={cn(
                                'flex items-center gap-1 truncate rounded px-1 py-0.5',
                                acc ? acc.soft : 'bg-base-200',
                              )}
                            >
                              {tiers.length ? (
                                <span className="flex items-center gap-0.5">
                                  {tiers.map((tk) => (
                                    <LogoTier key={tk} tier={tk} width={10} />
                                  ))}
                                </span>
                              ) : null}
                              <span className="tabular-nums text-base-content/70">
                                {game.timeLabel ?? '—'}
                              </span>
                              <span className="truncate">{game.title}</span>
                            </div>
                          )
                        })}
                        {dayGames.length > 3 ? (
                          <span className="text-base-content/50">+{dayGames.length - 3} mehr</span>
                        ) : null}
                      </div>
                    </div>
                  )
                }),
              )}
            </div>
          </div>
        ) : (
          <List>{filteredGames.map((game) => renderGameRow(game))}</List>
        )}

        {pagination.lastPage > 1 ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-200/80 pt-3">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={pagination.currentPage <= 1}
              onClick={() => navigateToPage(pagination.currentPage - 1)}
            >
              Zurück
            </button>
            <span className="px-1 text-xs text-base-content/60">
              Seite {pagination.currentPage} / {pagination.lastPage}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={!pagination.hasMorePages}
              onClick={() => navigateToPage(pagination.currentPage + 1)}
            >
              Weiter
            </button>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
