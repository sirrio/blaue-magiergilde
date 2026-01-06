import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import { Auction, AuctionBid, AuctionHiddenBid, AuctionItem, AuctionVoiceCandidate, Item, VoiceSettings } from '@/types'
import { Head, Link, router, useForm } from '@inertiajs/react'
import { format } from 'date-fns'
import { Copy, EyeOff, FlaskRound, History, Plus, ScrollText, Sword, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const rarityLabels: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
}

const statusLabels: Record<string, string> = {
  open: 'Offen',
  closed: 'Beendet',
  draft: 'Entwurf',
}

const rarityColors: Record<string, string> = {
  common: 'text-gray-700',
  uncommon: 'text-green-700',
  rare: 'text-blue-700',
  very_rare: 'text-purple-700',
}

const typeIcons: Record<string, JSX.Element> = {
  item: <Sword size={14} />,
  spellscroll: <ScrollText size={14} />,
  consumable: <FlaskRound size={14} />,
}

const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare'] as const
const typeOrder: Record<Item['type'], number> = {
  item: 0,
  consumable: 1,
  spellscroll: 2,
}
const isLocalDev = import.meta.env.DEV
const mockVoiceCandidates: AuctionVoiceCandidate[] = [
  { id: '111111111111111111', name: 'Ari', avatar: '/images/no-avatar.svg' },
  { id: '222222222222222222', name: 'Borin', avatar: '/images/icon_magiergilde.svg' },
  { id: '333333333333333333', name: 'Cora', avatar: null },
  { id: '444444444444444444', name: 'Dain', avatar: '/images/icon_magiergilde_white.svg' },
]

const getRarityTextColor = (rarity: string): string => {
  return rarityColors[rarity] || ''
}

const renderIcon = (type: string): JSX.Element | null => {
  return typeIcons[type] || null
}

const getBidStep = (item: Item): number => {
  let baseStep = 10

  if (item.rarity === 'uncommon') baseStep = 50
  if (item.rarity === 'rare') baseStep = 100
  if (item.rarity === 'very_rare') baseStep = 500

  if (item.type === 'consumable' || item.type === 'spellscroll') {
    baseStep = Math.floor(baseStep / 2)
  }

  return Math.max(1, baseStep)
}

const formatAuctionCreatedAt = (createdAt: string) => format(new Date(createdAt), "iiii dd MMM'.' yyyy ' - ' HH:mm")

const getCsrfToken = () => {
  if (typeof document === 'undefined') return ''
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
  return meta?.content ?? ''
}

const parseCostValue = (cost?: string | null) => {
  if (!cost) return null
  const digits = cost.replace(/[^0-9]/g, '')
  if (!digits) return null
  return Number(digits)
}

const getItemCostValue = (itemId: number, items: Item[]) => {
  const item = items.find((candidate) => candidate.id === itemId)
  return parseCostValue(item?.cost)
}

const getDefaultRepairCurrent = (itemId: number, items: Item[]) => {
  const costValue = getItemCostValue(itemId, items)
  if (costValue == null) {
    return 0
  }
  return Math.floor(costValue / 10)
}

const buildDiscordText = (auction: Auction) => {
  const lines: string[] = []

  rarityOrder.forEach((rarity) => {
    const groupItems = auction.auction_items
      .filter((auctionItem) => auctionItem.item.rarity === rarity)
      .sort((a, b) => {
        const typeCompare = typeOrder[a.item.type] - typeOrder[b.item.type]
        if (typeCompare !== 0) return typeCompare
        return a.item.name.localeCompare(b.item.name)
      })
    if (groupItems.length === 0) return

    lines.push(`## ${rarityLabels[rarity]}`)
    groupItems.forEach((auctionItem) => {
      const lineLabel = getDiscordItemLabel(auctionItem)
      lines.push(
        `**(${auctionItem.remaining_auctions})** - ${auctionItem.starting_bid} ${auction.currency} - ${lineLabel}`,
      )
    })
    lines.push('')
  })

  return lines.join('\n').trim()
}

const getRepairMissing = (auctionItem: AuctionItem) => {
  if (auctionItem.repair_max == null || auctionItem.repair_current == null) return 0
  return Math.max(0, auctionItem.repair_max - auctionItem.repair_current)
}

const getRepairLabel = (auctionItem: AuctionItem) => {
  if (auctionItem.repair_max == null || auctionItem.repair_current == null) return '-'
  return `${auctionItem.repair_current}/${auctionItem.repair_max}`
}

