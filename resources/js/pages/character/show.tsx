import { List, ListRow } from '@/components/ui/list'
import { ActionMenu } from '@/components/ui/action-menu'
import UpdateAdventureModal from '@/pages/character/update-adventure-modal'
import UpdateDowntimeModal from '@/pages/character/update-downtime-modal'
import UpdateSimplifiedLevelModal from '@/pages/character/update-simplified-level-modal'
import AppLayout from '@/layouts/app-layout'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { getAllyDisplayName, getAllyOwnerName } from '@/helper/allyDisplay'
import { Character, Ally, PageProps } from '@/types'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, ChevronUp, Heart, LoaderCircle } from 'lucide-react'
import { useImage } from 'react-image'
import { cn } from '@/lib/utils'
import { useMemo, useState, useTransition } from 'react'

function CharacterPortrait({ character, className }: { character: Character; className?: string }) {
  const avatarValue = String(character.avatar || '').trim()
  const srcList = avatarValue
    ? [avatarValue.startsWith('http') ? avatarValue : `/storage/${avatarValue}`, '/images/no-avatar.svg']
    : ['/images/no-avatar.svg']
  const { src } = useImage({
    srcList,
  })
  return <img className={cn('aspect-square rounded-full object-cover', className)} src={src} alt={character.name} />
}

function AllyPortrait({ ally, className }: { ally: Ally; className?: string }) {
  const linkedAvatar = String(ally.linked_character?.avatar || '').trim()
  const allyAvatar = String(ally.avatar || '').trim()
  const { src } = useImage({
    srcList: linkedAvatar
      ? [linkedAvatar.startsWith('http') ? linkedAvatar : `/storage/${linkedAvatar}`, '/images/no-avatar.svg']
      : allyAvatar
        ? [allyAvatar.startsWith('http') ? allyAvatar : `/storage/${allyAvatar}`, '/images/no-avatar.svg']
        : ['/images/no-avatar.svg'],
  })
  return <img className={cn('h-10 w-10 rounded-full object-cover', className)} src={src} alt={getAllyDisplayName(ally)} />
}

function RatingHearts({ rating }: { rating: number }) {
  const normalized = Math.max(1, Math.min(5, rating || 3))
  return (
    <div className="flex items-center gap-0.5 text-primary">
      {Array.from({ length: 5 }, (_, index) => (
        <Heart key={index} size={14} className={index < normalized ? 'fill-current' : 'text-base-content/30'} />
      ))}
    </div>
  )
}

const formatParticipantSummary = (names: string[]) => {
  const unique = Array.from(new Set(names.filter(Boolean)))
  if (unique.length === 0) return ''
  const visible = unique.slice(0, 3).join(', ')
  const remaining = unique.length - 3
  return remaining > 0 ? `${visible} +${remaining} more` : visible
}

