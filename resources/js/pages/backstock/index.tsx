import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { BackstockItem, BackstockSettings, DiscordBackupChannel, Item } from '@/types'
import { Head, router, useForm } from '@inertiajs/react'
import { ExternalLink, FlaskRound, Plus, ScrollText, Send, Settings, Sword, Trash2 } from 'lucide-react'
import React, { useCallback, useMemo, useState, JSX } from 'react'

const rarityLabels: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
}

const rarityColors: Record<string, string> = {
  common: 'text-gray-700',
  uncommon: 'text-green-700',
  rare: 'text-blue-700',
  very_rare: 'text-purple-700',
}

const typeIcons: Record<string, JSX.Element> = {
  item: <Sword className="h-4 w-4" />,
  spellscroll: <ScrollText className="h-4 w-4" />,
  consumable: <FlaskRound className="h-4 w-4" />,
}

const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare']
const typeOrder = ['item', 'consumable', 'spellscroll']

const getRarityTextColor = (rarity: string): string => {
  return rarityColors[rarity] || ''
}

const renderIcon = (type: string): JSX.Element | null => {
  return typeIcons[type] || null
}

type BackstockGroup = {
  rarity: string
  items: BackstockItem[]
}

const buildGroups = (items: BackstockItem[]): BackstockGroup[] => {
  const byRarity = new Map<string, Map<string, BackstockItem[]>>()

  items.forEach((entry) => {
    const rarity = entry.item?.rarity ?? 'common'
    const type = entry.item?.type ?? 'item'
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
      entries.sort((a, b) => String(a.item?.name ?? '').localeCompare(String(b.item?.name ?? '')))
    })

    const orderedItems = typeOrder.flatMap((type) => byType.get(type) ?? [])
    if (orderedItems.length === 0) return
    groups.push({ rarity, items: orderedItems })
  })

  return groups
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

  const { data, setData, post, processing } = useForm({
    item_id: items[0]?.id ?? 0,
    notes: '',
  })

  const groups = useMemo(() => buildGroups(backstockItems), [backstockItems])

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
      } catch (error) {
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

      toast.show('Backstock post started.', 'info')
      router.reload({ only: ['backstockSettings'] })
    } catch (error) {
      toast.show('Backstock could not be posted.', 'error')
    } finally {
      setIsPosting(false)
    }
  }, [getCsrfToken, isPosting, settings.post_channel_id])

  const handleAddItem = () => {
    if (!hasItems || !data.item_id) {
      toast.show('Select an item first.', 'error')
      return
    }
    post(route('admin.backstock-items.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsAddOpen(false)
        setData('notes', '')
        router.reload({ preserveScroll: true, preserveState: true })
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
  const destinationText = destinationKind ? `${destinationKind}: ${destinationLabel}` : 'Destination not set'

  return (
    <AppLayout>
      <Head title="Backstock" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Backstock</h1>
            <p className="text-sm text-base-content/70">Manage items carried over from auctions.</p>
          </div>
          <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
            <ModalTrigger>
              <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} disabled={!hasItems}>
                <Plus size={16} className="mr-2" />
                Add item
              </Button>
            </ModalTrigger>
            <ModalTitle>Add item to backstock</ModalTitle>
            <ModalContent>
              <Select value={String(data.item_id)} onChange={(event) => setData('item_id', Number(event.target.value))}>
                <SelectLabel>Item</SelectLabel>
                <SelectOptions>
                  {hasItems ? (
                    items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    <option value={0}>No items available</option>
                  )}
                </SelectOptions>
              </Select>
              <Input value={data.notes} onChange={(event) => setData('notes', event.target.value)}>
                Notes (optional)
              </Input>
            </ModalContent>
            <ModalAction onClick={handleAddItem} disabled={processing}>
              Add item
            </ModalAction>
          </Modal>
        </section>

        <div className="rounded-box bg-base-100 shadow-md p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
              <span
                className={cn(
                  'rounded-full border px-2 py-1',
                  settings.post_channel_id ? 'border-base-200 text-base-content/70' : 'border-warning text-warning',
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
                    channelsRouteName="admin.backup.channels.refresh"
                    threadsRouteName="admin.backup.threads.refresh"
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePostBackstock}
              disabled={isPosting || !settings.post_channel_id}
            >
              <Send size={16} className="mr-2" />
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
                    const notes = entry.notes?.trim()
                    const itemName = notes ? `${entry.item.name} - ${notes}` : entry.item.name
                    const textColor = getRarityTextColor(entry.item.rarity)
                    return (
                      <ListRow key={entry.id}>
                        <div className={cn(textColor)}>{renderIcon(entry.item.type)}</div>
                        <div className={cn(textColor, 'text-xs sm:text-sm flex flex-col')}>
                          <span>{itemName}</span>
                        </div>
                        <div className="max-w-24 font-mono text-xs">
                          {entry.item.cost ? entry.item.cost : <span className="text-error">No cost</span>}
                        </div>
                        {entry.item.url ? (
                          <Button
                            as="a"
                            href={entry.item.url}
                            target="_blank"
                            size="xs"
                            variant="ghost"
                            modifier="square"
                            aria-label="Open item"
                          >
                            <ExternalLink size={14} />
                          </Button>
                        ) : null}
                        <Button
                          size="xs"
                          variant="ghost"
                          modifier="square"
                          aria-label="Remove from backstock"
                          onClick={() => handleRemove(entry.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
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
