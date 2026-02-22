import { List, ListRow } from '@/components/ui/list'
import { Button } from '@/components/ui/button'
import UpdateAdventureModal from '@/pages/character/update-adventure-modal'
import UpdateDowntimeModal from '@/pages/character/update-downtime-modal'
import AppLayout from '@/layouts/app-layout'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { getAllyDisplayName, getAllyOwnerName } from '@/helper/allyDisplay'
import { Character, Ally } from '@/types'
import { Head, Link, router } from '@inertiajs/react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, ChevronUp, Heart, LoaderCircle, Pencil, Trash } from 'lucide-react'
import { useImage } from 'react-image'
import { cn } from '@/lib/utils'
import { useMemo, useState, useTransition } from 'react'

function CharacterPortrait({
  character,
  className,
  masked = true,
}: {
  character: Character
  className?: string
  masked?: boolean
}) {
  const avatarValue = String(character.avatar || '').trim()
  const srcList = avatarValue
    ? [avatarValue.startsWith('http') ? avatarValue : `/storage/${avatarValue}`, '/images/no-avatar.svg']
    : ['/images/no-avatar.svg']
  const { src } = useImage({
    srcList,
  })
  return (
    <img
      className={cn('aspect-square object-cover', masked ? 'rounded-full' : 'rounded-none', className)}
      src={src}
      alt={character.name}
    />
  )
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
  const avatarMasked = character.avatar_masked ?? true
  const [expandedAdventures, setExpandedAdventures] = useState<number[]>([])
  const [expandedDowntimes, setExpandedDowntimes] = useState<number[]>([])
  const [activeAdventureModalId, setActiveAdventureModalId] = useState<number | null>(null)
  const [activeDowntimeModalId, setActiveDowntimeModalId] = useState<number | null>(null)
  const [adventureSortDir, setAdventureSortDir] = useState<'desc' | 'asc'>('desc')
  const [downtimeSortDir, setDowntimeSortDir] = useState<'desc' | 'asc'>('desc')
  const [allySortDir, setAllySortDir] = useState<'desc' | 'asc'>('desc')
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

  const sortedAllies = useMemo(() => {
    const direction = allySortDir === 'desc' ? -1 : 1
    return [...character.allies].sort((a, b) => {
      const ratingDiff = (a.rating ?? 3) - (b.rating ?? 3)
      if (ratingDiff !== 0) {
        return ratingDiff * direction
      }

      return getAllyDisplayName(a).localeCompare(getAllyDisplayName(b))
    })
  }, [allySortDir, character.allies])

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
        <div className="space-y-2 border-b border-base-200 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold sm:text-2xl">{character.name} Details</h1>
            <Link href={route('characters.index')} className="btn btn-sm">
              Back
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-ghost badge-sm">{character.adventures.length} Adventures</span>
            <span className="badge badge-ghost badge-sm">{character.downtimes.length} Downtimes</span>
            <span className="badge badge-ghost badge-sm">{character.allies.length} Allies</span>
          </div>
        </div>
        <div className="flex justify-center">
          <CharacterPortrait character={character} className="h-24 w-24 sm:h-32 sm:w-32" masked={avatarMasked} />
        </div>

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
                    <div className="flex justify-end pb-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          setAdventureSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                        }
                      >
                        Date
                        {adventureSortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </Button>
                    </div>
                    <List className="md:hidden shadow-none">
                      {sortedAdventures.map((adv) => {
                        const notes = adventureNotesMap.get(adv.id) ?? ''
                        const showToggle = notes.length > 140
                        const isExpanded = expandedAdventures.includes(adv.id)
                        const participantSummary = adventureParticipantMap.get(adv.id) ?? ''
                        return (
                          <ListRow key={adv.id} className="block">
                            <div className="space-y-2 rounded-box border border-base-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-medium">{adv.title || 'Adventure'}</h3>
                                  {participantSummary ? (
                                    <p className="text-xs text-base-content/50">Played with: {participantSummary}</p>
                                  ) : null}
                                </div>
                                <span className="shrink-0 text-xs text-base-content/70">
                                  {format(new Date(adv.start_date), 'dd.MM.yyyy')}
                                </span>
                              </div>
                              {adv.is_pseudo ? (
                                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                  Simplified tracking
                                </span>
                              ) : null}
                              <p
                                className={cn(
                                  'text-base-content/60 text-xs whitespace-pre-wrap',
                                  !isExpanded && 'line-clamp-3',
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
                              <div className="flex items-center justify-between gap-2 border-t border-base-200 pt-2">
                                <span className="text-xs font-medium">
                                  {secondsToHourMinuteString(adv.duration)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {adv.is_pseudo ? (
                                    <span className="text-xs text-base-content/50">Auto</span>
                                  ) : (
                                    <>
                                      <UpdateAdventureModal
                                        adventure={adv}
                                        allies={character.allies}
                                        guildCharacters={guildCharacters}
                                        isOpen={activeAdventureModalId === adv.id}
                                        onClose={() => setActiveAdventureModalId(null)}
                                        showTrigger={false}
                                      />
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        aria-label="Edit adventure"
                                        title="Edit adventure"
                                        onClick={() => setActiveAdventureModalId(adv.id)}
                                      >
                                        <Pencil size={13} />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        color="error"
                                        aria-label="Delete adventure"
                                        title="Delete adventure"
                                        onClick={() => handleAdventureDelete(adv.id)}
                                      >
                                        <Trash size={13} />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </ListRow>
                        )
                      })}
                    </List>
                    <div className="hidden md:block overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_64px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                          <span>Adventure</span>
                          <span>Notes</span>
                          <span className="text-right">Time</span>
                          <span className="text-right">Date</span>
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
                                className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_64px] items-start gap-4"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
                                      {adv.title || 'Adventure'}
                                    </h3>
                                    {adv.is_pseudo ? (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                        Simplified tracking
                                      </span>
                                    ) : null}
                                  </div>
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
                                <div className="flex justify-end gap-2">
                                  {adv.is_pseudo ? (
                                    <span className="text-xs text-base-content/50">Auto</span>
                                  ) : (
                                    <>
                                      <UpdateAdventureModal
                                        adventure={adv}
                                        allies={character.allies}
                                        guildCharacters={guildCharacters}
                                        isOpen={activeAdventureModalId === adv.id}
                                        onClose={() => setActiveAdventureModalId(null)}
                                        showTrigger={false}
                                      />
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        aria-label="Edit adventure"
                                        title="Edit adventure"
                                        onClick={() => setActiveAdventureModalId(adv.id)}
                                      >
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        modifier="square"
                                        color="error"
                                        aria-label="Delete adventure"
                                        title="Delete adventure"
                                        onClick={() => handleAdventureDelete(adv.id)}
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </ListRow>
                            )
                          })}
                        </List>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No adventures</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

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
                    <div className="flex justify-end pb-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          setDowntimeSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                        }
                      >
                        Date
                        {downtimeSortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </Button>
                    </div>
                    <List className="md:hidden shadow-none">
                      {sortedDowntimes.map((dt) => {
                        const notes = downtimeNotesMap.get(dt.id) ?? ''
                        const showToggle = notes.length > 140
                        const isExpanded = expandedDowntimes.includes(dt.id)
                        return (
                          <ListRow key={dt.id} className="block">
                            <div className="space-y-2 rounded-box border border-base-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="truncate text-sm font-medium capitalize">{dt.type}</h3>
                                <span className="shrink-0 text-xs text-base-content/70">
                                  {format(new Date(dt.start_date), 'dd.MM.yyyy')}
                                </span>
                              </div>
                              <p
                                className={cn(
                                  'text-base-content/60 text-xs whitespace-pre-wrap',
                                  !isExpanded && 'line-clamp-3',
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
                              <div className="flex items-center justify-between gap-2 border-t border-base-200 pt-2">
                                <span className="text-xs font-medium">
                                  {secondsToHourMinuteString(dt.duration)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <UpdateDowntimeModal
                                    downtime={dt}
                                    isOpen={activeDowntimeModalId === dt.id}
                                    onClose={() => setActiveDowntimeModalId(null)}
                                    showTrigger={false}
                                  />
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    modifier="square"
                                    aria-label="Edit downtime"
                                    title="Edit downtime"
                                    onClick={() => setActiveDowntimeModalId(dt.id)}
                                  >
                                    <Pencil size={13} />
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    modifier="square"
                                    color="error"
                                    aria-label="Delete downtime"
                                    title="Delete downtime"
                                    onClick={() => handleDowntimeDelete(dt.id)}
                                  >
                                    <Trash size={13} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </ListRow>
                        )
                      })}
                    </List>
                    <div className="hidden md:block overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_64px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                          <span>Type</span>
                          <span>Notes</span>
                          <span className="text-right">Time</span>
                          <span className="text-right">Date</span>
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
                                className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_64px] items-start gap-4"
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
                                <div className="flex justify-end gap-2">
                                  <UpdateDowntimeModal
                                    downtime={dt}
                                    isOpen={activeDowntimeModalId === dt.id}
                                    onClose={() => setActiveDowntimeModalId(null)}
                                    showTrigger={false}
                                  />
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    modifier="square"
                                    aria-label="Edit downtime"
                                    title="Edit downtime"
                                    onClick={() => setActiveDowntimeModalId(dt.id)}
                                  >
                                    <Pencil size={14} />
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    modifier="square"
                                    color="error"
                                    aria-label="Delete downtime"
                                    title="Delete downtime"
                                    onClick={() => handleDowntimeDelete(dt.id)}
                                  >
                                    <Trash size={14} />
                                  </Button>
                                </div>
                              </ListRow>
                            )
                          })}
                        </List>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No downtimes</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

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
                    <div className="flex justify-end pb-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          setAllySortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
                        }
                      >
                        Standing
                        {allySortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      </Button>
                    </div>
                    <List className="md:hidden shadow-none">
                      {sortedAllies.map((ally) => (
                        <ListRow key={ally.id} className="block">
                          <div className="space-y-2 rounded-box border border-base-200 p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <AllyPortrait ally={ally} className="h-10 w-10" />
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="truncate text-sm font-medium">{getAllyDisplayName(ally)}</span>
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
                            <div className="flex items-center justify-between gap-3 border-t border-base-200 pt-2">
                              <RatingHearts rating={ally.rating} />
                              <span className="truncate text-sm text-base-content/70">{ally.classes || '-'}</span>
                            </div>
                          </div>
                        </ListRow>
                      ))}
                    </List>
                    <div className="hidden md:block overflow-x-auto">
                      <div className="min-w-[560px]">
                        <div className="grid grid-cols-[minmax(0,1fr)_140px_200px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                          <span>Ally</span>
                          <span>Standing</span>
                          <span>Classes</span>
                        </div>
                        <List className="shadow-none">
                          {sortedAllies.map((ally) => (
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
                      </div>
                    </div>
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
