import { List, ListRow } from '@/components/ui/list'
import { Button } from '@/components/ui/button'
import UpdateAdventureModal from '@/pages/character/update-adventure-modal'
import UpdateDowntimeModal from '@/pages/character/update-downtime-modal'
import StoreBubbleShopPurchaseModal from '@/pages/character/store-bubble-shop-purchase-modal'
import AppLayout from '@/layouts/app-layout'
import { additionalBubblesForStartTier } from '@/helper/additionalBubblesForStartTier'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { getAllyDisplayName, getAllyOwnerName } from '@/helper/allyDisplay'
import { calculateBubble } from '@/helper/calculateBubble'
import { calculateBubbleShopSpend } from '@/helper/calculateBubbleShopSpend'
import { calculateLevel } from '@/helper/calculateLevel'
import { Character, Ally, PageProps } from '@/types'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, ChevronUp, Heart, LoaderCircle, Pencil, Trash } from 'lucide-react'
import { useImage } from 'react-image'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

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

const SHOP_TYPE_LABELS: Record<string, string> = {
  skill_prof: 'Skill proficiency',
  rare_language: 'Rare language',
  language: 'Language',
  tool: 'Tool',
}

type SectionKey = 'adventures' | 'downtimes' | 'allies' | 'shop'

export default function Show({ character, guildCharacters }: { character: Character; guildCharacters: Character[] }) {
  const { auth } = usePage<PageProps>().props
  const avatarMasked = auth.user?.avatar_masked ?? true
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
  const [shopOpen, setShopOpen] = useState((character.shop_purchases?.length ?? 0) > 0)
  const [activeSection, setActiveSection] = useState<SectionKey>('adventures')
  const activeSectionRef = useRef(activeSection)

  const adventuresRef = useRef<HTMLDivElement | null>(null)
  const downtimesRef = useRef<HTMLDivElement | null>(null)
  const alliesRef = useRef<HTMLDivElement | null>(null)
  const shopRef = useRef<HTMLDivElement | null>(null)

  const sectionRefs = useMemo<Record<SectionKey, React.MutableRefObject<HTMLDivElement | null>>>(
    () => ({
      adventures: adventuresRef,
      downtimes: downtimesRef,
      allies: alliesRef,
      shop: shopRef,
    }),
    [],
  )

  const handleSectionSelect = (section: SectionKey) => {
    setActiveSection(section)
    if (section === 'adventures') setAdventuresOpen(true)
    if (section === 'downtimes') setDowntimesOpen(true)
    if (section === 'allies') setAlliesOpen(true)
    if (section === 'shop') setShopOpen(true)
    sectionRefs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    activeSectionRef.current = activeSection
  }, [activeSection])

  useEffect(() => {
    const targets = Object.entries(sectionRefs)
      .map(([key, ref]) => ({ key, element: ref.current }))
      .filter((entry): entry is { key: SectionKey; element: HTMLDivElement } => Boolean(entry.element))

    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length === 0) return

        const key = visible[0].target.getAttribute('data-section') as SectionKey | null
        if (!key || key === activeSectionRef.current) return

        setActiveSection(key)
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    )

    targets.forEach(({ element }) => observer.observe(element))

    return () => observer.disconnect()
  }, [sectionRefs])

  const shopPurchases = useMemo(() => {
    const entries = character.shop_purchases ?? []
    return [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [character.shop_purchases])

  const bubbleShopSpendTotal = calculateBubbleShopSpend(character)
  const manualBubbleShopSpend = Number(character.bubble_shop_spend ?? 0)
  const additionalBubbles = additionalBubblesForStartTier(character.start_tier)
  const availableBubbles = Math.max(
    0,
    calculateBubble(character) + additionalBubbles - bubbleShopSpendTotal,
  )
  const currentLevel = calculateLevel(character)

  const shopPurchaseCounts = useMemo(() => {
    return shopPurchases.reduce(
      (counts, purchase) => {
        counts[purchase.type] = (counts[purchase.type] ?? 0) + 1
        return counts
      },
      {} as Record<string, number>,
    )
  }, [shopPurchases])

  const shopUnlocked = !character.is_filler && currentLevel >= 5
  const shopOptions = useMemo(() => {
    const normalCount = (shopPurchaseCounts.language ?? 0) + (shopPurchaseCounts.tool ?? 0)

    const buildOption = ({
      value,
      label,
      cost,
      limitReached,
      usageText,
    }: {
      value: 'skill_prof' | 'rare_language' | 'language' | 'tool'
      label: string
      cost: number
      limitReached: boolean
      usageText: string
    }) => {
      let disabledReason = ''
      if (!shopUnlocked) {
        disabledReason = 'Unlocks at level 5.'
      } else if (limitReached) {
        disabledReason = `Limit reached (${usageText}).`
      } else if (availableBubbles < cost) {
        disabledReason = `Need ${cost} bubbles (have ${availableBubbles}).`
      }

      return {
        value,
        label,
        cost,
        disabled: Boolean(disabledReason),
        disabledReason: disabledReason || undefined,
        usageText,
      }
    }

    const skillUsed = shopPurchaseCounts.skill_prof ?? 0
    const rareUsed = shopPurchaseCounts.rare_language ?? 0
    const normalUsed = normalCount

    return [
      buildOption({
        value: 'skill_prof',
        label: 'Skill proficiency',
        cost: 6,
        limitReached: skillUsed >= 1,
        usageText: `${skillUsed}/1 used`,
      }),
      buildOption({
        value: 'rare_language',
        label: 'Rare language',
        cost: 4,
        limitReached: rareUsed >= 1,
        usageText: `${rareUsed}/1 used`,
      }),
      buildOption({
        value: 'language',
        label: 'Language',
        cost: 2,
        limitReached: normalUsed >= 3,
        usageText: `${normalUsed}/3 used (shared)`,
      }),
      buildOption({
        value: 'tool',
        label: 'Tool',
        cost: 2,
        limitReached: normalUsed >= 3,
        usageText: `${normalUsed}/3 used (shared)`,
      }),
    ]
  }, [availableBubbles, shopPurchaseCounts, shopUnlocked])

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

  const handleShopPurchaseDelete = (purchaseId: number) => {
    if (!window.confirm('Delete this bubble shop purchase?')) return
    router.delete(
      route('characters.shop-purchases.destroy', { character: character.id, purchase: purchaseId }),
      {
        preserveScroll: true,
      },
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
          <CharacterPortrait character={character} className="h-32 w-32" masked={avatarMasked} />
        </div>

        <div role="tablist" className="tabs tabs-boxed tabs-sm justify-center">
          {(
            [
              { key: 'adventures', label: 'Adventures' },
              { key: 'downtimes', label: 'Downtime' },
              { key: 'allies', label: 'Allies' },
              { key: 'shop', label: 'Bubble Shop' },
            ] satisfies Array<{ key: SectionKey; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              type="button"
              className={cn('tab', activeSection === tab.key && 'tab-active')}
              onClick={() => handleSectionSelect(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          <div
            ref={adventuresRef}
            data-section="adventures"
            className="rounded-box border border-base-200 bg-base-100 scroll-mt-6"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => {
                setActiveSection('adventures')
                startAdventuresTransition(() => setAdventuresOpen((current) => !current))
              }}
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
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_64px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
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
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No adventures</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div
            ref={downtimesRef}
            data-section="downtimes"
            className="rounded-box border border-base-200 bg-base-100 scroll-mt-6"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => {
                setActiveSection('downtimes')
                startDowntimesTransition(() => setDowntimesOpen((current) => !current))
              }}
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
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_96px_110px_64px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
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
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No downtimes</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div
            ref={alliesRef}
            data-section="allies"
            className="rounded-box border border-base-200 bg-base-100 scroll-mt-6"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => {
                setActiveSection('allies')
                startAlliesTransition(() => setAlliesOpen((current) => !current))
              }}
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

        <div>
          <div
            ref={shopRef}
            data-section="shop"
            className="rounded-box border border-base-200 bg-base-100 scroll-mt-6"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() => {
                setActiveSection('shop')
                setShopOpen((current) => !current)
              }}
              aria-expanded={shopOpen}
            >
              <div className="flex items-center gap-2">
                {shopOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div>
                  <h2 className="text-base font-semibold">Bubble Shop</h2>
                  <p className="text-xs text-base-content/60">
                    {shopPurchases.length === 0
                      ? 'No purchases yet'
                      : `${shopPurchases.length} purchases • ${bubbleShopSpendTotal} bubbles spent`}
                  </p>
                </div>
              </div>
            </button>
            {shopOpen ? (
              <div className="border-t border-base-200 px-4 pb-4 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 text-xs text-base-content/60">
                  <div>
                    Available bubbles: {availableBubbles}
                    {manualBubbleShopSpend > 0 ? ` · Manual adjustments: ${manualBubbleShopSpend}` : ''}
                  </div>
                  <StoreBubbleShopPurchaseModal
                    character={character}
                    options={shopOptions}
                    availableBubbles={availableBubbles}
                  />
                </div>
                {!shopUnlocked ? (
                  <p className="text-xs text-warning/80">Bubble Shop unlocks at level 5.</p>
                ) : null}
                {shopPurchases.length > 0 ? (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_90px_110px_64px] gap-4 px-2 pb-2 text-xs font-semibold uppercase text-base-content/50">
                      <span>Purchase</span>
                      <span className="text-right">Cost</span>
                      <span className="text-right">Date</span>
                      <span className="text-right">Actions</span>
                    </div>
                    <List className="shadow-none">
                      {shopPurchases.map((purchase) => (
                        <ListRow
                          key={purchase.id}
                          className="grid w-full grid-cols-[minmax(0,1fr)_90px_110px_64px] items-center gap-4"
                        >
                          <div className="min-w-0">
                            <span className="truncate text-sm font-medium">
                              {SHOP_TYPE_LABELS[purchase.type] ?? purchase.type}
                            </span>
                          </div>
                          <span className="text-right text-xs font-medium">{purchase.cost}</span>
                          <span className="text-right text-xs text-base-content/70">
                            {format(new Date(purchase.created_at), 'dd.MM.yyyy')}
                          </span>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="xs"
                              variant="ghost"
                              modifier="square"
                              color="error"
                              aria-label="Delete purchase"
                              title="Delete purchase"
                              onClick={() => handleShopPurchaseDelete(purchase.id)}
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        </ListRow>
                      ))}
                    </List>
                  </>
                ) : (
                  <p className="text-center text-sm text-base-content/70">No purchases</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
