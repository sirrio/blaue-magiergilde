import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import { Auction, AuctionItem, AuctionVoiceCandidate, Item, VoiceSettings } from '@/types'
import { Head, Link, router, useForm } from '@inertiajs/react'
import { format } from 'date-fns'
import { Copy, Edit, FlaskRound, Plus, ScrollText, Sword } from 'lucide-react'
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

const AuctionItemBidControls = ({
  auctionItem,
  currency,
  candidates,
}: {
  auctionItem: AuctionItem
  currency: string
  candidates: AuctionVoiceCandidate[]
}) => {
  const step = getBidStep(auctionItem.item)
  const highestBid = getHighestBid(auctionItem)
  const minBid = highestBid ? Math.max(auctionItem.starting_bid, highestBid.amount + step) : auctionItem.starting_bid
  const isAmountValid = (minBid - auctionItem.starting_bid) % step === 0

  const handleBid = (candidateId: string) => {
    if (!isAmountValid) {
      toast.show(`Min ${minBid} ${currency} in Schritten von ${step}.`, 'error')
      return
    }

    router.post(
      route('auction-items.bids.store', { auctionItem: auctionItem.id }),
      { bidder_discord_id: candidateId, amount: minBid },
      {
        preserveScroll: true,
        onSuccess: () => {
          router.reload({ preserveScroll: true })
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
        <div className="flex flex-wrap gap-1">
          {candidates.map((candidate) => (
            <Button
              key={candidate.id}
              size="xs"
              variant="outline"
              disabled={!isAmountValid}
              onClick={() => handleBid(candidate.id)}
            >
              {candidate.name}
            </Button>
          ))}
        </div>
      )}
      <p className="text-[10px] text-base-content/60">
        Naechstes Gebot: {minBid} {currency} - Schritt {step}
      </p>
    </div>
  )
}

const AuctionItemRow = ({
  auctionItem,
  currency,
  candidates,
  resolveBidderLabel,
}: {
  auctionItem: AuctionItem
  currency: string
  candidates: AuctionVoiceCandidate[]
  resolveBidderLabel: (discordId: string) => string
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
        {highestBid ? `${highestBid.amount} ${currency} - ${resolveBidderLabel(highestBid.bidder_discord_id)}` : 'No bids yet'}
      </div>
      <div className="text-xs text-base-content/70">Repair {getRepairLabel(auctionItem)}</div>
      <AuctionItemBidControls auctionItem={auctionItem} currency={currency} candidates={candidates} />
    </ListRow>
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
          Waehrung
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
  const getInitials = useInitials()

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

  const handleCreateAuction = (): void => {
    router.post(route('auctions.store'), {}, { preserveState: false, preserveScroll: true })
  }

  const handleCopyAuction = () => {
    if (!selectedAuction) return
    navigator.clipboard.writeText(buildDiscordText(selectedAuction)).then(() => {
      toast.show('Auktion kopiert', 'info')
    })
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
        items: selectedAuction.auction_items.filter((auctionItem) => auctionItem.item.rarity === rarity),
      }))
      .filter((group) => group.items.length > 0)
  }, [selectedAuction])

  const candidates = useMemo<AuctionVoiceCandidate[]>(() => voiceCandidates, [voiceCandidates])
  const candidateNameById = useMemo(() => {
    const map: Record<string, string> = {}
    candidates.forEach((candidate) => {
      map[candidate.id] = candidate.name
    })
    return map
  }, [candidates])

  const resolveBidderLabel = useCallback(
    (discordId: string) => candidateNameById[discordId] ?? `ID ${discordId}`,
    [candidateNameById],
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

            <div className="mb-4 flex flex-wrap items-center gap-3">
              {voiceSettings.voice_channel_id ? (
                <>
                  {candidates.length === 0 ? (
                    <p className="text-xs text-base-content/70">Keine Nutzer online.</p>
                  ) : (
                    <div className="flex -space-x-2">
                      {candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-base-100 bg-base-200 text-xs font-semibold"
                          title={candidate.name}
                        >
                          {candidate.avatar ? (
                            <img src={candidate.avatar} alt={candidate.name} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(candidate.name)
                          )}
                        </div>
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
                        resolveBidderLabel={resolveBidderLabel}
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
