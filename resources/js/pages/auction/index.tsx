import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import { Auction, AuctionBid, AuctionHiddenBid, AuctionItem, AuctionSettings, AuctionVoiceCandidate, DiscordBackupChannel, Item, PageProps } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { CheckCircle2, EyeOff, FlaskRound, History, Mic, Pencil, Plus, RotateCcw, ScrollText, Send, Settings, Sword, Trash, XCircle } from 'lucide-react'
import React, { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const rarityLabels: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  draft: 'Draft',
}

const rarityColors: Record<string, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  very_rare: 'text-rarity-very-rare',
}

const typeIcons: Record<string, ReactElement> = {
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

const renderIcon = (type: string): ReactElement | null => {
  return typeIcons[type] || null
}

const getAuctionItemSnapshot = (auctionItem: AuctionItem): Item => {
  const item = auctionItem.item ?? ({} as Item)
  return {
    id: item.id ?? 0,
    name: auctionItem.item_name ?? item.name ?? 'Unknown item',
    url: auctionItem.item_url ?? item.url ?? '',
    cost: auctionItem.item_cost ?? item.cost ?? '',
    rarity: (auctionItem.item_rarity ?? item.rarity ?? 'common') as Item['rarity'],
    type: (auctionItem.item_type ?? item.type ?? 'item') as Item['type'],
    pick_count: item.pick_count ?? 0,
  }
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

const getStartingBid = (auctionItem: AuctionItem): number => {
  const item = getAuctionItemSnapshot(auctionItem)
  const step = getBidStep(item)
  const repairCurrent = auctionItem.repair_current ?? 0
  const halfRepair = Math.ceil(repairCurrent / 2)
  return Math.ceil(halfRepair / step) * step
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

const getRepairMissing = (auctionItem: AuctionItem) => {
  if (auctionItem.repair_max == null || auctionItem.repair_current == null) return 0
  return Math.max(0, auctionItem.repair_max - auctionItem.repair_current)
}

const getRepairLabel = (auctionItem: AuctionItem) => {
  if (auctionItem.repair_max == null || auctionItem.repair_current == null) return '-'
  return `${auctionItem.repair_current}/${auctionItem.repair_max}`
}

const getAuctionItemLabel = (name: string, auctionItem: AuctionItem) => {
  const item = getAuctionItemSnapshot(auctionItem)
  const parts: string[] = [name]
  const notes = auctionItem.notes?.trim()
  if (notes) {
    parts.push(`(${notes})`)
  }
  parts.push(`(${rarityLabels[item.rarity]})`)
  parts.push(`(${getRepairMissing(auctionItem)})`)
  return parts.join(' ')
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
  noPadding = false,
}: {
  name: string
  avatar?: string | null
  sizeClass?: string
  title?: string
  noPadding?: boolean
}) => {
  const getInitials = useInitials()
  const label = name?.trim() || 'User'
  const paddingClass = noPadding ? 'p-0' : 'p-1'

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full border border-base-100 bg-base-200 text-[10px] font-semibold',
        paddingClass,
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
  isSold,
}: {
  auctionItem: AuctionItem
  currency: string
  candidates: AuctionVoiceCandidate[]
  highestBidderId?: string | null
  isSold: boolean
}) => {
  const item = getAuctionItemSnapshot(auctionItem)
  const step = getBidStep(item)
  const startingBid = getStartingBid(auctionItem)
  const highestBid = getHighestBid(auctionItem)
  const minBid = highestBid ? Math.max(startingBid, highestBid.amount + step) : startingBid
  const isAmountValid = (minBid - startingBid) % step === 0
  const biddingDisabled = isSold

  const handleBid = (candidateId: string, candidateName: string) => {
    if (biddingDisabled) {
      toast.show('Bidding is closed. Item already sold.', 'error')
      return
    }

    if (!isAmountValid) {
      toast.show(`Minimum ${minBid} ${currency} in steps of ${step}.`, 'error')
      return
    }

    const hiddenBid = getHiddenBidForCandidate(auctionItem, candidateId)
    if (hiddenBid && minBid > hiddenBid.max_amount) {
      toast.show(`Max bid for ${candidateName} is ${hiddenBid.max_amount} ${currency}.`, 'error')
      return
    }

    router.post(
      route('admin.auction-items.bids.store', { auctionItem: auctionItem.id }),
      { bidder_discord_id: candidateId, bidder_name: candidateName, amount: minBid },
      {
        preserveScroll: true,
        onSuccess: () => {
          router.reload()
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
        <p className="text-xs text-base-content/70">No live users.</p>
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
            const displayName = candidate.name.length > 8 ? `${candidate.name.slice(0, 8)}…` : candidate.name
            return (
              <Button
                key={candidate.id}
                size="xs"
                variant="outline"
                disabled={!isAmountValid || biddingDisabled}
                onClick={() => handleBid(candidate.id, candidate.name)}
                title={biddingDisabled ? 'Item already sold' : isOverMax ? disableReason : undefined}
                className={cn(
                  'gap-2',
                  isLeader && 'border-success text-success',
                  hasHiddenRoom && 'border-warning text-warning',
                  isOverMax && 'opacity-60',
                )}
              >
                <AvatarCircle name={candidate.name} avatar={candidate.avatar} sizeClass="h-5 w-5" noPadding />
                <span>{displayName}</span>
                {isLeader ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] uppercase">Lead</span> : null}
              </Button>
            )
          })}
        </div>
      )}
      {biddingDisabled ? (
        <p className="text-[11px] text-base-content/50">Bidding closed (sold).</p>
      ) : (
        <p className="text-[11px] text-base-content/50">
          Next bid: {minBid} {currency} - Step {step}
        </p>
      )}
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
  const item = getAuctionItemSnapshot(auctionItem)

  const handleDelete = (bidId: number) => {
    if (!window.confirm('Delete bid?')) return

    router.delete(route('admin.auction-bids.destroy', { auctionBid: bidId }), {
      preserveScroll: true,
      preserveState: true,
      onError: () => {
        toast.show('Bid could not be deleted.', 'error')
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)}>
          <History size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Bid history</ModalTitle>
      <ModalContent>
        <p className="mb-2 text-xs text-base-content/60">{item.name}</p>
        {hiddenBids.length > 0 ? (
          <div className="mb-3">
            <p className="mb-1 text-[10px] font-semibold uppercase text-base-content/50">Hidden bids</p>
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
        <p className="mb-1 text-[10px] font-semibold uppercase text-base-content/50">Bids</p>
        {bids.length === 0 ? (
          <p className="text-xs text-base-content/70">No bids yet.</p>
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
                      <Trash size={14} />
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
  disabled = false,
}: {
  auctionItem: AuctionItem
  currency: string
  candidates: AuctionVoiceCandidate[]
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const defaultMaxAmount = Math.max(getStartingBid(auctionItem), 1)
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
      toast.show('Provide Discord ID and name.', 'error')
      return
    }

    post(route('admin.auction-items.hidden-bids.store', { auctionItem: auctionItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        reset('bidder_discord_id', 'bidder_name')
        setData('max_amount', defaultMaxAmount)
        router.reload()
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
    if (!window.confirm('Delete hidden bid?')) return

    router.delete(route('admin.auction-hidden-bids.destroy', { auctionHiddenBid: hiddenBidId }), {
      preserveScroll: true,
      preserveState: true,
      onError: () => {
        toast.show('Hidden bid could not be deleted.', 'error')
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="xs"
          variant="ghost"
          modifier="square"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          title={disabled ? 'Item already sold' : undefined}
        >
          <EyeOff size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Hidden bids</ModalTitle>
      <ModalContent>
        <p className="mb-3 text-xs text-base-content/60">Max bids before the auction, one per player.</p>
        {candidates.length > 0 ? (
          <Select value={selectedCandidateId} onChange={handleCandidateChange}>
            <SelectLabel>Select live candidate</SelectLabel>
            <SelectOptions>
              <option value="">Manual</option>
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
          Max bid ({currency})
        </Input>

        <div className="mt-4">
          <p className="mb-1 text-[10px] font-semibold uppercase text-base-content/50">Active hidden bids</p>
          {hiddenBids.length === 0 ? (
            <p className="text-xs text-base-content/70">No hidden bids yet.</p>
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
                    <Trash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Save</ModalAction>
    </Modal>
  )
}

const AuctionItemSnapshotModal = ({ auctionItem, item }: { auctionItem: AuctionItem; item: Item }) => {
  const { data, setData, patch, processing } = useForm({
    name: item.name ?? '',
    url: item.url ?? '',
    cost: item.cost ?? '',
    notes: auctionItem.notes ?? '',
    rarity: item.rarity ?? 'common',
    type: item.type ?? 'item',
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setData({
      name: item.name ?? '',
      url: item.url ?? '',
      cost: item.cost ?? '',
      notes: auctionItem.notes ?? '',
      rarity: item.rarity ?? 'common',
      type: item.type ?? 'item',
    })
  }, [isOpen, auctionItem.notes, item.cost, item.name, item.rarity, item.type, item.url, setData])

  const handleSubmit = () => {
    patch(route('admin.auction-items.snapshot.update', { auctionItem: auctionItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload()
      },
      onError: (errors) => {
        const message = errors.name || errors.url || errors.cost || errors.rarity || errors.type
        if (message) {
          toast.show(String(message), 'error')
        }
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)} aria-label="Edit listing">
          <Pencil size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Edit listing</ModalTitle>
      <ModalContent>
        <Input value={data.name} onChange={(e) => setData('name', e.target.value)}>
          Name
        </Input>
        <Input value={data.url ?? ''} onChange={(e) => setData('url', e.target.value)}>
          URL
        </Input>
        <Input value={data.cost ?? ''} onChange={(e) => setData('cost', e.target.value)}>
          Cost
        </Input>
        <Input value={data.notes ?? ''} onChange={(e) => setData('notes', e.target.value)}>
          Notes
        </Input>
        <Select value={data.rarity} onChange={(e) => setData('rarity', e.target.value as Item['rarity'])}>
          <SelectLabel>Rarity</SelectLabel>
          <SelectOptions>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very_rare">Very Rare</option>
          </SelectOptions>
        </Select>
        <Select value={data.type} onChange={(e) => setData('type', e.target.value as Item['type'])}>
          <SelectLabel>Type</SelectLabel>
          <SelectOptions>
            <option value="item">Item</option>
            <option value="spellscroll">Spell Scroll</option>
            <option value="consumable">Consumable</option>
          </SelectOptions>
        </Select>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
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
  const item = getAuctionItemSnapshot(auctionItem)
  const textColor = getRarityTextColor(item.rarity)
  const highestBid = getHighestBid(auctionItem)
  const isSold = Boolean(auctionItem.sold_at)
  const isCustomListing = Boolean(auctionItem.snapshot_custom)
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
  const canFinalize = Boolean(highestBid) && !isSold

  const handleSnapshotRefresh = () => {
    if (!window.confirm('Refresh this listing from the compendium?')) return

    router.post(route('admin.auction-items.snapshot.refresh', { auctionItem: auctionItem.id }), {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Listing refreshed.', 'info')
        router.reload()
      },
      onError: (errors) => {
        const message = errors.snapshot || 'Listing could not be refreshed.'
        toast.show(String(message), 'error')
      },
    })
  }

  const handleFinalizeSold = () => {
    if (!highestBid) {
      toast.show('No bids available.', 'error')
      return
    }
    if (!window.confirm('Mark this item as sold?')) return

    router.post(route('admin.auction-items.finalize', { auctionItem: auctionItem.id }), {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Item marked as sold.', 'info')
        router.reload()
      },
      onError: (errors) => {
        const message = errors.auction_item || 'Item could not be finalized.'
        toast.show(String(message), 'error')
      },
    })
  }

  const handleDeleteAuctionItem = () => {
    if (!window.confirm(`Delete "${item.name}" from this auction?`)) return

    router.delete(route('admin.auction-items.destroy', { auctionItem: auctionItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Auction line deleted.', 'info')
        router.reload()
      },
      onError: () => {
        toast.show('Auction line could not be deleted.', 'error')
      },
    })
  }

  return (
    <ListRow className="grid-cols-1">
      <div className="col-span-full flex w-full flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className={cn(textColor, 'flex h-4 w-4 shrink-0 items-center justify-center')}>
              {renderIcon(item.type)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={cn(textColor, 'truncate text-sm font-semibold leading-none', isSold && 'line-through opacity-70')}>
                  {getAuctionItemLabel(item.name, auctionItem)}
                </span>
                {isSold ? (
                  <span className="rounded-full border border-success/40 px-2 py-0.5 text-[9px] uppercase text-success">
                    Sold
                  </span>
                ) : null}
                {isCustomListing ? (
                  <span className="rounded-full border border-warning/40 px-2 py-0.5 text-[9px] uppercase text-warning">
                    Custom listing
                  </span>
                ) : null}
              </div>
              <span className="text-xs font-normal leading-none text-base-content/70">
                Auctions left: {auctionItem.remaining_auctions} - Repair {getRepairLabel(auctionItem)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="xs"
              variant="ghost"
              modifier="square"
              onClick={handleFinalizeSold}
              aria-label="Finalize sold"
              title={isSold ? 'Already sold' : highestBid ? 'Finalize sold' : 'No bids'}
              disabled={!canFinalize}
            >
              <CheckCircle2 size={14} />
            </Button>
            <HiddenBidModal auctionItem={auctionItem} currency={currency} candidates={candidates} disabled={isSold} />
            <BidHistoryModal auctionItem={auctionItem} currency={currency} />
            <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
            <Button size="xs" variant="ghost" modifier="square" onClick={handleSnapshotRefresh} aria-label="Refresh listing">
              <RotateCcw size={14} />
            </Button>
            <AuctionItemSnapshotModal auctionItem={auctionItem} item={item} />
            <Button
              size="xs"
              variant="ghost"
              modifier="square"
              color="error"
              onClick={handleDeleteAuctionItem}
              aria-label="Delete auction line"
              title="Delete auction line"
            >
              <Trash size={14} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base-content/60">Highest bid:</span>
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
              <span className="text-base-content/70">No bids</span>
            )}
          </div>
          <div className="w-full">
            <AuctionItemBidControls
              auctionItem={auctionItem}
              currency={currency}
              candidates={bidCandidates}
              highestBidderId={highestBid?.bidder_discord_id}
              isSold={isSold}
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
    ? `Repair: ${repairDefaultCurrent}/${repairMax} ${auction.currency}`
    : `Repair (${auction.currency})`

  useEffect(() => {
    if (!isOpen) return
    const nextItemId = items[0]?.id ?? 0
    const repairCurrent = getDefaultRepairCurrent(nextItemId, items)
    setData('item_id', nextItemId)
    setData('repair_current', repairCurrent)
    setData('notes', '')
    setData('remaining_auctions', 3)
  }, [isOpen, items, setData])

  const handleSubmit = () => {
    if (!hasItems) return
    post(route('admin.auction-items.store', { auction: auction.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload()
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
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} disabled={!hasItems} className="gap-2">
          <Plus size={16} />
          Add item
        </Button>
      </ModalTrigger>
      <ModalTitle>Add item to auction</ModalTitle>
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
              <option value={0}>No items available</option>
            )}
          </SelectOptions>
        </Select>
        <Input
          value={data.notes}
          onChange={(e) => setData('notes', e.target.value)}
        >
          Notes
        </Input>
        <Input
          type="number"
          min={1}
          value={data.remaining_auctions}
          onChange={(e) => setData('remaining_auctions', Number(e.target.value))}
        >
          Auctions left
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
      <ModalAction onClick={handleSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default function Index({
  auctions,
  items,
  auctionSettings,
}: {
  auctions: Auction[]
  items: Item[]
  auctionSettings: AuctionSettings
}) {
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(auctions[0] ?? null)
  const [settings, setSettings] = useState<AuctionSettings>(auctionSettings ?? {})
  const [voiceCandidates, setVoiceCandidates] = useState<AuctionVoiceCandidate[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPostingAuction, setIsPostingAuction] = useState(false)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [isSavingVoiceChannel, setIsSavingVoiceChannel] = useState(false)
  const [manualCooldownRemaining, setManualCooldownRemaining] = useState(0)
  const cooldownIntervalRef = useRef<number | null>(null)
  const isSyncingRef = useRef(false)
  const voiceChannelIdRef = useRef<string | null>(auctionSettings?.voice_channel_id ?? null)
  const { auth } = usePage<PageProps>().props
  const isAdmin = Boolean(auth?.user?.is_admin)

  useEffect(() => {
    setSelectedAuction((prev) => {
      if (prev) {
        return auctions.find((a) => a.id === prev.id) || null
      }
      return auctions[0] ?? null
    })
  }, [auctions, selectedAuction?.id])

  useEffect(() => {
    const nextChannelId = auctionSettings?.voice_channel_id ?? null
    const prevChannelId = voiceChannelIdRef.current

    setSettings(auctionSettings ?? {})

    if (nextChannelId !== prevChannelId) {
      setVoiceCandidates([])
      voiceChannelIdRef.current = nextChannelId
    }
  }, [auctionSettings])

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

  const handlePostChannelSelect = useCallback(
    async (
      selection:
        | DiscordBackupChannel
        | { guild_id: string; channel_ids: string[] }[]
        | null
    ) => {
      if (!selection || Array.isArray(selection)) return
      if (isSavingChannel) return

      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        toast.show('Missing CSRF token.', 'error')
        return
      }

      setIsSavingChannel(true)
      const payload = {
        post_channel_id: selection.id,
        post_channel_name: selection.name,
        post_channel_type: selection.type,
        post_channel_guild_id: selection.guild_id,
        post_channel_is_thread: selection.is_thread,
      }

      try {
        const response = await fetch(route('admin.auction-settings.update'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          toast.show(String(data?.error ?? 'Channel could not be saved.'), 'error')
          return
        }

        setSettings((current) => ({
          ...current,
          post_channel_id: selection.id,
          post_channel_name: selection.name,
          post_channel_type: selection.type,
          post_channel_guild_id: selection.guild_id,
          post_channel_is_thread: selection.is_thread,
        }))
        toast.show('Posting channel saved.', 'info')
      } catch {
        toast.show('Channel could not be saved.', 'error')
      } finally {
        setIsSavingChannel(false)
      }
    },
    [isSavingChannel],
  )

  const handlePostAuction = useCallback(async () => {
    if (!selectedAuction) {
      toast.show('Select an auction first.', 'error')
      return
    }
    if (isPostingAuction) return
    if (!settings.post_channel_id) {
      toast.show('Select a posting channel first.', 'error')
      return
    }
    if (!window.confirm('Post this auction to Discord now?')) {
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsPostingAuction(true)
    try {
      const response = await fetch(route('admin.auctions.post', selectedAuction.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ channel_id: settings.post_channel_id }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Auction could not be posted.'), 'error')
        return
      }

      toast.show('Auction post started.', 'info')
    } catch {
      toast.show('Auction could not be posted.', 'error')
    } finally {
      setIsPostingAuction(false)
    }
  }, [isPostingAuction, selectedAuction, settings.post_channel_id])

  const destinationLabel = settings.post_channel_name ?? settings.post_channel_id ?? 'Not set'
  const destinationKind = settings.post_channel_id
    ? settings.post_channel_is_thread
      ? 'Thread'
      : 'Channel'
    : null
  const destinationText = `Destination: ${destinationKind ? `${destinationKind} ${destinationLabel}` : destinationLabel}`
  const hasPostDestination = Boolean(settings.post_channel_id)
  const handleCloseAuction = () => {
    if (!selectedAuction || selectedAuction.status === 'closed') return
    const confirmed = window.confirm(
      'Close this auction? Unsold items without bids will move to a new auction.',
    )
    if (!confirmed) return

    router.put(
      route('admin.auctions.update', { auction: selectedAuction.id }),
      { status: 'closed' },
      {
        preserveScroll: true,
        preserveState: false,
      },
    )
  }

  const syncVoiceCandidates = useCallback(async (showToast: boolean) => {
    if (!settings.voice_channel_id || isSyncingRef.current) return

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      if (showToast) toast.show('Missing CSRF token.', 'error')
      return
    }

    isSyncingRef.current = true
    setIsSyncing(true)
    try {
      const response = await fetch(route('admin.auctions.voice.sync'), {
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
        if (showToast) toast.show(String(payload?.error ?? 'Sync failed.'), 'error')
        return
      }

      const candidates = Array.isArray(payload?.voice_candidates) ? payload.voice_candidates : []
      setVoiceCandidates(candidates)

      if (showToast) {
        toast.show('Voice candidates updated', 'info')
      }
    } catch {
      if (showToast) toast.show('Sync failed.', 'error')
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }, [settings.voice_channel_id])

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
          .filter((auctionItem) => getAuctionItemSnapshot(auctionItem).rarity === rarity)
          .sort((a, b) => {
            const itemA = getAuctionItemSnapshot(a)
            const itemB = getAuctionItemSnapshot(b)
            const typeCompare = typeOrder[itemA.type] - typeOrder[itemB.type]
            if (typeCompare !== 0) return typeCompare
            return itemA.name.localeCompare(itemB.name)
          }),
      }))
      .filter((group) => group.items.length > 0)
  }, [selectedAuction])

  const useMockCandidates = isLocalDev && voiceCandidates.length === 0
  const candidates = useMemo<AuctionVoiceCandidate[]>(
    () => (useMockCandidates ? mockVoiceCandidates : voiceCandidates),
    [useMockCandidates, voiceCandidates],
  )
  const voiceChannelLabel = settings.voice_channel_name ?? settings.voice_channel_id ?? 'Not set'

  const manualCooldownLabel = manualCooldownRemaining > 0 ? `Refresh (${manualCooldownRemaining}s)` : 'Refresh'

  const handleVoiceChannelSelect = useCallback(
    (selection: DiscordBackupChannel | { guild_id: string; channel_ids: string[] }[] | null) => {
      if (!selection || Array.isArray(selection)) return
      if (isSavingVoiceChannel) return

      const payload = {
        voice_channel_id: selection.id,
        voice_channel_name: selection.name,
        voice_channel_type: selection.type,
        voice_channel_guild_id: selection.guild_id,
        voice_channel_is_thread: selection.is_thread,
      }

      setIsSavingVoiceChannel(true)
      router.patch(
        route('admin.auction-settings.update'),
        payload,
        {
          preserveScroll: true,
          onSuccess: () => {
            setSettings((current) => ({ ...current, ...payload }))
            toast.show('Voice channel saved.', 'info')
            router.reload({ only: ['auctionSettings'] })
          },
          onError: (errors) => {
            toast.show(String(errors.voice_channel_id ?? 'Voice channel could not be saved.'), 'error')
          },
          onFinish: () => {
            setIsSavingVoiceChannel(false)
          },
        },
      )
    },
    [isSavingVoiceChannel],
  )

  useEffect(() => {
    if (!settings.voice_channel_id) return

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
  }, [syncVoiceCandidates, settings.voice_channel_id])

  return (
    <AppLayout>
      <Head title="Auctions" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Auctions</h1>
            <p className="text-sm text-base-content/70">Manage auctions, bids, and live voice candidates.</p>
          </div>
        </section>
        <div>
          <Select className="w-full" value={selectedAuction?.id || ''} onChange={onAuctionSelectChange}>
            <SelectLabel>Auctions</SelectLabel>
            <SelectOptions>
              {auctions.map((auction) => (
                <option key={auction.id} value={auction.id}>
                  {`${auction.title ?? `Auction #${String(auction.id).padStart(3, '0')}`} - ${formatAuctionCreatedAt(auction.created_at)}`}
                </option>
              ))}
            </SelectOptions>
          </Select>
        </div>

        {selectedAuction ? (
          <>
            <div className="mb-4 rounded-box bg-base-100 shadow-md p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-1',
                      hasPostDestination ? 'border-base-200 text-base-content/70' : 'border-warning text-warning',
                    )}
                  >
                    {destinationText}
                  </span>
                  <span className="rounded-full border border-base-200 px-2 py-1">
                    Status: {statusLabels[selectedAuction.status]}
                  </span>
                  <span className="rounded-full border border-base-200 px-2 py-1">
                    Items: {selectedAuction.auction_items.length}
                  </span>
                  <span className="rounded-full border border-base-200 px-2 py-1">
                    Steps: 10 / 50 / 100 / 500 (consumables/spellscrolls halved)
                  </span>
                </div>
                {isAdmin ? (
                  <Modal>
                    <ModalTrigger>
                      <Button size="sm" variant="outline" modifier="square" aria-label="Configure auction">
                        <Settings size={16} />
                      </Button>
                    </ModalTrigger>
                    <ModalTitle>Auction settings</ModalTitle>
                    <ModalContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-xs text-base-content/70">Posting destination</p>
                          <p className="text-sm font-semibold">{destinationText}</p>
                          <DiscordChannelPickerModal
                            title="Select posting channel"
                            description="Choose where the auction should be posted."
                            confirmLabel="Save channel"
                            channelsRouteName="admin.settings.backup.channels.refresh"
                            threadsRouteName="admin.settings.backup.threads.refresh"
                            includeThreads={false}
                            enableThreadLoader
                            threadLoadIncludeArchived
                            threadLoadIncludePrivate={false}
                            mode="single"
                            allowedChannelTypes={['GuildText', 'GuildAnnouncement', 'PublicThread', 'PrivateThread', 'AnnouncementThread']}
                            triggerClassName="gap-2"
                            triggerSize="sm"
                            triggerVariant="outline"
                            triggerDisabled={isSavingChannel}
                            onConfirm={handlePostChannelSelect}
                          >
                            <Send size={16} />
                            Select channel
                          </DiscordChannelPickerModal>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-base-content/70">Voice channel</p>
                          <p className="text-sm font-semibold">
                            {voiceChannelLabel}
                          </p>
                          <DiscordChannelPickerModal
                            title="Select voice channel"
                            description="Choose the voice channel used for live candidates."
                            confirmLabel="Save channel"
                            channelsRouteName="admin.settings.backup.channels.refresh"
                            includeThreads={false}
                            mode="single"
                            allowedChannelTypes={['GuildVoice', 'GuildStageVoice']}
                            triggerClassName="gap-2"
                            triggerSize="sm"
                            triggerVariant="outline"
                            triggerDisabled={isSavingVoiceChannel}
                            onConfirm={handleVoiceChannelSelect}
                          >
                            <Mic size={16} />
                            Select voice channel
                          </DiscordChannelPickerModal>
                        </div>
                      </div>
                    </ModalContent>
                  </Modal>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selectedAuction ? (
                  <AddAuctionItemModal auction={selectedAuction} items={items} />
                ) : null}
                {isAdmin ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePostAuction}
                    disabled={!settings.post_channel_id || isPostingAuction}
                    className="gap-2"
                  >
                    <Send size={16} />
                    Post auction
                  </Button>
                ) : null}
                {isAdmin ? (
                  <Button
                    size="sm"
                    variant="outline"
                    color="error"
                    onClick={handleCloseAuction}
                    disabled={selectedAuction.status === 'closed'}
                    className="gap-2"
                  >
                    <XCircle size={16} />
                    Close auction
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              {settings.voice_channel_id || useMockCandidates ? (
                <>
                  {candidates.length === 0 ? (
                    <p className="text-xs text-base-content/70">No users online.</p>
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
                    disabled={!settings.voice_channel_id || isSyncing || manualCooldownRemaining > 0}
                  >
                    {manualCooldownLabel}
                  </Button>
                  {useMockCandidates ? (
                    <span className="text-[10px] uppercase text-base-content/50">Mock</span>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-base-content/70">
                  No voice channel selected. Configure it in the auction settings.
                </p>
              )}
            </div>

            {groupedItems.length === 0 ? (
              <div className="text-sm opacity-70">No items in this auction yet.</div>
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
          <div className="text-sm opacity-70">No auctions available.</div>
        )}
      </div>
    </AppLayout>
  )
}
