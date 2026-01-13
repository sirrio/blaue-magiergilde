import { List, ListRow } from '@/components/ui/list'
import { Button } from '@/components/ui/button'
import UpdateAdventureModal from '@/pages/character/update-adventure-modal'
import UpdateDowntimeModal from '@/pages/character/update-downtime-modal'
import AppLayout from '@/layouts/app-layout'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { Character, Ally } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { useImage } from 'react-image'
import { cn } from '@/lib/utils'
import { useMemo, useState } from 'react'

function CharacterPortrait({ character, className }: { character: Character; className?: string }) {
  const srcList = character.avatar ? [`/storage/${character.avatar}`, '/images/no-avatar.svg'] : ['/images/no-avatar.svg']
  const { src } = useImage({
    srcList,
  })
  return <img className={cn('aspect-square rounded-full object-cover', className)} src={src} alt={character.name} />
}

function AllyPortrait({ ally, className }: { ally: Ally; className?: string }) {
  const { src } = useImage({
    srcList: ally.avatar ? ['/storage/' + ally.avatar, '/images/no-avatar.svg'] : ['/images/no-avatar.svg'],
  })
  return <img className={cn('h-10 w-10 rounded-full object-cover', className)} src={src} alt={ally.name} />
}

export default function Show({ character }: { character: Character }) {
  const [expandedAdventures, setExpandedAdventures] = useState<number[]>([])
  const [expandedDowntimes, setExpandedDowntimes] = useState<number[]>([])
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

  const toggleDowntimeNotes = (id: number) => {
    setExpandedDowntimes((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
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

        <div>
          <div className="rounded-box border border-base-200 bg-base-100">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => setAdventuresOpen((current) => !current)}
              aria-expanded={adventuresOpen}
              disabled={character.adventures.length === 0}
            >
              <div className="flex items-center gap-2">
                {adventuresOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_32px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                      <span>Adventure</span>
                      <span>Notes</span>
                      <span className="text-right">Time</span>
                      <span className="text-right">Date</span>
                      <span className="text-right">Edit</span>
                    </div>
                    <List className="shadow-none">
                      {character.adventures.map((adv) => {
                        const notes = adventureNotesMap.get(adv.id) ?? ''
                        const showToggle = notes.length > 140
                        const isExpanded = expandedAdventures.includes(adv.id)
                        return (
                          <ListRow
                            key={adv.id}
                            className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_32px] items-start gap-4"
                          >
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-medium">{adv.title || 'Adventure'}</h3>
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
                              <UpdateAdventureModal adventure={adv}>
                                <Button
                                  size="xs"
                                  modifier="square"
                                  variant="ghost"
                                  aria-label="Edit adventure"
                                  title="Edit adventure"
                                >
                                  <Settings size={14} />
                                </Button>
                              </UpdateAdventureModal>
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

        <div>
          <div className="rounded-box border border-base-200 bg-base-100">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => setDowntimesOpen((current) => !current)}
              aria-expanded={downtimesOpen}
              disabled={character.downtimes.length === 0}
            >
              <div className="flex items-center gap-2">
                {downtimesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_32px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                      <span>Type</span>
                      <span>Notes</span>
                      <span className="text-right">Time</span>
                      <span className="text-right">Date</span>
                      <span className="text-right">Edit</span>
                    </div>
                    <List className="shadow-none">
                      {character.downtimes.map((dt) => {
                        const notes = downtimeNotesMap.get(dt.id) ?? ''
                        const showToggle = notes.length > 140
                        const isExpanded = expandedDowntimes.includes(dt.id)
                        return (
                          <ListRow
                            key={dt.id}
                            className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_32px] items-start gap-4"
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
                              <UpdateDowntimeModal downtime={dt}>
                                <Button
                                  size="xs"
                                  modifier="square"
                                  variant="ghost"
                                  aria-label="Edit downtime"
                                  title="Edit downtime"
                                >
                                  <Settings size={14} />
                                </Button>
                              </UpdateDowntimeModal>
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

        <div>
          <div className="rounded-box border border-base-200 bg-base-100">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => setAlliesOpen((current) => !current)}
              aria-expanded={alliesOpen}
              disabled={character.allies.length === 0}
            >
              <div className="flex items-center gap-2">
                {alliesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                            <span className="truncate text-sm font-medium">{ally.name}</span>
                          </div>
                          <span className="text-sm capitalize">{ally.standing}</span>
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