const getAuctionItemLabel = (name: string, auctionItem: AuctionItem) => {
  const parts: string[] = [name]
  const notes = auctionItem.notes?.trim()
  if (notes) {
    parts.push(`(${notes})`)
  }
  parts.push(`(${rarityLabels[auctionItem.item.rarity]})`)
  parts.push(`(${getRepairMissing(auctionItem)})`)
  return parts.join(' ')
}

const getDiscordItemLabel = (auctionItem: AuctionItem) => {
  const notes = auctionItem.notes?.trim()
  const displayName = notes ? `${auctionItem.item.name} - ${notes}` : auctionItem.item.name
  const itemLabel = auctionItem.item.url
    ? `[${displayName}](${auctionItem.item.url})`
    : displayName
  return `${itemLabel} (${getRepairMissing(auctionItem)})`
}

const getHighestBid = (auctionItem: AuctionItem) => {
  if (!auctionItem.bids || auctionItem.bids.length === 0) return null
  return auctionItem.bids.reduce((best, bid) => {
    if (!best) return bid
    if (bid.amount > best.amount) return bid
    if (bid.amount === best.amount && new Date(bid.created_at).getTime() > new Date(best.created_at).getTime()) {
      return bid
    }
    return best
  }, null as AuctionBid | null)
}

const getHiddenBidForCandidate = (auctionItem: AuctionItem, bidderId: string) => {
  if (!auctionItem.hidden_bids || auctionItem.hidden_bids.length === 0) return null
  return auctionItem.hidden_bids.find((hiddenBid) => hiddenBid.bidder_discord_id === bidderId) ?? null
}

const AvatarCircle = ({
  name,
  avatar,
  sizeClass = 'h-8 w-8',
  title,
}: {
  name: string
  avatar?: string | null
  sizeClass?: string
  title?: string
}) => {
  const getInitials = useInitials()
  const label = name?.trim() || 'User'

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full border border-base-100 bg-base-200 p-1 text-[10px] font-semibold',
        sizeClass,
      )}
      title={title ?? label}
    >
      {avatar ? (
        <img src={avatar} alt={label} className="h-full w-full rounded-full object-cover" />
      ) : (
        getInitials(label)
      )}
    </div>
  )
}

const AuctionItemBidControls = ({
  auctionItem,
  currency,
  candidates,
  highestBidderId,
}: {
  auctionItem: AuctionItem
  currency: string
  candidates: AuctionVoiceCandidate[]
  highestBidderId?: string | null
}) => {
  const step = getBidStep(auctionItem.item)
  const highestBid = getHighestBid(auctionItem)
  const minBid = highestBid ? Math.max(auctionItem.starting_bid, highestBid.amount + step) : auctionItem.starting_bid
  const isAmountValid = (minBid - auctionItem.starting_bid) % step === 0

  const handleBid = (candidateId: string, candidateName: string) => {
    if (!isAmountValid) {
      toast.show(`Min ${minBid} ${currency} in Schritten von ${step}.`, 'error')
      return
    }

    const hiddenBid = getHiddenBidForCandidate(auctionItem, candidateId)
    if (hiddenBid && minBid > hiddenBid.max_amount) {
      toast.show(`Max Gebot fuer ${candidateName} ist ${hiddenBid.max_amount} ${currency}.`, 'error')
      return
    }

    router.post(
      route('auction-items.bids.store', { auctionItem: auctionItem.id }),
      { bidder_discord_id: candidateId, bidder_name: candidateName, amount: minBid },
      {
        preserveScroll: true,
        onSuccess: () => {
          router.reload({ preserveScroll: true, preserveState: true })
        },
        onError: (errors) => {
          const message = errors.amount || errors.bidder_discord_id
          if (message) {
            toast.show(String(message), 'error')
          }
        },
      },
    )
  }

  return (
    <div className="flex w-full flex-col items-start gap-2">
      {candidates.length === 0 ? (
        <p className="text-xs text-base-content/70">Keine Live Nutzer.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {candidates.map((candidate) => {
            const isLeader = candidate.id === highestBidderId
            const hiddenBid = getHiddenBidForCandidate(auctionItem, candidate.id)
            const isOverMax = hiddenBid ? minBid > hiddenBid.max_amount : false
            const hasHiddenRoom = !!hiddenBid && !isOverMax && !isLeader
            const disableReason = hiddenBid
              ? `Max ${hiddenBid.max_amount} ${currency}`
              : ''
            return (
              <Button
                key={candidate.id}
                size="xs"
                variant="outline"
                disabled={!isAmountValid}
                onClick={() => handleBid(candidate.id, candidate.name)}
                title={isOverMax ? disableReason : undefined}
                className={cn(
                  'gap-2',
                  isLeader && 'border-success text-success',
                  hasHiddenRoom && 'border-warning text-warning',
                  isOverMax && 'opacity-60',
                )}
              >
                <AvatarCircle name={candidate.name} avatar={candidate.avatar} sizeClass="h-5 w-5" />
                <span>{candidate.name}</span>
                {isLeader ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] uppercase">Lead</span> : null}
              </Button>
            )
          })}
        </div>
      )}
      <p className="text-[11px] text-base-content/50">
        Naechstes Gebot: {minBid} {currency} - Schritt {step}
      </p>
    </div>
  )
}

