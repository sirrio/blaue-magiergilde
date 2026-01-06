import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { Auction, AuctionItem, AuctionVoiceCandidate, Item } from '@/types'
import { Head, router, useForm } from '@inertiajs/react'
import { format } from 'date-fns'
import { Copy, Edit, FlaskRound, Plus, ScrollText, Sword } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

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
  item: <Sword />,
  spellscroll: <ScrollText />,
  consumable: <FlaskRound />,
}

const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare'] as const

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

const parseCostValue = (cost?: string | null) => {
  if (!cost) return null
  const digits = cost.replace(/[^0-9]/g, '')
  if (!digits) return null
  return Number(digits)
}

const getRepairDefaults = (itemId: number, items: Item[]) => {
  const item = items.find((candidate) => candidate.id === itemId)
  const costValue = parseCostValue(item?.cost)
  if (costValue == null) {
    return { repair_current: 0, repair_max: 0 }
  }
  return { repair_current: Math.floor(costValue / 20), repair_max: costValue }
}

const buildDiscordText = (auction: Auction) => {
  const lines: string[] = []

  rarityOrder.forEach((rarity) => {
    const groupItems = auction.auction_items.filter((auctionItem) => auctionItem.item.rarity === rarity)
    if (groupItems.length === 0) return

    lines.push(`${rarityLabels[rarity]}`)
    groupItems.forEach((auctionItem) => {
      const missing = getRepairMissing(auctionItem)
      lines.push(
        `(${auctionItem.remaining_auctions}) - ${auctionItem.starting_bid} ${auction.currency} - ${auctionItem.item.name} (${missing})`,
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

const getHighestBid = (auctionItem: AuctionItem) => {
  return auctionItem.bids?.[0]
}

const AuctionItemRow = ({
  auctionItem,
  currency,
  defaultBidderName,
}: {
  auctionItem: AuctionItem
  currency: string
  defaultBidderName?: string
}) => {
  const textColor = getRarityTextColor(auctionItem.item.rarity)
  const highestBid = getHighestBid(auctionItem)

  return (
    <ListRow>
      <div className={cn(textColor)}>{renderIcon(auctionItem.item.type)}</div>
      <div className={cn(textColor, 'text-xs sm:text-sm')}>
        ({auctionItem.remaining_auctions}) {auctionItem.item.name}
        <span className="ml-2 text-xs font-light italic">({getRepairMissing(auctionItem)})</span>
      </div>
      <div className="max-w-24 font-mono text-xs">{auctionItem.starting_bid} {currency}</div>
      <div className="text-xs">
        {highestBid ? `${highestBid.amount} ${currency} · ${highestBid.bidder_name}` : 'No bids yet'}
      </div>
      <div className="text-xs text-base-content/70">Repair {getRepairLabel(auctionItem)}</div>
      <AddBidModal auctionItem={auctionItem} currency={currency} defaultBidderName={defaultBidderName} />
    </ListRow>
  )
}

const AddBidModal = ({
  auctionItem,
  currency,
  defaultBidderName,
}: {
  auctionItem: AuctionItem
  currency: string
  defaultBidderName?: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, errors } = useForm({ bidder_name: '', amount: 0 })
  const step = getBidStep(auctionItem.item)
  const highestBid = getHighestBid(auctionItem)
  const minBid = highestBid ? Math.max(auctionItem.starting_bid, highestBid.amount + step) : auctionItem.starting_bid

  useEffect(() => {
    if (!isOpen) return
    setData('amount', minBid)
    if (defaultBidderName) {
      setData('bidder_name', defaultBidderName)
    }
  }, [defaultBidderName, isOpen, minBid, setData])

  const handleSubmit = () => {
    post(route('auction-items.bids.store', { auctionItem: auctionItem.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload({ preserveScroll: true })
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)}>
          +
        </Button>
      </ModalTrigger>
      <ModalTitle>Gebot eintragen</ModalTitle>
      <ModalContent>
        <Input errors={errors.bidder_name} value={data.bidder_name} onChange={(e) => setData('bidder_name', e.target.value)}>
          Bieter
        </Input>
        <Input
          errors={errors.amount}
          type="number"
          min={minBid}
          step={step}
          value={data.amount}
          onChange={(e) => setData('amount', Number(e.target.value))}
        >
          Betrag
        </Input>
        <p className="mt-2 text-xs text-base-content/70">
          Mindestgebot: {minBid} {currency} · Schritt: {step} {currency}
        </p>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Speichern</ModalAction>
    </Modal>
  )
}

const AddAuctionItemModal = ({ auction, items }: { auction: Auction; items: Item[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const initialItemId = items[0]?.id ?? 0
  const hasItems = items.length > 0
  const defaultRepairs = getRepairDefaults(initialItemId, items)
  const { data, setData, post } = useForm({
    item_id: initialItemId,
    starting_bid: 0,
    remaining_auctions: 1,
    repair_current: defaultRepairs.repair_current,
    repair_max: defaultRepairs.repair_max,
  })

  useEffect(() => {
    if (!isOpen) return
    const defaults = getRepairDefaults(data.item_id, items)
    setData('repair_current', defaults.repair_current)
    setData('repair_max', defaults.repair_max)
  }, [isOpen])

  const handleSubmit = () => {
    if (!hasItems) return
    post(route('auction-items.store', { auction: auction.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload({ preserveScroll: true })
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
            const defaults = getRepairDefaults(nextId, items)
            setData('item_id', nextId)
            setData('repair_current', defaults.repair_current)
            setData('repair_max', defaults.repair_max)
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
        <Input type="number" min={0} value={data.starting_bid} onChange={(e) => setData('starting_bid', Number(e.target.value))}>
          Startgebot
        </Input>
        <Input
          type="number"
          min={1}
          value={data.remaining_auctions}
          onChange={(e) => setData('remaining_auctions', Number(e.target.value))}
        >
          Versteigerungen uebrig
        </Input>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} value={data.repair_current} onChange={(e) => setData('repair_current', Number(e.target.value))}>
            Repariert
          </Input>
          <Input type="number" min={0} value={data.repair_max} onChange={(e) => setData('repair_max', Number(e.target.value))}>
            Gesamt
          </Input>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Speichern</ModalAction>
    </Modal>
  )
}

const EditAuctionModal = ({ auction }: { auction: Auction }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, put } = useForm({
    title: auction.title ?? '',
    status: auction.status,
    currency: auction.currency,
    voice_channel_id: auction.voice_channel_id ?? '',
  })

  const handleSubmit = () => {
    put(route('auctions.update', { auction: auction.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        router.reload({ preserveScroll: true })
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          <Edit size={16} />
          Auktion bearbeiten
        </Button>
      </ModalTrigger>
      <ModalTitle>Auktion bearbeiten</ModalTitle>
      <ModalContent>
        <Input value={data.title} onChange={(e) => setData('title', e.target.value)}>
          Titel
        </Input>
        <Select value={data.status} onChange={(e) => setData('status', e.target.value as Auction['status'])}>
          <SelectLabel>Status</SelectLabel>
          <SelectOptions>
            <option value="open">Offen</option>
            <option value="draft">Entwurf</option>
            <option value="closed">Beendet</option>
          </SelectOptions>
        </Select>
        <Input value={data.currency} onChange={(e) => setData('currency', e.target.value)}>
          Währung
        </Input>
        <Input value={data.voice_channel_id} onChange={(e) => setData('voice_channel_id', e.target.value)}>
          Voice Channel ID
        </Input>
      </ModalContent>
      <ModalAction onClick={handleSubmit}>Speichern</ModalAction>
    </Modal>
  )
}

export default function Index({ auctions, items }: { auctions: Auction[]; items: Item[] }) {
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(auctions[0] ?? null)
  const [preferredBidderName, setPreferredBidderName] = useState<string>('')

  useEffect(() => {
    setSelectedAuction((prev) => {
      if (prev) {
        return auctions.find((a) => a.id === prev.id) || null
      }
      return auctions[0] ?? null
    })
  }, [auctions, selectedAuction?.id])

  const onAuctionSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const auctionId = Number(event.target.value)
    const newAuction = auctions.find((auction) => auction.id === auctionId) || null
    setSelectedAuction(newAuction)
    setPreferredBidderName('')
  }

  const handleCreateAuction = (): void => {
    router.post(route('auctions.store'), {}, { preserveState: false, preserveScroll: true })
  }

  const handleCopyAuction = () => {
    if (!selectedAuction) return
    navigator.clipboard.writeText(buildDiscordText(selectedAuction)).then(() => {
      toast.show('Auktion kopiert', 'info')
    })
  }

  const handleRefreshCandidates = () => {
    if (!selectedAuction) return
    router.post(
      route('auctions.voice-sync', { auction: selectedAuction.id }),
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.show('Voice Kandidaten aktualisiert', 'info')
        },
        onError: (errors) => {
          const message = errors.voice_sync ?? 'Fehler beim Sync.'
          toast.show(String(message), 'error')
        },
      },
    )
  }

  const groupedItems = useMemo(() => {
    if (!selectedAuction) return []
    return rarityOrder
      .map((rarity) => ({
        rarity,
        items: selectedAuction.auction_items.filter((auctionItem) => auctionItem.item.rarity === rarity),
      }))
      .filter((group) => group.items.length > 0)
  }, [selectedAuction])

  const candidates = useMemo<AuctionVoiceCandidate[]>(() => {
    if (!selectedAuction?.voice_candidates || !Array.isArray(selectedAuction.voice_candidates)) return []
    return selectedAuction.voice_candidates
  }, [selectedAuction])

  const voiceUpdatedLabel = selectedAuction?.voice_updated_at
    ? format(new Date(selectedAuction.voice_updated_at), "iiii dd MMM'.' yyyy ' - ' HH:mm")
    : 'unbekannt'

  return (
    <AppLayout>
      <Head title="Auktionen" />
      <div className="container mx-auto max-w-3xl px-2 py-4 md:px-0">
        <div className="join mb-6 flex items-end">
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
          <Button onClick={handleCreateAuction} color={'warning'} className="join-item">
            <Plus size={18} />
            Neue Auktion
          </Button>
        </div>

        {selectedAuction ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="badge badge-outline">Status: {statusLabels[selectedAuction.status]}</div>
              <div className="badge badge-outline">Waehrung: {selectedAuction.currency}</div>
              <Button size="sm" variant="outline" onClick={handleCopyAuction}>
                <Copy size={16} />
                Discord kopieren
              </Button>
              <AddAuctionItemModal auction={selectedAuction} items={items} />
              <EditAuctionModal key={selectedAuction.id} auction={selectedAuction} />
            </div>
            <p className="mb-4 text-xs text-base-content/70">
              Schritte: Common 10, Uncommon 50, Rare 100, Very Rare 500. Consumables/Spellscrolls halbiert.
            </p>

            <div className="mb-4 rounded-box bg-base-100 p-4 shadow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Voice Kandidaten</p>
                  <p className="text-xs text-base-content/70">
                    Channel ID: {selectedAuction.voice_channel_id ?? '-'} · Letztes Update: {voiceUpdatedLabel}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshCandidates}
                  disabled={!selectedAuction.voice_channel_id}
                >
                  Aktualisieren
                </Button>
              </div>
              {selectedAuction.voice_channel_id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidates.length === 0 ? (
                    <p className="text-xs text-base-content/70">Keine aktiven Nutzer gemeldet.</p>
                  ) : (
                    candidates.map((candidate) => (
                      <Button
                        key={candidate.id}
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setPreferredBidderName(candidate.name)
                          toast.show(`Bieter gesetzt: ${candidate.name}`, 'info')
                        }}
                      >
                        {candidate.name}
                      </Button>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-base-content/70">
                  Keine Channel ID gesetzt. Nutze "Auktion bearbeiten", um sie zu hinterlegen.
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
                        defaultBidderName={preferredBidderName}
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