export default function Show({ character, guildCharacters }: { character: Character; guildCharacters: Character[] }) {
  const { auth } = usePage<PageProps>().props
  const usesSimplifiedTracking = Boolean(
    character.use_simplified_tracking ?? auth.user?.simplified_tracking,
  )
  const [expandedAdventures, setExpandedAdventures] = useState<number[]>([])
  const [expandedDowntimes, setExpandedDowntimes] = useState<number[]>([])
  const [activeAdventureModalId, setActiveAdventureModalId] = useState<number | null>(null)
  const [activeDowntimeModalId, setActiveDowntimeModalId] = useState<number | null>(null)
  const [adventureSortDir, setAdventureSortDir] = useState<'desc' | 'asc'>('desc')
  const [downtimeSortDir, setDowntimeSortDir] = useState<'desc' | 'asc'>('desc')
  const [isAdventuresPending, startAdventuresTransition] = useTransition()
  const [isDowntimesPending, startDowntimesTransition] = useTransition()
  const [isAlliesPending, startAlliesTransition] = useTransition()
  const [adventuresOpen, setAdventuresOpen] = useState(
    character.adventures.length > 0 && character.adventures.length <= 6,
  )
  const [downtimesOpen, setDowntimesOpen] = useState(
    character.downtimes.length > 0 && character.downtimes.length <= 6,
  )
  const [alliesOpen, setAlliesOpen] = useState(character.allies.length > 0 && character.allies.length <= 12)

  const adventureNotesMap = useMemo(() => {
    const map = new Map<number, string>()
    character.adventures.forEach((adv) => {
      if (adv.notes) {
        map.set(adv.id, adv.notes)
      }
    })
    return map
  }, [character.adventures])

  const downtimeNotesMap = useMemo(() => {
    const map = new Map<number, string>()
    character.downtimes.forEach((dt) => {
      if (dt.notes) {
        map.set(dt.id, dt.notes)
      }
    })
    return map
  }, [character.downtimes])

  const sortedAdventures = useMemo(() => {
    const direction = adventureSortDir === 'desc' ? -1 : 1
    return [...character.adventures].sort((a, b) => {
      const aDate = new Date(a.start_date).getTime()
      const bDate = new Date(b.start_date).getTime()
      return (aDate - bDate) * direction
    })
  }, [character.adventures, adventureSortDir])

  const sortedDowntimes = useMemo(() => {
    const direction = downtimeSortDir === 'desc' ? -1 : 1
    return [...character.downtimes].sort((a, b) => {
      const aDate = new Date(a.start_date).getTime()
      const bDate = new Date(b.start_date).getTime()
      return (aDate - bDate) * direction
    })
  }, [character.downtimes, downtimeSortDir])

  const adventureParticipantMap = useMemo(() => {
    const map = new Map<number, string>()
    sortedAdventures.forEach((adv) => {
      const summary = formatParticipantSummary(
        (adv.allies ?? []).map((ally) => getAllyDisplayName(ally)),
      )
      if (summary) {
        map.set(adv.id, summary)
      }
    })
    return map
  }, [sortedAdventures])

  const adventureTotalDuration = useMemo(
    () => character.adventures.reduce((total, adv) => total + adv.duration, 0),
    [character.adventures],
  )
  const downtimeTotalDuration = useMemo(
    () => character.downtimes.reduce((total, dt) => total + dt.duration, 0),
    [character.downtimes],
  )

  const toggleAdventureNotes = (id: number) => {
    setExpandedAdventures((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  const handleAdventureDelete = (adventureId: number) => {
    if (!window.confirm('Delete this adventure?')) return
    router.delete(route('adventures.destroy', { adventure: adventureId }), {
      preserveScroll: true,
    })
    setActiveAdventureModalId((current) => (current === adventureId ? null : current))
  }

  const toggleDowntimeNotes = (id: number) => {
    setExpandedDowntimes((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  const handleDowntimeDelete = (downtimeId: number) => {
    if (!window.confirm('Delete this downtime?')) return
    router.delete(route('downtimes.destroy', { downtime: downtimeId }), {
      preserveScroll: true,
    })
    setActiveDowntimeModalId((current) => (current === downtimeId ? null : current))
  }

  return (
    <AppLayout>
      <Head title={character.name + ' Details'} />
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h1 className="text-2xl font-bold">{character.name} Details</h1>
          <Link href={route('characters.index')} className="btn btn-sm">
            Back
          </Link>
        </div>
        <div className="flex justify-center">
          <CharacterPortrait character={character} className="h-32 w-32" />
        </div>

        {usesSimplifiedTracking ? (
          <div className="rounded-box border border-base-200 bg-base-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Simplified tracking</h2>
                <p className="text-sm text-base-content/70">
                  Adventures and downtime are hidden. Set the current level to keep tiers in sync.
                </p>
              </div>
              <UpdateSimplifiedLevelModal character={character} />
            </div>
          </div>
        ) : null}

        {!usesSimplifiedTracking ? (
          <div>
            <div className="rounded-box border border-base-200 bg-base-100">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() =>
                startAdventuresTransition(() => setAdventuresOpen((current) => !current))
              }
              aria-expanded={adventuresOpen}
              disabled={character.adventures.length === 0}
            >
              <div className="flex items-center gap-2">
                {adventuresOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {isAdventuresPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                <div>
                  <h2 className="text-base font-semibold">Adventures</h2>
                  <p className="text-xs text-base-content/60">
                    {character.adventures.length === 0
                      ? 'No adventures recorded'
                      : `${character.adventures.length} entries • ${secondsToHourMinuteString(
                          adventureTotalDuration,
                        )} total`}
                  </p>
                </div>
              </div>
            </button>
            {adventuresOpen ? (
              <div className="border-t border-base-200 px-4 pb-4 pt-2">
                {character.adventures.length > 0 ? (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_40px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                      <span>Adventure</span>
                      <span>Notes</span>
                      <span className="text-right">Time</span>
                      <button
                        type="button"
                        className="flex items-center justify-end gap-1 text-right"
                        onClick={() =>
                          setAdventureSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                        }
                      >
                        Date
                        {adventureSortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </button>
                      <span className="text-right">Actions</span>
                    </div>
                    <List className="shadow-none">
                      {sortedAdventures.map((adv) => {
                        const notes = adventureNotesMap.get(adv.id) ?? ''
                        const showToggle = notes.length > 140
                        const isExpanded = expandedAdventures.includes(adv.id)
                        const participantSummary = adventureParticipantMap.get(adv.id) ?? ''
                        return (
                          <ListRow
                            key={adv.id}
                            className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_40px] items-start gap-4"
                          >
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-medium">{adv.title || 'Adventure'}</h3>
                              {participantSummary ? (
                                <p className="text-xs text-base-content/50">Played with: {participantSummary}</p>
                              ) : null}
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p
                                className={cn(
                                  'text-base-content/60 text-xs whitespace-pre-wrap',
                                  !isExpanded && 'line-clamp-2',
                                )}
                              >
                                {notes || 'No notes'}
                              </p>
                              {showToggle ? (
                                <button
                                  type="button"
                                  className="text-xs text-primary/70 hover:text-primary"
                                  onClick={() => toggleAdventureNotes(adv.id)}
                                >
                                  {isExpanded ? 'Show less' : 'Show full notes'}
                                </button>
                              ) : null}
                            </div>
                            <p className="text-right text-xs font-medium">
                              {secondsToHourMinuteString(adv.duration)}
                            </p>
                            <div className="text-right text-xs text-base-content/70">
                              {format(new Date(adv.start_date), 'dd.MM.yyyy')}
                            </div>
                            <div className="flex justify-end">
                              <UpdateAdventureModal
                                adventure={adv}
                                allies={character.allies}
                                guildCharacters={guildCharacters}
                                isOpen={activeAdventureModalId === adv.id}
                                onClose={() => setActiveAdventureModalId(null)}
                                showTrigger={false}
                              />
                              <ActionMenu
                                items={[
                                  {
                                    label: 'Edit',
                                    onSelect: () => setActiveAdventureModalId(adv.id),
                                  },
                                  {
                                    label: 'Delete',
                                    tone: 'error',
                                    onSelect: () => handleAdventureDelete(adv.id),
                                  },
                                ]}
                              />
                            </div>
                          </ListRow>
                        )
                      })}
                    </List>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No adventures</p>
                )}
              </div>
            ) : null}
            </div>
          </div>
        ) : null}

        {!usesSimplifiedTracking ? (
          <div>
            <div className="rounded-box border border-base-200 bg-base-100">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() =>
                startDowntimesTransition(() => setDowntimesOpen((current) => !current))
              }
              aria-expanded={downtimesOpen}
              disabled={character.downtimes.length === 0}
            >
              <div className="flex items-center gap-2">
                {downtimesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {isDowntimesPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                <div>
                  <h2 className="text-base font-semibold">Downtimes</h2>
                  <p className="text-xs text-base-content/60">
                    {character.downtimes.length === 0
                      ? 'No downtimes recorded'
                      : `${character.downtimes.length} entries • ${secondsToHourMinuteString(
                          downtimeTotalDuration,
                        )} total`}
                  </p>
                </div>
              </div>
            </button>
            {downtimesOpen ? (
              <div className="border-t border-base-200 px-4 pb-4 pt-2">
                {character.downtimes.length > 0 ? (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_40px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                      <span>Type</span>
                      <span>Notes</span>
                      <span className="text-right">Time</span>
                      <button
                        type="button"
                        className="flex items-center justify-end gap-1 text-right"
                        onClick={() =>
                          setDowntimeSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                        }
                      >
                        Date
                        {downtimeSortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </button>
                      <span className="text-right">Actions</span>
                    </div>
                    <List className="shadow-none">
                      {sortedDowntimes.map((dt) => {
                        const notes = downtimeNotesMap.get(dt.id) ?? ''
                        const showToggle = notes.length > 140
                        const isExpanded = expandedDowntimes.includes(dt.id)
                        return (
                          <ListRow
                            key={dt.id}
                            className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_40px] items-start gap-4"
                          >
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-medium capitalize">{dt.type}</h3>
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p
                                className={cn(
                                  'text-base-content/60 text-xs whitespace-pre-wrap',
                                  !isExpanded && 'line-clamp-2',
                                )}
                              >
                                {notes || 'No notes'}
                              </p>
                              {showToggle ? (
                                <button
                                  type="button"
                                  className="text-xs text-primary/70 hover:text-primary"
                                  onClick={() => toggleDowntimeNotes(dt.id)}
                                >
                                  {isExpanded ? 'Show less' : 'Show full notes'}
                                </button>
                              ) : null}
                            </div>
                            <p className="text-right text-xs font-medium">
                              {secondsToHourMinuteString(dt.duration)}
                            </p>
                            <div className="text-right text-xs text-base-content/70">
                              {format(new Date(dt.start_date), 'dd.MM.yyyy')}
                            </div>
                            <div className="flex justify-end">
                              <UpdateDowntimeModal
                                downtime={dt}
                                isOpen={activeDowntimeModalId === dt.id}
                                onClose={() => setActiveDowntimeModalId(null)}
                                showTrigger={false}
                              />
                              <ActionMenu
                                items={[
                                  {
                                    label: 'Edit',
                                    onSelect: () => setActiveDowntimeModalId(dt.id),
                                  },
                                  {
                                    label: 'Delete',
                                    tone: 'error',
                                    onSelect: () => handleDowntimeDelete(dt.id),
                                  },
                                ]}
                              />
                            </div>
                          </ListRow>
                        )
                      })}
                    </List>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No downtimes</p>
                )}
              </div>
            ) : null}
            </div>
          </div>
        ) : null}

        <div>
          <div className="rounded-box border border-base-200 bg-base-100">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() =>
                startAlliesTransition(() => setAlliesOpen((current) => !current))
              }
              aria-expanded={alliesOpen}
              disabled={character.allies.length === 0}
            >
              <div className="flex items-center gap-2">
                {alliesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {isAlliesPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
                <div>
                  <h2 className="text-base font-semibold">Allies</h2>
                  <p className="text-xs text-base-content/60">
                    {character.allies.length === 0
                      ? 'No allies recorded'
                      : `${character.allies.length} allies`}
                  </p>
                </div>
              </div>
            </button>
            {alliesOpen ? (
              <div className="border-t border-base-200 px-4 pb-4 pt-2">
                {character.allies.length > 0 ? (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_140px_200px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                      <span>Ally</span>
                      <span>Standing</span>
                      <span>Classes</span>
                    </div>
                    <List className="shadow-none">
                      {character.allies.map((ally) => (
                        <ListRow
                          key={ally.id}
                          className="grid w-full grid-cols-[minmax(0,1fr)_140px_200px] items-center gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <AllyPortrait ally={ally} className="h-9 w-9" />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {getAllyDisplayName(ally)}
                              </span>
                              <span className="text-base-content/50 inline-flex items-center gap-1 rounded-full border border-base-200 px-2 py-0.5 text-[10px] uppercase">
                                {ally.linked_character_id ? 'Linked' : 'Custom'}
                              </span>
                            </div>
                            {getAllyOwnerName(ally) ? (
                              <span className="truncate text-xs text-base-content/50">
                                Owner: {getAllyOwnerName(ally)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                          <RatingHearts rating={ally.rating} />
                          <span className="truncate text-sm text-base-content/70">{ally.classes || '-'}</span>
                        </ListRow>
                      ))}
                    </List>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No allies</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