const BidHistoryModal = ({ auctionItem, currency }: { auctionItem: AuctionItem; currency: string }) => {
  const [isOpen, setIsOpen] = useState(false)
  const hiddenBids = useMemo(
    () =>
      [...(auctionItem.hidden_bids ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [auctionItem.hidden_bids],
  )
  const bids = useMemo(
    () =>
      [...(auctionItem.bids ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [auctionItem.bids],
  )

  const handleDelete = (bidId: number) => {
    if (!window.confirm('Gebot wirklich loeschen?')) return

    router.delete(route('auction-bids.destroy', { auctionBid: bidId }), {
      preserveScroll: true,
      preserveState: true,
      onError: () => {
        toast.show('Gebot konnte nicht geloescht werden.', 'error')
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)}>
          <History size={16} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Bietverlauf</ModalTitle>
      <ModalContent>
        <p className="mb-2 text-xs text-base-content/60">{auctionItem.item.name}</p>
        {hiddenBids.length > 0 ? (
          <div className="mb-3">
            <p className="mb-1 text-[10px] font-semibold uppercase text-base-content/50">Geheime Gebote</p>
            <div className="space-y-2">
              {hiddenBids.map((hiddenBid) => (
                <div
                  key={hiddenBid.id}
                  className="flex items-center justify-between gap-3 rounded-box bg-base-200/60 px-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono">
                      Max {hiddenBid.max_amount} {currency}
                    </p>
                    <p className="truncate text-xs">{hiddenBid.bidder_name}</p>
                    <p className="text-[10px] text-base-content/60">ID: {hiddenBid.bidder_discord_id}</p>
                  </div>
                  <div className="text-[10px] text-base-content/50">
                    {format(new Date(hiddenBid.created_at), "dd.MM.yyyy ' - ' HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <p className="mb-1 text-[10px] font-semibold uppercase text-base-content/50">Gebote</p>
        {bids.length === 0 ? (
          <p className="text-xs text-base-content/70">Keine Gebote vorhanden.</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {bids.map((bid) => {
              const bidderLabel = bid.bidder_name
              return (
                <div key={bid.id} className="flex items-center justify-between gap-3 rounded-box bg-base-200/60 px-2 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono">
                      {bid.amount} {currency}
                    </p>
                    <p className="truncate text-xs">{bidderLabel}</p>
                    <p className="text-[10px] text-base-content/60">ID: {bid.bidder_discord_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-base-content/50">
                      {format(new Date(bid.created_at), "dd.MM.yyyy ' - ' HH:mm")}
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      modifier="square"
                      color="error"
                      onClick={() => handleDelete(bid.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ModalContent>
    </Modal>
  )
}

const HiddenBidModal = ({
  auctionItem,
  currency,
  candidates,
}: {
  auctionItem: AuctionItem
  currency: string
  candidates: AuctionVoiceCandidate[]
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const defaultMaxAmount = Math.max(auctionItem.starting_bid, 1)
  const { data, setData, post, reset } = useForm({
    bidder_discord_id: '',
    bidder_name: '',
    max_amount: defaultMaxAmount,
  })
  const hiddenBids = useMemo<AuctionHiddenBid[]>(
    () =>
      [...(auctionItem.hidden_bids ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [auctionItem.hidden_bids],
  )
  const selectedCandidateId = candidates.some((candidate) => candidate.id === data.bidder_discord_id)
    ? data.bidder_discord_id
    : ''

  useEffect(() => {
    if (!isOpen) return
    setData('max_amount', defaultMaxAmount)
  }, [isOpen, defaultMaxAmount, setData])

  const handleCandidateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const candidateId = event.target.value
    if (!candidateId) return
    const candidate = candidates.find((entry) => entry.id === candidateId)
    if (!candidate) return

    const existingHiddenBid = hiddenBids.find((entry) => entry.bidder_discord_id === candidate.id)
    setData('bidder_discord_id', candidate.id)
    setData('bidder_name', candidate.name)
    setData('max_amount', existingHiddenBid?.max_amount ?? defaultMaxAmount)
  }

  const handleSubmit = () => {
    if (!data.bidder_discord_id || !data.bidder_name) {
      toast.show('Discord ID und Name angeben.', 'error')
      return
    }

    post(route('auction-items.hidden-bids.store', { auctionItem: auctionItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        reset('bidder_discord_id', 'bidder_name')
        setData('max_amount', defaultMaxAmount)
        router.reload({ preserveScroll: true, preserveState: true })
      },
      onError: (errors) => {
        const message = errors.max_amount || errors.bidder_discord_id || errors.bidder_name
        if (message) {
          toast.show(String(message), 'error')
        }
      },
    })
  }

  const handleDelete = (hiddenBidId: number) => {
    if (!window.confirm('Geheimes Gebot wirklich loeschen?')) return

    router.delete(route('auction-hidden-bids.destroy', { auctionHiddenBid: hiddenBidId }), {
      preserveScroll: true,
      preserveState: true,
      onError: () => {
        toast.show('Geheimes Gebot konnte nicht geloescht werden.', 'error')
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)}>
          <EyeOff size={16} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Geheime Gebote</ModalTitle>
      <ModalContent>
        <p className="mb-3 text-xs text-base-content/60">Maximalgebote vor der Auktion, pro Spieler eines.</p>
        {candidates.length > 0 ? (
          <Select value={selectedCandidateId} onChange={handleCandidateChange}>
            <SelectLabel>Live Kandidat auswaehlen</SelectLabel>
            <SelectOptions>
              <option value="">Manuell</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </SelectOptions>
          </Select>
        ) : null}
        <Input value={data.bidder_discord_id} onChange={(e) => setData('bidder_discord_id', e.target.value)}>
          Discord ID
        </Input>
        <Input value={data.bidder_name} onChange={(e) => setData('bidder_name', e.target.value)}>
          Name
        </Input>
        <Input
          type="number"
          min={1}
          value={data.max_amount}
          onChange={(e) => setData('max_amount', Number(e.target.value))}
        >
          Max Gebot ({currency})
        </Input>

        <div className="mt-4">
          <p className="mb-1 text-[10px] font-semibold uppercase text-base-content/50">Aktive geheime Gebote</p>
          {hiddenBids.length === 0 ? (
            <p className="text-xs text-base-content/70">Keine geheimen Gebote vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {hiddenBids.map((hiddenBid) => (
                <div
                  key={hiddenBid.id}
                  className="flex items-center justify-between gap-3 rounded-box bg-base-200/60 px-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono">
                      Max {hiddenBid.max_amount} {currency}
                    </p>
                    <p className="truncate text-xs">{hiddenBid.bidder_name}</p>
                    <p className="text-[10px] text-base-content/60">ID: {hiddenBid.bidder_discord_id}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    modifier="square"
                    color="error"
                    onClick={() => handleDelete(hiddenBid.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Speichern</ModalAction>
    </Modal>
  )
}

const AuctionItemRow = ({
  auctionItem,
  currency,
  candidates,
}: {
  auctionItem: AuctionItem
  currency: string
  candidates: AuctionVoiceCandidate[]
}) => {
  const textColor = getRarityTextColor(auctionItem.item.rarity)
  const highestBid = getHighestBid(auctionItem)
  const bidCandidates = useMemo(() => {
    const merged = new Map<string, AuctionVoiceCandidate>()

    candidates.forEach((candidate) => {
      merged.set(candidate.id, candidate)
    })

    ;(auctionItem.hidden_bids ?? []).forEach((hiddenBid) => {
      if (merged.has(hiddenBid.bidder_discord_id)) return
      merged.set(hiddenBid.bidder_discord_id, {
        id: hiddenBid.bidder_discord_id,
        name: hiddenBid.bidder_name,
        avatar: null,
      })
    })

    return Array.from(merged.values())
  }, [auctionItem.hidden_bids, candidates])
  const highestBidder = highestBid
    ? bidCandidates.find((candidate) => candidate.id === highestBid.bidder_discord_id)
    : null
  const highestBidderName = highestBid?.bidder_name ?? ''

  return (
    <ListRow className="grid-cols-1">
      <div className="col-span-full flex w-full flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className={cn(textColor, 'flex h-4 w-4 shrink-0 items-center justify-center')}>
              {renderIcon(auctionItem.item.type)}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className={cn(textColor, 'text-sm font-semibold leading-none')}>
                {getAuctionItemLabel(auctionItem.item.name, auctionItem)}
              </span>
              <span className="text-xs font-normal leading-none text-base-content/70">
                Versteigerungen: {auctionItem.remaining_auctions} - Repair {getRepairLabel(auctionItem)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <HiddenBidModal auctionItem={auctionItem} currency={currency} candidates={candidates} />
            <BidHistoryModal auctionItem={auctionItem} currency={currency} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base-content/60">Hoechstgebot:</span>
            {highestBid ? (
              <div className="flex items-center gap-2">
                <AvatarCircle
                  name={highestBidderName ?? 'User'}
                  avatar={highestBidder?.avatar}
                  sizeClass="h-5 w-5"
                />
                <span className="font-mono">
                  {highestBid.amount} {currency}
                </span>
                <span className="max-w-[140px] truncate">
                  {highestBidderName}
                </span>
              </div>
            ) : (
              <span className="text-base-content/70">Keine Gebote</span>
            )}
          </div>
          <div className="w-full">
            <AuctionItemBidControls
              auctionItem={auctionItem}
              currency={currency}
              candidates={bidCandidates}
              highestBidderId={highestBid?.bidder_discord_id}
            />
          </div>
        </div>
      </div>
    </ListRow>
  )
}

const AddAuctionItemModal = ({ auction, items }: { auction: Auction; items: Item[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const initialItemId = items[0]?.id ?? 0
  const hasItems = items.length > 0
  const defaultRepairCurrent = getDefaultRepairCurrent(initialItemId, items)
  const { data, setData, post } = useForm({
    item_id: initialItemId,
    notes: '',
    remaining_auctions: 3,
    repair_current: defaultRepairCurrent,
  })
  const repairMax = getItemCostValue(data.item_id, items)
  const repairDefaultCurrent = repairMax ? Math.floor(repairMax / 10) : 0
  const repairLabel = repairMax
    ? `Repariert: ${repairDefaultCurrent}/${repairMax} ${auction.currency}`
    : `Repariert (${auction.currency})`

  useEffect(() => {
    if (!isOpen) return
    const repairCurrent = getDefaultRepairCurrent(data.item_id, items)
    setData('repair_current', repairCurrent)
    setData('notes', '')
    setData('remaining_auctions', 3)
  }, [isOpen])

  const handleSubmit = () => {
    if (!hasItems) return
    post(route('auction-items.store', { auction: auction.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload({ preserveScroll: true, preserveState: true })
      },
      onError: (errors) => {
        const message = errors.notes || errors.repair_current || errors.remaining_auctions || errors.item_id
        if (message) {
          toast.show(String(message), 'error')
        }
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} disabled={!hasItems}>
          <Plus size={16} />
          Item hinzufuegen
        </Button>
      </ModalTrigger>
      <ModalTitle>Item zur Auktion hinzufuegen</ModalTitle>
      <ModalContent>
        <Select
          value={data.item_id}
          onChange={(e) => {
            const nextId = Number(e.target.value)
            const repairCurrent = getDefaultRepairCurrent(nextId, items)
            setData('item_id', nextId)
            setData('repair_current', repairCurrent)
            setData('notes', '')
          }}
        >
          <SelectLabel>Item</SelectLabel>
          <SelectOptions>
            {hasItems ? (
              items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({rarityLabels[item.rarity]})
                </option>
              ))
            ) : (
              <option value={0}>Keine Items vorhanden</option>
            )}
          </SelectOptions>
        </Select>
        <Input
          value={data.notes}
          onChange={(e) => setData('notes', e.target.value)}
        >
          Notizen
        </Input>
        <Input
          type="number"
          min={1}
          value={data.remaining_auctions}
          onChange={(e) => setData('remaining_auctions', Number(e.target.value))}
        >
          Versteigerungen uebrig
        </Input>
        <Input
          type="number"
          min={0}
          max={repairMax ?? undefined}
          value={data.repair_current}
          onChange={(e) => setData('repair_current', Number(e.target.value))}
        >
          {repairLabel}
        </Input>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Speichern</ModalAction>
    </Modal>
  )
}

export default function Index({
  auctions,
  items,
  voiceSettings: initialVoiceSettings,
}: {
  auctions: Auction[]
  items: Item[]
  voiceSettings: VoiceSettings
}) {
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(auctions[0] ?? null)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(initialVoiceSettings)
  const [voiceCandidates, setVoiceCandidates] = useState<AuctionVoiceCandidate[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [manualCooldownRemaining, setManualCooldownRemaining] = useState(0)
  const cooldownIntervalRef = useRef<number | null>(null)
  const isSyncingRef = useRef(false)
  const voiceChannelIdRef = useRef<string | null>(initialVoiceSettings?.voice_channel_id ?? null)

  useEffect(() => {
    setSelectedAuction((prev) => {
      if (prev) {
        return auctions.find((a) => a.id === prev.id) || null
      }
      return auctions[0] ?? null
    })
  }, [auctions, selectedAuction?.id])

  useEffect(() => {
    const nextChannelId = initialVoiceSettings?.voice_channel_id ?? null
    const prevChannelId = voiceChannelIdRef.current

    setVoiceSettings(initialVoiceSettings)

    if (nextChannelId !== prevChannelId) {
      setVoiceCandidates([])
      voiceChannelIdRef.current = nextChannelId
    }
  }, [initialVoiceSettings])

  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current !== null) {
        window.clearInterval(cooldownIntervalRef.current)
      }
    }
  }, [])

  const onAuctionSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const auctionId = Number(event.target.value)
    const newAuction = auctions.find((auction) => auction.id === auctionId) || null
    setSelectedAuction(newAuction)
  }

  const handleCopyAuction = () => {
    if (!selectedAuction) return
    navigator.clipboard.writeText(buildDiscordText(selectedAuction)).then(() => {
      toast.show('Auktion kopiert', 'info')
    })
  }

  const handleCloseAuction = () => {
    if (!selectedAuction || selectedAuction.status === 'closed') return
    const confirmed = window.confirm(
      'Auktion wirklich schliessen? Offene Items ohne Gebot werden in eine neue Auktion uebernommen.',
    )
    if (!confirmed) return

    router.put(
      route('auctions.update', { auction: selectedAuction.id }),
      { status: 'closed' },
      {
        preserveScroll: true,
        preserveState: false,
      },
    )
  }

  const syncVoiceCandidates = useCallback(async (showToast: boolean) => {
    if (!voiceSettings.voice_channel_id || isSyncingRef.current) return

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      if (showToast) toast.show('CSRF Token fehlt.', 'error')
      return
    }

    isSyncingRef.current = true
    setIsSyncing(true)
    try {
      const response = await fetch(route('voice-settings.sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })

      const payload = await response.json()
      if (!response.ok) {
        if (showToast) toast.show(String(payload?.error ?? 'Fehler beim Sync.'), 'error')
        return
      }

      const candidates = Array.isArray(payload?.voice_candidates) ? payload.voice_candidates : []
      setVoiceCandidates(candidates)

      if (showToast) {
        toast.show('Voice Kandidaten aktualisiert', 'info')
      }
    } catch (error) {
      if (showToast) toast.show('Fehler beim Sync.', 'error')
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }, [voiceSettings.voice_channel_id])

  const handleRefreshCandidates = () => {
    if (manualCooldownRemaining > 0) return

    setManualCooldownRemaining(5)
    if (cooldownIntervalRef.current !== null) {
      window.clearInterval(cooldownIntervalRef.current)
    }
    cooldownIntervalRef.current = window.setInterval(() => {
      setManualCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current !== null) {
            window.clearInterval(cooldownIntervalRef.current)
            cooldownIntervalRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    void syncVoiceCandidates(true)
  }

  const groupedItems = useMemo(() => {
    if (!selectedAuction) return []
    return rarityOrder
      .map((rarity) => ({
        rarity,
        items: selectedAuction.auction_items
          .filter((auctionItem) => auctionItem.item.rarity === rarity)
          .sort((a, b) => {
            const typeCompare = typeOrder[a.item.type] - typeOrder[b.item.type]
            if (typeCompare !== 0) return typeCompare
            return a.item.name.localeCompare(b.item.name)
          }),
      }))
      .filter((group) => group.items.length > 0)
  }, [selectedAuction])

  const useMockCandidates = isLocalDev && voiceCandidates.length === 0
  const candidates = useMemo<AuctionVoiceCandidate[]>(
    () => (useMockCandidates ? mockVoiceCandidates : voiceCandidates),
    [useMockCandidates, voiceCandidates],
  )

  const manualCooldownLabel = manualCooldownRemaining > 0 ? `Aktualisieren (${manualCooldownRemaining}s)` : 'Aktualisieren'

  useEffect(() => {
    if (!voiceSettings.voice_channel_id) return

    void syncVoiceCandidates(false)

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void syncVoiceCandidates(false)
    }, 15000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncVoiceCandidates(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [syncVoiceCandidates, voiceSettings.voice_channel_id])

  return (
    <AppLayout>
      <Head title="Auktionen" />
      <div className="container mx-auto max-w-3xl px-2 py-4 md:px-0">
        <div className="join mb-4 flex items-end">
          <Select className="join-item w-full" value={selectedAuction?.id || ''} onChange={onAuctionSelectChange}>
            <SelectLabel>Auktionen</SelectLabel>
            <SelectOptions>
              {auctions.map((auction) => (
                <option key={auction.id} value={auction.id}>
                  {`${auction.title ?? `Auktion #${String(auction.id).padStart(3, '0')}`} - ${formatAuctionCreatedAt(auction.created_at)}`}
                </option>
              ))}
            </SelectOptions>
          </Select>
        </div>

        {selectedAuction ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyAuction}>
                <Copy size={16} />
                Discord kopieren
              </Button>
              <Button
                size="sm"
                color="warning"
                variant="outline"
                onClick={handleCloseAuction}
                disabled={selectedAuction.status === 'closed'}
              >
                Auktion schliessen
              </Button>
              <AddAuctionItemModal auction={selectedAuction} items={items} />
              <span className="text-xs text-base-content/60">Status: {statusLabels[selectedAuction.status]}</span>
            </div>
            <p className="mb-4 text-[11px] text-base-content/60">
              Schritte: 10 / 50 / 100 / 500 - Consumables/Spellscrolls halbiert
            </p>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              {voiceSettings.voice_channel_id || useMockCandidates ? (
                <>
                  {candidates.length === 0 ? (
                    <p className="text-xs text-base-content/70">Keine Nutzer online.</p>
                  ) : (
                    <div className="flex -space-x-2">
                      {candidates.map((candidate) => (
                        <AvatarCircle
                          key={candidate.id}
                          name={candidate.name}
                          avatar={candidate.avatar}
                          sizeClass="h-8 w-8"
                        />
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshCandidates}
                    disabled={!voiceSettings.voice_channel_id || isSyncing || manualCooldownRemaining > 0}
                  >
                    {manualCooldownLabel}
                  </Button>
                  {useMockCandidates ? (
                    <span className="text-[10px] uppercase text-base-content/50">Mock</span>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-base-content/70">
                  Keine Channel ID gesetzt. Bitte in den Administration Settings konfigurieren.
                  <span className="ml-1">
                    <Link href={route('admin.settings')} className="link">
                      Zu den Settings
                    </Link>
                  </span>
                </p>
              )}
            </div>

            {groupedItems.length === 0 ? (
              <div className="text-sm opacity-70">Noch keine Items in dieser Auktion.</div>
            ) : (
              <List>
                {groupedItems.map((group) => (
                  <React.Fragment key={group.rarity}>
                    <li className="px-4 py-2 text-xs font-semibold uppercase text-base-content/70">
                      {rarityLabels[group.rarity]}
                    </li>
                    {group.items.map((auctionItem) => (
                      <AuctionItemRow
                        key={auctionItem.id}
                        auctionItem={auctionItem}
                        currency={selectedAuction.currency}
                        candidates={candidates}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </List>
            )}
          </>
        ) : (
          <div className="text-sm opacity-70">Keine Auktionen vorhanden.</div>
        )}
      </div>
    </AppLayout>
  )
}
