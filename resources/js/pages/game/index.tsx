import LogoBt from '@/components/logo-bt'
import LogoEt from '@/components/logo-et'
import LogoHt from '@/components/logo-ht'
import LogoLt from '@/components/logo-lt'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import { calculateBubbleByFillerCharacters, calculateBubbleByGames } from '@/helper/calculateBubble'
import { calculateBubbleSpend } from '@/helper/calculateBubbleSpend'
import { calculateCoins } from '@/helper/calculateCoins'
import { calculateCoinsSpend } from '@/helper/calculateCoinsSpend'
import AppLayout from '@/layouts/app-layout'
import DestroyGameModal, { DestroyGameButton } from '@/pages/game/destroy-game-modal'
import StoreGameModal from '@/pages/game/store-game-modal'
import UpdateGameModal from '@/pages/game/update-game-modal'
import type { Character, Game, User } from '@/types'
import { Head, useForm, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { AlertCircle, ChevronDown, ChevronUp, Coins, Droplets, LoaderCircle, PartyPopper, Pencil, Plus, Swords } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'

interface Props {
  games: Game[]
  user: User
  characters: Character[]
}

interface BreakdownForm {
  event_bubbles: number
  event_coins: number
  bt_bubbles: number
  bt_coins: number
  lt_bubbles: number
  lt_coins: number
  ht_bubbles: number
  ht_coins: number
  et_bubbles: number
  et_coins: number
  other_bubbles: number
  other_coins: number
  [key: string]: number
}

type BreakdownModalKey =
  | 'games_bubbles'
  | 'games_coins'
  | 'filler_bubbles'
  | 'filler_coins'
  | 'event_bubbles'
  | 'event_coins'
  | 'other_bubbles'
  | 'other_coins'
  | 'bt_bubbles'
  | 'bt_coins'
  | 'lt_bubbles'
  | 'lt_coins'
  | 'ht_bubbles'
  | 'ht_coins'
  | 'et_bubbles'
  | 'et_coins'

type BreakdownModalConfig = {
  title: string
  description: string
  editable: boolean
  inputLabel?: string
  value?: number
  onChange?: (value: number) => void
  fromGames?: number
}

export default function MasteredGames({ games, user, characters }: Props) {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | 'bt' | 'lt' | 'ht' | 'et'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(() => new Set())
  const [breakdownModalKey, setBreakdownModalKey] = useState<BreakdownModalKey | null>(null)
  const [isSortPending, startSortTransition] = useTransition()
  const { errors } = usePage().props as { errors: Record<string, string> }
  const { data: breakdownData, setData: setBreakdownData, put: putBreakdown, processing: breakdownProcessing } =
    useForm<BreakdownForm>({
      event_bubbles: Number(user.event_bubbles ?? 0),
      event_coins: Number(user.event_coins ?? 0),
      bt_bubbles: Number(user.bt_bubbles ?? 0),
      bt_coins: Number(user.bt_coins ?? 0),
      lt_bubbles: Number(user.lt_bubbles ?? 0),
      lt_coins: Number(user.lt_coins ?? 0),
      ht_bubbles: Number(user.ht_bubbles ?? 0),
      ht_coins: Number(user.ht_coins ?? 0),
      et_bubbles: Number(user.et_bubbles ?? 0),
      et_coins: Number(user.et_coins ?? 0),
      other_bubbles: Number(user.other_bubbles ?? 0),
      other_coins: Number(user.other_coins ?? 0),
    })


  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = games.filter((game) => {
      if (tierFilter !== 'all' && game.tier !== tierFilter) {
        return false
      }
      if (!query) return true
      return [game.title, game.notes].filter(Boolean).join(' ').toLowerCase().includes(query)
    })
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.start_date).getTime()
      const bTime = new Date(b.start_date).getTime()
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime
    })
    return sorted
  }, [games, search, tierFilter, sortOrder])

  const headerColumns = 'grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_80px_80px_110px_56px] items-center gap-4'
  const hasFilters = search.trim() !== '' || tierFilter !== 'all'
  const activeFilters = [
    search.trim() ? `Search: ${search.trim()}` : null,
    tierFilter !== 'all' ? `Tier: ${tierFilter.toUpperCase()}` : null,
  ].filter(Boolean) as string[]
  const tierFilterOptions = [
    { label: 'BT', value: 'bt' as const },
    { label: 'LT', value: 'lt' as const },
    { label: 'HT', value: 'ht' as const },
    { label: 'ET', value: 'et' as const },
  ]

  const renderFilterOptions = <T extends string>(
    filterKey: string,
    options: { label: string; value: T }[],
    currentValue: T,
    onChange: (value: T) => void,
    includeAll = false,
  ) => (
    <div className="filter">
      {includeAll ? (
        <input
          className="btn btn-xs filter-reset"
          type="radio"
          name={filterKey}
          aria-label="All"
          checked={currentValue === 'all'}
          onChange={() => onChange('all' as T)}
        />
      ) : null}
      {options.map(({ label, value }) => (
        <input
          key={value}
          className="btn btn-xs"
          type="radio"
          name={filterKey}
          aria-label={label}
          checked={currentValue === value}
          onChange={() => onChange(value)}
        />
      ))}
    </div>
  )

  const toggleSortOrder = () => {
    startSortTransition(() => {
      setSortOrder((current) => (current === 'newest' ? 'oldest' : 'newest'))
    })
  }

  const handleBreakdownSubmit = (shouldClose = false) => {
    putBreakdown(route('breakdowns.update', { user: user.id }), {
      preserveState: 'errors',
      preserveScroll: true,
      onSuccess: () => {
        if (shouldClose) {
          setBreakdownModalKey(null)
        }
      },
    })
  }

  const toggleNotes = (id: number) => {
    setExpandedNotes((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const tierOfMonthFromGames = useMemo(() => {
    const totals = {
      bt: { bubbles: 0, coins: 0 },
      lt: { bubbles: 0, coins: 0 },
      ht: { bubbles: 0, coins: 0 },
      et: { bubbles: 0, coins: 0 },
    }
    games.forEach((game) => {
      if (!game.tier_of_month_reward) return
      if (game.tier_of_month_reward === 'bubble') {
        totals[game.tier].bubbles += 1
      } else if (game.tier_of_month_reward === 'coin') {
        totals[game.tier].coins += 1
      }
    })
    return totals
  }, [games])
  const tierOfMonthManual = useMemo(
    () => ({
      bt: { bubbles: Number(breakdownData.bt_bubbles ?? 0), coins: Number(breakdownData.bt_coins ?? 0) },
      lt: { bubbles: Number(breakdownData.lt_bubbles ?? 0), coins: Number(breakdownData.lt_coins ?? 0) },
      ht: { bubbles: Number(breakdownData.ht_bubbles ?? 0), coins: Number(breakdownData.ht_coins ?? 0) },
      et: { bubbles: Number(breakdownData.et_bubbles ?? 0), coins: Number(breakdownData.et_coins ?? 0) },
    }),
    [breakdownData],
  )
  const tierOfMonthTotals = useMemo(
    () => ({
      bt: {
        bubbles: tierOfMonthFromGames.bt.bubbles + tierOfMonthManual.bt.bubbles,
        coins: tierOfMonthFromGames.bt.coins + tierOfMonthManual.bt.coins,
      },
      lt: {
        bubbles: tierOfMonthFromGames.lt.bubbles + tierOfMonthManual.lt.bubbles,
        coins: tierOfMonthFromGames.lt.coins + tierOfMonthManual.lt.coins,
      },
      ht: {
        bubbles: tierOfMonthFromGames.ht.bubbles + tierOfMonthManual.ht.bubbles,
        coins: tierOfMonthFromGames.ht.coins + tierOfMonthManual.ht.coins,
      },
      et: {
        bubbles: tierOfMonthFromGames.et.bubbles + tierOfMonthManual.et.bubbles,
        coins: tierOfMonthFromGames.et.coins + tierOfMonthManual.et.coins,
      },
    }),
    [tierOfMonthFromGames, tierOfMonthManual],
  )
  const tierOfMonthGameBubbles =
    tierOfMonthFromGames.bt.bubbles +
    tierOfMonthFromGames.lt.bubbles +
    tierOfMonthFromGames.ht.bubbles +
    tierOfMonthFromGames.et.bubbles
  const tierOfMonthGameCoins =
    tierOfMonthFromGames.bt.coins +
    tierOfMonthFromGames.lt.coins +
    tierOfMonthFromGames.ht.coins +
    tierOfMonthFromGames.et.coins
  const totalBubbles =
    calculateBubbleByGames(games) +
    calculateBubbleByFillerCharacters(characters) +
    Number(breakdownData.event_bubbles ?? 0) +
    Number(breakdownData.bt_bubbles ?? 0) +
    Number(breakdownData.lt_bubbles ?? 0) +
    Number(breakdownData.ht_bubbles ?? 0) +
    Number(breakdownData.et_bubbles ?? 0) +
    Number(breakdownData.other_bubbles ?? 0) +
    tierOfMonthGameBubbles

  const totalCoins =
    calculateCoins(games) +
    Number(breakdownData.event_coins ?? 0) +
    Number(breakdownData.bt_coins ?? 0) +
    Number(breakdownData.lt_coins ?? 0) +
    Number(breakdownData.ht_coins ?? 0) +
    Number(breakdownData.et_coins ?? 0) +
    Number(breakdownData.other_coins ?? 0) +
    tierOfMonthGameCoins

  const spentBubbles = calculateBubbleSpend(characters)
  const spentCoins = calculateCoinsSpend(characters)
  const remainingBubbles = totalBubbles - spentBubbles
  const remainingCoins = totalCoins - spentCoins

  const openBreakdownModal = (key: BreakdownModalKey) => {
    setBreakdownModalKey(key)
  }

  const breakdownModalConfig = useMemo<Record<BreakdownModalKey, BreakdownModalConfig>>(() => {
    return {
      games_bubbles: {
        title: 'Games — Bubbles',
        description: 'Calculated from session duration (3h = 1 bubble) plus any “Additional Bubble”.',
        editable: false,
      },
      games_coins: {
        title: 'Games — Coins',
        description: 'Calculated from sessions. CharQuest reduces coins by 1. Moderated RP grants no coins.',
        editable: false,
      },
      filler_bubbles: {
        title: 'Filler Character — Bubbles',
        description: 'Calculated from filler character adventures.',
        editable: false,
      },
      filler_coins: {
        title: 'Filler Character — Coins',
        description: 'Filler characters do not grant coins.',
        editable: false,
      },
      event_bubbles: {
        title: 'Event Bonuses — Bubbles',
        description: 'Manual event rewards.',
        editable: true,
        inputLabel: 'Manual value',
        value: breakdownData.event_bubbles,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            event_bubbles: value,
          })),
      },
      event_coins: {
        title: 'Event Bonuses — Coins',
        description: 'Manual event rewards.',
        editable: true,
        inputLabel: 'Manual value',
        value: breakdownData.event_coins,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            event_coins: value,
          })),
      },
      other_bubbles: {
        title: 'Other Bonuses — Bubbles',
        description: 'Manual adjustments for special cases.',
        editable: true,
        inputLabel: 'Manual value',
        value: breakdownData.other_bubbles,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            other_bubbles: value,
          })),
      },
      other_coins: {
        title: 'Other Bonuses — Coins',
        description: 'Manual adjustments for special cases.',
        editable: true,
        inputLabel: 'Manual value',
        value: breakdownData.other_coins,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            other_coins: value,
          })),
      },
      bt_bubbles: {
        title: 'BT Tier of the Month — Bubbles',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.bt.bubbles,
        value: breakdownData.bt_bubbles,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            bt_bubbles: value,
          })),
      },
      bt_coins: {
        title: 'BT Tier of the Month — Coins',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.bt.coins,
        value: breakdownData.bt_coins,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            bt_coins: value,
          })),
      },
      lt_bubbles: {
        title: 'LT Tier of the Month — Bubbles',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.lt.bubbles,
        value: breakdownData.lt_bubbles,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            lt_bubbles: value,
          })),
      },
      lt_coins: {
        title: 'LT Tier of the Month — Coins',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.lt.coins,
        value: breakdownData.lt_coins,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            lt_coins: value,
          })),
      },
      ht_bubbles: {
        title: 'HT Tier of the Month — Bubbles',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.ht.bubbles,
        value: breakdownData.ht_bubbles,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            ht_bubbles: value,
          })),
      },
      ht_coins: {
        title: 'HT Tier of the Month — Coins',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.ht.coins,
        value: breakdownData.ht_coins,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            ht_coins: value,
          })),
      },
      et_bubbles: {
        title: 'ET Tier of the Month — Bubbles',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.et.bubbles,
        value: breakdownData.et_bubbles,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            et_bubbles: value,
          })),
      },
      et_coins: {
        title: 'ET Tier of the Month — Coins',
        description: 'Manual adjustments plus rewards chosen on games.',
        editable: true,
        inputLabel: 'Manual adjustment',
        fromGames: tierOfMonthFromGames.et.coins,
        value: breakdownData.et_coins,
        onChange: (value: number) =>
          setBreakdownData((prev) => ({
            ...prev,
            et_coins: value,
          })),
      },
    }
  }, [breakdownData, setBreakdownData, tierOfMonthFromGames])

  const breakdownModal = breakdownModalKey ? breakdownModalConfig[breakdownModalKey] : null

  return (
    <AppLayout>
      <Head title="Game Master Log" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Game Master Log
              <span className="ml-3 inline-flex items-center rounded-full border border-base-200 px-2 py-0.5 text-xs text-base-content/60">
                {games.length} Sessions
              </span>
            </h1>
            <p className="text-base-content/70 text-sm">Track your progress with a summary of all GM sessions.</p>
          </div>
          <StoreGameModal>
            <Button variant="outline" size="sm" className="flex items-center">
              <Plus size={18} />
              <span>Create New Game</span>
            </Button>
          </StoreGameModal>
        </section>

        <Card>
          <CardBody>
            <CardTitle>Progress Summary</CardTitle>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {[
                  {
                    title: 'Bubbles',
                    icon: <Droplets size={20} className="mr-2" />,
                    spent: spentBubbles,
                    total: totalBubbles,
                    remaining: remainingBubbles,
                    overspentMessage: 'Overspent bubbles! Please adjust.',
                  },
                  {
                    title: 'Coins',
                    icon: <Coins size={20} className="mr-2" />,
                    spent: spentCoins,
                    total: totalCoins,
                    remaining: remainingCoins,
                    overspentMessage: 'Overspent coins! Recheck balance.',
                  },
                ].map(({ title, icon, spent, total, remaining, overspentMessage }, index) => (
                  <div key={index}>
                    <div className="-mb-1 flex items-center text-lg font-semibold">
                      {icon}
                      <span>{title}</span>
                    </div>
                    <progress className={'progress w-full'} value={spent} max={total} />
                    <div className="text-base-content/70 -mt-0.5 flex justify-between text-xs">
                      <span>Remaining: {remaining}</span>
                      <span>
                        Spent: {spent} / {total}
                      </span>
                    </div>
                    {spent > total && (
                      <p className="text-error mt-2 flex items-center text-xs">
                        <AlertCircle size={16} className="mr-2" />
                        {overspentMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle className="flex items-center justify-between">
              Breakdown
            </CardTitle>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Swords size={16} className="mr-2" />
                      Games
                    </div>
                    <div className="flex items-center space-x-2 text-right text-xs">
                      <span className="w-16 inline-flex items-center justify-end gap-1 text-xs text-base-content/80">
                        {calculateBubbleByGames(games)} <Droplets size={14} />
                      </span>
                      <span className="w-16 inline-flex items-center justify-end gap-1 text-xs text-base-content/80">
                        {calculateCoins(games)} <Coins size={14} />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Plus size={14} className="mr-2" />
                      Filler Character
                    </div>
                    <div className="flex items-center space-x-2 text-right text-xs">
                      <span className="w-16 inline-flex items-center justify-end gap-1 text-xs text-base-content/80">
                        {calculateBubbleByFillerCharacters(characters)} <Droplets size={14} />
                      </span>
                      <span className="w-16 inline-flex items-center justify-end gap-1 text-xs text-base-content/60">
                        0 <Coins size={14} />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <PartyPopper size={16} className="mr-2" />
                      Event Bonuses
                    </div>
                    <div className="flex items-center space-x-2 text-right text-xs">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs w-14 justify-end gap-1 px-0.5 normal-case"
                        onClick={() => openBreakdownModal('event_bubbles')}
                      >
                        {Number(breakdownData.event_bubbles ?? 0)} <Droplets size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs w-14 justify-end gap-1 px-0.5 normal-case"
                        onClick={() => openBreakdownModal('event_coins')}
                      >
                        {Number(breakdownData.event_coins ?? 0)} <Coins size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">Other Bonuses</div>
                    <div className="flex items-center space-x-2 text-right text-xs">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs w-14 justify-end gap-1 px-0.5 normal-case"
                        onClick={() => openBreakdownModal('other_bubbles')}
                      >
                        {Number(breakdownData.other_bubbles ?? 0)} <Droplets size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs w-14 justify-end gap-1 px-0.5 normal-case"
                        onClick={() => openBreakdownModal('other_coins')}
                      >
                        {Number(breakdownData.other_coins ?? 0)} <Coins size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {(['bt', 'lt', 'ht', 'et'] as const).map((type) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        {type === 'bt' && <LogoBt width={16} />}
                        {type === 'lt' && <LogoLt width={16} />}
                        {type === 'ht' && <LogoHt width={16} />}
                        {type === 'et' && <LogoEt width={16} />}
                        <span className="ml-2">
                          {type === 'et' ? 'TotM/ Epic Bonuses' : 'TotM Bonus'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-right text-xs">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs w-14 justify-end gap-1 px-0.5 normal-case"
                          onClick={() => openBreakdownModal(`${type}_bubbles` as BreakdownModalKey)}
                        >
                          {tierOfMonthTotals[type].bubbles} <Droplets size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs w-14 justify-end gap-1 px-0.5 normal-case"
                          onClick={() => openBreakdownModal(`${type}_coins` as BreakdownModalKey)}
                        >
                          {tierOfMonthTotals[type].coins} <Coins size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CardBody>
        </Card>

        <Modal
          wide
          isOpen={Boolean(breakdownModal)}
          onClose={() => setBreakdownModalKey(null)}
        >
          <ModalTitle>{breakdownModal?.title}</ModalTitle>
          <ModalContent>
            <p className="text-xs text-base-content/60">{breakdownModal?.description}</p>
            {breakdownModal?.fromGames !== undefined ? (
              <p className="mt-2 text-xs text-base-content/50">
                From games: {breakdownModal.fromGames}
              </p>
            ) : null}
            {breakdownModal?.editable ? (
              <div className="mt-4">
                <Input
                  type="number"
                  min={0}
                  value={breakdownModal.value ?? 0}
                  onChange={(e) => breakdownModal.onChange?.(Math.max(0, Number(e.target.value)))}
                  errors={errors[breakdownModalKey ?? ''] as string | undefined}
                  className="text-xs [&_.label]:py-1 [&_.label]:min-h-0 [&_.input]:input-sm"
                >
                  {breakdownModal.inputLabel ?? 'Manual value'}
                </Input>
              </div>
            ) : (
              <p className="mt-3 text-xs text-base-content/50">
                Update this value by editing the related games or characters.
              </p>
            )}
          </ModalContent>
          {breakdownModal?.editable ? (
            <ModalAction onClick={() => handleBreakdownSubmit(true)} disabled={breakdownProcessing}>
              Save
            </ModalAction>
          ) : null}
        </Modal>

        <div>
          <div className="rounded-box border border-base-200 bg-base-100 p-4">
            <div className="space-y-3">
              <Input
                type="search"
                placeholder="Search by title or notes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              >
                Search
              </Input>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-base-content/60">Tier:</span>
                  {renderFilterOptions('tierFilter', tierFilterOptions, tierFilter, setTierFilter, true)}
                </div>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs text-base-content/60">
                  <span className="rounded-full border border-base-200 px-2 py-1">
                    Showing {filteredGames.length} of {games.length}
                  </span>
                  {activeFilters.length === 0 ? (
                    <span className="text-base-content/50">No filters</span>
                  ) : (
                    activeFilters.map((filter) => (
                      <span key={filter} className="rounded-full border border-base-200 px-2 py-1">
                        {filter}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          {filteredGames.length > 0 ? (
            <>
              <div className={`${headerColumns} mt-4 px-4 pb-2 text-xs font-semibold uppercase text-base-content/50`}>
                <span>Game</span>
                <span>Notes</span>
                <span className="text-right">Bubbles</span>
                <span className="text-right">Coins</span>
                <span className="text-right">
                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="inline-flex items-center justify-end gap-1 text-xs uppercase text-base-content/50 hover:text-base-content"
                  >
                    Date
                    {isSortPending ? <LoaderCircle size={12} className="animate-spin" /> : null}
                    {sortOrder === 'newest' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </button>
                </span>
                <span className="text-right">Actions</span>
              </div>
              <List>
              {filteredGames.map((game, index) => {
                const notes = game.notes ?? ''
                const isExpanded = expandedNotes.has(game.id)
                const showToggle = notes.length > 140
                const gameNumber = sortOrder === 'newest' ? filteredGames.length - index : index + 1
                const tierReward = game.tier_of_month_reward
                const gameBubbles =
                  calculateBubbleByGames([game]) + (tierReward === 'bubble' ? 1 : 0)
                const gameCoins =
                  calculateCoins([game]) + (tierReward === 'coin' ? 1 : 0)
                return (
                  <ListRow key={game.id} className={`${headerColumns} items-center`}>
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1 truncate text-sm font-medium">
                        <span>#{gameNumber}</span>
                        {game.tier === 'bt' && <LogoBt width={16} />}
                        {game.tier === 'lt' && <LogoLt width={16} />}
                        {game.tier === 'ht' && <LogoHt width={16} />}
                        {game.tier === 'et' && <LogoEt width={16} />}
                        <span className="truncate">{game.title ?? 'Game'}</span>
                      </h3>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className={`text-base-content/50 text-xs whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        {notes || 'No notes'}
                      </p>
                      {showToggle ? (
                        <button
                          type="button"
                          className="text-xs text-primary/70 hover:text-primary"
                          onClick={() => toggleNotes(game.id)}
                        >
                          {isExpanded ? 'Show less' : 'Show notes'}
                        </button>
                      ) : null}
                    </div>
                    <p className="text-right text-xs">
                      {gameBubbles} <Droplets size={13} className="inline" />
                    </p>
                    <p className="text-right text-xs">
                      {gameCoins} <Coins size={13} className="inline" />
                    </p>
                    <div className="text-right text-xs text-base-content/70">
                      {format(new Date(game.start_date), 'dd.MM.yyyy')}
                    </div>
                    <div className="flex justify-end gap-2">
                      <UpdateGameModal game={game}>
                        <Button size="xs" variant="ghost" modifier="square" aria-label="Edit game">
                          <Pencil size={14} />
                        </Button>
                      </UpdateGameModal>
                      <DestroyGameModal game={game}>
                        <DestroyGameButton />
                      </DestroyGameModal>
                    </div>
                  </ListRow>
                )
              })}
              </List>
            </>
          ) : (
            <p className="mt-4 text-center text-sm text-base-content/50">
              No games found{hasFilters ? ' for the current filters.' : '. Start by creating a new game!'}
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
