import { Button } from '@/components/ui/button'
import BotOperationProgress, { isTerminalBotOperation } from '@/components/bot-operation-progress'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { BackstockItem, BackstockSettings, BotOperation, DiscordBackupChannel, Item } from '@/types'
import { Head, router, useForm } from '@inertiajs/react'
import { CheckCircle2, FlaskRound, Package, Pencil, Plus, RotateCcw, ScrollText, Send, Settings, Shield, Sword, Trash } from 'lucide-react'
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, JSX } from 'react'

const rarityLabels: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
  artifact: 'Artifact',
  unknown_rarity: 'Unknown rarity',
}

const rarityColors: Record<string, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  very_rare: 'text-rarity-very-rare',
  legendary: 'text-rarity-legendary',
  artifact: 'text-rarity-artifact',
  unknown_rarity: 'text-rarity-unknown-rarity',
}

const typeIcons: Record<string, JSX.Element> = {
  weapon: <Sword className="h-4 w-4" />,
  armor: <Shield className="h-4 w-4" />,
  item: <Package className="h-4 w-4" />,
  consumable: <FlaskRound className="h-4 w-4" />,
  spellscroll: <ScrollText className="h-4 w-4" />,
}

const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact', 'unknown_rarity']
const typeOrder = ['weapon', 'armor', 'item', 'consumable', 'spellscroll']

const getRarityTextColor = (rarity: string): string => {
  return rarityColors[rarity] || ''
}

const renderIcon = (type: string): JSX.Element | null => {
  return typeIcons[type] || null
}

const buildBackstockAddItemLabel = (item: Item): string => {
  return `${item.name} (${rarityLabels[item.rarity]})`
}

const getBackstockItemSnapshot = (entry: BackstockItem): Item => {
  const item = entry.item ?? ({} as Item)
  return {
    id: item.id ?? 0,
    name: entry.item_name ?? item.name ?? 'Unknown item',
    url: entry.item_url ?? item.url ?? '',
    cost: entry.item_cost ?? item.display_cost ?? item.cost ?? '',
    rarity: (entry.item_rarity ?? item.rarity ?? 'common') as Item['rarity'],
    type: (entry.item_type ?? item.type ?? 'item') as Item['type'],
    pick_count: item.pick_count ?? 0,
  }
}

type BackstockGroup = {
  rarity: string
  items: BackstockItem[]
}

const buildGroups = (items: BackstockItem[]): BackstockGroup[] => {
  const byRarity = new Map<string, Map<string, BackstockItem[]>>()

  items.forEach((entry) => {
    const item = getBackstockItemSnapshot(entry)
    const rarity = item.rarity ?? 'common'
    const type = item.type ?? 'item'
    if (!byRarity.has(rarity)) byRarity.set(rarity, new Map())
    const byType = byRarity.get(rarity)
    if (!byType?.has(type)) byType?.set(type, [])
    byType?.get(type)?.push(entry)
  })

  const groups: BackstockGroup[] = []

  rarityOrder.forEach((rarity) => {
    const byType = byRarity.get(rarity)
    if (!byType) return

    typeOrder.forEach((type) => {
      const entries = byType.get(type)
      if (!entries) return
      entries.sort((a, b) => {
        const nameA = getBackstockItemSnapshot(a).name
        const nameB = getBackstockItemSnapshot(b).name
        return String(nameA).localeCompare(String(nameB))
      })
    })

    const orderedItems = typeOrder.flatMap((type) => byType.get(type) ?? [])
    if (orderedItems.length === 0) return
    groups.push({ rarity, items: orderedItems })
  })

  return groups
}

const BackstockItemSnapshotModal = ({ entry, item }: { entry: BackstockItem; item: Item }) => {
  const { data, setData, patch, processing } = useForm({
    name: item.name ?? '',
    url: item.url ?? '',
    cost: item.display_cost ?? item.cost ?? '',
    rarity: item.rarity ?? 'common',
    type: item.type ?? 'item',
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setData({
      name: item.name ?? '',
      url: item.url ?? '',
      cost: item.display_cost ?? item.cost ?? '',
      rarity: item.rarity ?? 'common',
      type: item.type ?? 'item',
    })
  }, [isOpen, item.cost, item.display_cost, item.name, item.rarity, item.type, item.url, setData])

  const handleSubmit = () => {
    patch(route('admin.backstock-items.snapshot.update', { backstockItem: entry.id }), {
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
        <Select value={data.rarity} onChange={(e) => setData('rarity', e.target.value as Item['rarity'])}>
          <SelectLabel>Rarity</SelectLabel>
          <SelectOptions>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very_rare">Very Rare</option>
            <option value="legendary">Legendary</option>
            <option value="artifact">Artifact</option>
            <option value="unknown_rarity">Unknown rarity</option>
          </SelectOptions>
        </Select>
        <Select value={data.type} onChange={(e) => setData('type', e.target.value as Item['type'])}>
          <SelectLabel>Type</SelectLabel>
          <SelectOptions>
            <option value="weapon">Weapon</option>
            <option value="armor">Armor</option>
            <option value="item">Item</option>
            <option value="consumable">Consumable</option>
            <option value="spellscroll">Spell Scroll</option>
          </SelectOptions>
        </Select>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
    </Modal>
  )
}

export default function BackstockIndex({
  backstockItems,
  items,
  backstockSettings,
}: {
  backstockItems: BackstockItem[]
  items: Item[]
  backstockSettings: BackstockSettings
}) {
  const hasItems = items.length > 0
  const [settings, setSettings] = useState<BackstockSettings>(backstockSettings ?? {})
  const [isPosting, setIsPosting] = useState(false)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [activeOperation, setActiveOperation] = useState<BotOperation | null>(null)
  const [updatingLineId, setUpdatingLineId] = useState<number | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [isItemMenuOpen, setIsItemMenuOpen] = useState(false)
  const [activeItemIndex, setActiveItemIndex] = useState(0)
  const itemInputRef = useRef<HTMLInputElement | null>(null)
  const maxVisibleBackstockItemResults = 60

  const { data, setData, post, processing } = useForm({
    item_id: items[0]?.id ?? 0,
    notes: '',
  })
  const deferredItemSearch = useDeferredValue(itemSearch)
  const indexedItems = useMemo(
    () => items.map((item) => ({
      item,
      label: buildBackstockAddItemLabel(item),
      searchText: [
        item.name,
        rarityLabels[item.rarity],
        item.type,
      ].filter(Boolean).join(' ').toLowerCase(),
    })),
    [items],
  )
  const selectedItem = useMemo(
    () => items.find((item) => item.id === data.item_id) ?? null,
    [items, data.item_id],
  )
  const selectedItemLabel = useMemo(
    () => selectedItem ? buildBackstockAddItemLabel(selectedItem) : '',
    [selectedItem],
  )
  const hasPendingItemSelection = itemSearch.trim().length > 0 && itemSearch.trim() !== selectedItemLabel
  const filteredItems = useMemo(() => {
    const query = deferredItemSearch.trim().toLowerCase()
    if (!query) return indexedItems
    return indexedItems.filter(({ searchText }) => searchText.includes(query))
  }, [indexedItems, deferredItemSearch])
  const visibleItems = useMemo(
    () => filteredItems.slice(0, maxVisibleBackstockItemResults),
    [filteredItems],
  )

  const groups = useMemo(() => buildGroups(backstockItems), [backstockItems])

  useEffect(() => {
    if (!isAddOpen) return
    const nextItem = items[0] ?? null
    setData('item_id', nextItem?.id ?? 0)
    setData('notes', '')
    setItemSearch(nextItem ? buildBackstockAddItemLabel(nextItem) : '')
    setIsItemMenuOpen(false)
    setActiveItemIndex(0)
  }, [isAddOpen, items, setData])

  useEffect(() => {
    if (!isItemMenuOpen) return
    setActiveItemIndex(0)
  }, [itemSearch, isItemMenuOpen])

  const applyItemSelection = (item: Item) => {
    setData('item_id', item.id)
    setItemSearch(buildBackstockAddItemLabel(item))
    setIsItemMenuOpen(false)
    setActiveItemIndex(0)
  }

  const getCsrfToken = useCallback(() => {
    if (typeof document === 'undefined') return ''
    const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
    return meta?.content ?? ''
  }, [])

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
        const response = await fetch(route('admin.backstock-settings.update'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        })

        const responseData = await response.json().catch(() => ({}))
        if (!response.ok) {
          toast.show(String(responseData?.error ?? 'Channel could not be saved.'), 'error')
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
    [getCsrfToken, isSavingChannel],
  )

  const handlePostBackstock = useCallback(async () => {
    if (isPosting) return
    if (!settings.post_channel_id) {
      toast.show('Select a posting channel first.', 'error')
      return
    }
    if (!window.confirm('Post the backstock to Discord now?')) {
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsPosting(true)
    try {
      const response = await fetch(route('admin.backstock.post'), {
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
        toast.show(String(payload?.error ?? 'Backstock could not be posted.'), 'error')
        return
      }

      const operation = (payload?.operation ?? null) as BotOperation | null
      if (!operation?.id) {
        toast.show('Backstock operation could not be started.', 'error')
        return
      }

      setActiveOperation(operation)
      toast.show('Backstock post started.', 'info')
    } catch {
      toast.show('Backstock could not be posted.', 'error')
    } finally {
      setIsPosting(false)
    }
  }, [getCsrfToken, isPosting, settings.post_channel_id])

  const handleAddItem = () => {
    if (!hasItems || processing) return
    if (!selectedItem || hasPendingItemSelection) {
      toast.show('Please select an item from the list before saving.', 'error')
      setIsItemMenuOpen(true)
      window.setTimeout(() => itemInputRef.current?.focus(), 0)
      return
    }
    post(route('admin.backstock-items.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsAddOpen(false)
        setData('notes', '')
        setItemSearch('')
        router.reload()
      },
      onError: (errors) => {
        const message = errors.notes || errors.item_id
        if (message) {
          toast.show(String(message), 'error')
        }
      },
    })
  }

  const handleRemove = (itemId: number) => {
    if (!window.confirm('Remove this item from backstock?')) {
      return
    }
    router.delete(route('admin.backstock-items.destroy', { backstockItem: itemId }), {
      preserveScroll: true,
    })
  }

  const destinationLabel = settings.post_channel_name ?? settings.post_channel_id ?? 'Not set'
  const destinationKind = settings.post_channel_id
    ? settings.post_channel_is_thread
      ? 'Thread'
      : 'Channel'
    : null
  const destinationText = `Destination: ${destinationKind ? `${destinationKind} ${destinationLabel}` : destinationLabel}`
  const hasPostDestination = Boolean(settings.post_channel_id)
  const canUpdatePostLine = Boolean(settings.last_post_channel_id)
  const operationRunning = !isTerminalBotOperation(activeOperation)
  const handleOperationCompleted = useCallback(() => {
    toast.show('Backstock posted to Discord.', 'info')
    setTimeout(() => {
      router.reload({ only: ['backstockSettings'] })
    }, 1200)
  }, [])
  const handleOperationFailed = useCallback((operation: BotOperation) => {
    toast.show(String(operation.error ?? 'Backstock operation failed.'), 'error')
  }, [])

  return (
    <AppLayout>
      <Head title="Backstock" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Backstock</h1>
            <p className="text-sm text-base-content/70">Manage items carried over from auctions.</p>
          </div>
        </section>

        <div className="rounded-box bg-base-100 shadow-md p-3">
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
                Items: {backstockItems.length}
              </span>
            </div>
            <Modal>
              <ModalTrigger>
                <Button size="sm" variant="outline" modifier="square" aria-label="Configure backstock">
                  <Settings size={16} />
                </Button>
              </ModalTrigger>
              <ModalTitle>Backstock settings</ModalTitle>
              <ModalContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-base-content/70">Posting destination</p>
                    <p className="text-sm font-semibold">{destinationText}</p>
                  </div>
                  <DiscordChannelPickerModal
                    title="Select posting channel"
                    description="Choose where the backstock should be posted."
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
                    <Send size={18} />
                    Select channel
                  </DiscordChannelPickerModal>
                </div>
              </ModalContent>
            </Modal>
          </div>
          <BotOperationProgress
            operation={activeOperation}
            onOperationChange={setActiveOperation}
            onCompleted={handleOperationCompleted}
            onFailed={handleOperationFailed}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} overflowVisible>
              <ModalTrigger>
                <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} disabled={!hasItems} className="gap-2">
                  <Plus size={16} />
                  Add item
                </Button>
              </ModalTrigger>
              <ModalTitle>Add item to backstock</ModalTitle>
              <ModalContent>
                <div className="relative w-full">
                  <label className="label" htmlFor="backstock-item-search">
                    Item
                  </label>
                  <input
                    id="backstock-item-search"
                    ref={itemInputRef}
                    className="input w-full"
                    placeholder={selectedItem ? buildBackstockAddItemLabel(selectedItem) : 'Search item...'}
                    value={itemSearch}
                    onChange={(event) => {
                      setItemSearch(event.target.value)
                      setIsItemMenuOpen(true)
                    }}
                    onFocus={() => setIsItemMenuOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsItemMenuOpen(false)
                        if (!itemSearch.trim() && selectedItem) {
                          setItemSearch(buildBackstockAddItemLabel(selectedItem))
                        }
                      }, 100)
                    }}
                    onKeyDown={(event) => {
                      if (!isItemMenuOpen) return
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setActiveItemIndex((current) => Math.min(current + 1, Math.max(visibleItems.length - 1, 0)))
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setActiveItemIndex((current) => Math.max(current - 1, 0))
                      } else if (event.key === 'Enter') {
                        event.preventDefault()
                        const nextItem = visibleItems[activeItemIndex]?.item
                        if (nextItem) {
                          applyItemSelection(nextItem)
                        }
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        setIsItemMenuOpen(false)
                      }
                    }}
                  />
                  {hasPendingItemSelection ? (
                    <div className="mt-2 text-xs text-error">
                      Select one of the matching items before saving.
                    </div>
                  ) : null}
                  {isItemMenuOpen ? (
                    <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-lg border border-base-200 bg-base-100 shadow-lg">
                      {visibleItems.map(({ item }, index) => (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                            index === activeItemIndex ? 'bg-base-200/70' : 'hover:bg-base-200/50',
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyItemSelection(item)}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-base-content/70">{renderIcon(item.type)}</span>
                            <div className="min-w-0">
                              <div className="truncate">{item.name}</div>
                              <div className={cn('text-xs', getRarityTextColor(item.rarity))}>{rarityLabels[item.rarity]}</div>
                            </div>
                          </div>
                          {item.id === data.item_id ? <CheckCircle2 size={14} className="text-primary/70" /> : null}
                        </button>
                      ))}
                      {itemSearch.trim() && filteredItems.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-base-content/50">No matching items found.</div>
                      ) : null}
                      {filteredItems.length > visibleItems.length ? (
                        <div className="border-t border-base-200 px-3 py-2 text-xs text-base-content/50">
                          Showing {visibleItems.length} of {filteredItems.length} items. Keep typing to narrow the list.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <Input value={data.notes} onChange={(event) => setData('notes', event.target.value)}>
                  Notes (optional)
                </Input>
              </ModalContent>
              <ModalAction onClick={handleAddItem} disabled={processing}>
                Add item
              </ModalAction>
            </Modal>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePostBackstock}
              disabled={isPosting || operationRunning || !settings.post_channel_id}
              className="gap-2"
            >
              <Send size={16} />
              Post backstock
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-sm text-base-content/70">No backstock items yet.</div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.rarity} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                  {rarityLabels[group.rarity] ?? group.rarity}
                </p>
                <List>
                  {group.items.map((entry) => {
                    const item = getBackstockItemSnapshot(entry)
                    const notes = entry.notes?.trim()
                    const itemName = notes ? `${item.name} - ${notes}` : item.name
                    const textColor = getRarityTextColor(item.rarity)
                    const isCustomListing = Boolean(entry.snapshot_custom)

                    const handleSnapshotRefresh = () => {
                      if (!window.confirm('Refresh this listing from the compendium?')) return

                      router.post(route('admin.backstock-items.snapshot.refresh', { backstockItem: entry.id }), {}, {
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

                    const handleUpdatePostedLine = async () => {
                      if (updatingLineId !== null || !canUpdatePostLine) return

                      const csrfToken = getCsrfToken()
                      if (!csrfToken) {
                        toast.show('Missing CSRF token.', 'error')
                        return
                      }

                      setUpdatingLineId(entry.id)
                      try {
                        const response = await fetch(route('admin.backstock-items.update-post-line', { backstockItem: entry.id }), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                          },
                          credentials: 'same-origin',
                          body: JSON.stringify({}),
                        })

                        const payload = await response.json().catch(() => ({}))
                        if (!response.ok) {
                          toast.show(String(payload?.error ?? 'Posted line could not be updated.'), 'error')
                          return
                        }

                        toast.show('Posted line updated.', 'info')
                      } catch {
                        toast.show('Posted line could not be updated.', 'error')
                      } finally {
                        setUpdatingLineId(null)
                      }
                    }

                    return (
                      <ListRow key={entry.id}>
                        <div className={cn(textColor)}>{renderIcon(item.type)}</div>
                        <div className={cn(textColor, 'text-xs sm:text-sm flex flex-col')}>
                          <span>
                            {item.url ? (
                              <a href={item.url} target="_blank" rel="noreferrer" className="link link-hover font-medium" title="Open item URL">
                                {itemName}
                              </a>
                            ) : (
                              itemName
                            )}
                            {isCustomListing ? (
                              <span className="ml-2 rounded-full border border-warning/40 px-2 py-0.5 text-[9px] uppercase text-warning">
                                Custom listing
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="max-w-24 font-mono text-xs">
                          {item.cost ? item.cost : <span className="text-error">No cost</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="xs"
                            variant="ghost"
                            modifier="square"
                            aria-label="Refresh listing"
                            title="Refresh listing from base item"
                            onClick={handleSnapshotRefresh}
                          >
                            <RotateCcw size={14} />
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            modifier="square"
                            aria-label="Update posted line"
                            title={canUpdatePostLine ? 'Update posted line in Discord' : 'Post backstock first'}
                            onClick={handleUpdatePostedLine}
                            disabled={!canUpdatePostLine || updatingLineId === entry.id}
                          >
                            <Send size={14} />
                          </Button>
                          <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
                          <BackstockItemSnapshotModal entry={entry} item={item} />
                          <Button
                            size="xs"
                            variant="ghost"
                            modifier="square"
                            aria-label="Remove from backstock"
                            color="error"
                            title="Delete backstock line"
                            onClick={() => handleRemove(entry.id)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </ListRow>
                    )
                  })}
                </List>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
