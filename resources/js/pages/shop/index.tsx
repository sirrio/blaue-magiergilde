import { Button } from '@/components/ui/button'
import { ActionMenu } from '@/components/ui/action-menu'
import { List } from '@/components/ui/list'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import ItemRow from '@/pages/item/item-row'
import { cn } from '@/lib/utils'
import { DiscordBackupChannel, Item, PageProps, Shop, ShopItem, ShopSettings } from '@/types'
import { Head, router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { Send, Settings } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

export default function Index({ shops, shopSettings }: { shops: Shop[]; shopSettings: ShopSettings }) {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(shops[0] ?? null)
  const [isPosting, setIsPosting] = useState(false)
  const [isUpdatingPost, setIsUpdatingPost] = useState(false)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [settings, setSettings] = useState<ShopSettings>(shopSettings ?? {})
  const [autoPostEnabled, setAutoPostEnabled] = useState(Boolean(shopSettings?.auto_post_enabled))
  const [autoPostWeekday, setAutoPostWeekday] = useState<number>(shopSettings?.auto_post_weekday ?? 0)
  const [autoPostTime, setAutoPostTime] = useState<string>(shopSettings?.auto_post_time ?? '09:00')
  const { auth } = usePage<PageProps>().props
  const isAdmin = Boolean(auth?.user?.is_admin)

  useEffect(() => {
    setSelectedShop((prev) => {
      if (prev) {
        return shops.find((s) => s.id === prev.id) || null
      }
      return shops[0] ?? null
    })
  }, [shops, selectedShop?.id])

  useEffect(() => {
    setSettings(shopSettings ?? {})
    setAutoPostEnabled(Boolean(shopSettings?.auto_post_enabled))
    setAutoPostWeekday(shopSettings?.auto_post_weekday ?? 0)
    setAutoPostTime(shopSettings?.auto_post_time ?? '09:00')
  }, [shopSettings])

  const formatShopCreatedAt = (createdAt: string) => format(new Date(createdAt), "iiii dd MMM'.' yyyy ' - ' HH:mm")

  const onShopSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const shopId = Number(event.target.value)
    const newShop = shops.find((shop) => shop.id === shopId) || null
    setSelectedShop(newShop)
  }

  const getShopItemSnapshot = (shopItem: ShopItem): Item => {
    const item = shopItem.item ?? ({} as Item)
    return {
      id: item.id ?? 0,
      name: item.name ?? shopItem.item_name ?? 'Unknown item',
      url: item.url ?? shopItem.item_url ?? '',
      cost: item.cost ?? shopItem.item_cost ?? '',
      rarity: (item.rarity ?? shopItem.item_rarity ?? 'common') as Item['rarity'],
      type: (item.type ?? shopItem.item_type ?? 'item') as Item['type'],
      pick_count: item.pick_count ?? 0,
    }
  }

  const handleCreateShop = (): void => {
    if (!window.confirm('Roll a new shop?')) {
      return
    }
    router.post(route('admin.shops.store'), {}, { preserveState: false, preserveScroll: true })
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
        const response = await fetch(route('admin.shop-settings.update'), {
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
      } catch (error) {
        toast.show('Channel could not be saved.', 'error')
      } finally {
        setIsSavingChannel(false)
      }
    },
    [getCsrfToken, isSavingChannel],
  )

  const handleScheduleSave = useCallback(async () => {
    if (isSavingSchedule) return
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsSavingSchedule(true)
    const payload = {
      auto_post_enabled: autoPostEnabled,
      auto_post_weekday: autoPostWeekday,
      auto_post_time: autoPostTime,
    }

    try {
      const response = await fetch(route('admin.shop-settings.update'), {
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
        toast.show(String(data?.error ?? 'Schedule could not be saved.'), 'error')
        return
      }

      setSettings((current) => ({
        ...current,
        ...(data?.shop_settings ?? payload),
      }))
      toast.show('Schedule saved.', 'info')
    } catch (error) {
      toast.show('Schedule could not be saved.', 'error')
    } finally {
      setIsSavingSchedule(false)
    }
  }, [autoPostEnabled, autoPostTime, autoPostWeekday, getCsrfToken, isSavingSchedule])

  const handlePostShop = useCallback(async () => {
    if (!selectedShop) {
      toast.show('Select a shop first.', 'error')
      return
    }
    if (isPosting) return
    if (!settings.post_channel_id) {
      toast.show('Select a posting channel first.', 'error')
      return
    }
    if (!window.confirm('Post this shop to Discord now?')) {
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsPosting(true)
    try {
      const response = await fetch(route('admin.shops.post', selectedShop.id), {
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
        toast.show(String(payload?.error ?? 'Shop could not be posted.'), 'error')
        return
      }

      toast.show('Shop post started.', 'info')
      router.reload({ only: ['shopSettings'] })
    } catch (error) {
      toast.show('Shop could not be posted.', 'error')
    } finally {
      setIsPosting(false)
    }
  }, [getCsrfToken, isPosting, selectedShop, settings.post_channel_id])

  const handleUpdatePost = useCallback(async () => {
    if (!selectedShop) {
      toast.show('Select a shop first.', 'error')
      return
    }
    if (isUpdatingPost) return
    if (!settings.last_post_channel_id) {
      toast.show('No previously posted shop to update.', 'error')
      return
    }
    if (!window.confirm('Update the posted shop in Discord?')) {
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsUpdatingPost(true)
    try {
      const response = await fetch(route('admin.shops.update-post', selectedShop.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Shop could not be updated.'), 'error')
        return
      }

      toast.show('Shop updated.', 'info')
      router.reload({ only: ['shopSettings'] })
    } catch (error) {
      toast.show('Shop could not be updated.', 'error')
    } finally {
      setIsUpdatingPost(false)
    }
  }, [getCsrfToken, isUpdatingPost, selectedShop, settings.last_post_channel_id])

  const destinationLabel = settings.post_channel_name ?? settings.post_channel_id ?? 'Not set'
  const destinationKind = settings.post_channel_id
    ? settings.post_channel_is_thread
      ? 'Thread'
      : 'Channel'
    : null
  const destinationText = destinationKind ? `${destinationKind}: ${destinationLabel}` : 'Destination not set'
  const hasPostDestination = Boolean(settings.post_channel_id)
  const canUpdatePost = Boolean(settings.last_post_channel_id)

  const weekdayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ]
  const savedAutoPostEnabled = Boolean(settings.auto_post_enabled)
  const savedWeekday = settings.auto_post_weekday ?? 0
  const savedTime = settings.auto_post_time ?? '09:00'
  const weekdayLabel = weekdayOptions.find((option) => option.value === savedWeekday)?.label ?? 'Sunday'
  const autoPostLabel = savedAutoPostEnabled ? `Auto post: ${weekdayLabel} ${savedTime}` : 'Auto post: Off'
  return (
    <AppLayout>
      <Head title="Shop" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Shop</h1>
            <p className="text-sm text-base-content/70">Roll new shops and review the current inventory.</p>
          </div>
        </section>
        <div>
          <Select className="w-full" value={selectedShop?.id || ''} onChange={onShopSelectChange}>
            <SelectLabel>Shops</SelectLabel>
            <SelectOptions>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {`Shop ID ${String(shop.id).padStart(3, '0')} - ${formatShopCreatedAt(shop.created_at)}`}
                </option>
              ))}
            </SelectOptions>
          </Select>
        </div>
        {isAdmin ? (
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
                  Items: {selectedShop?.shop_items.length ?? 0}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  {autoPostLabel}
                </span>
              </div>
              <Modal>
                <ModalTrigger>
                  <Button size="sm" variant="outline" modifier="square" aria-label="Configure shop">
                    <Settings size={16} />
                  </Button>
                </ModalTrigger>
                <ModalTitle>Shop settings</ModalTitle>
                <ModalContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-base-content/70">Posting destination</p>
                      <p className="text-sm font-semibold">{destinationText}</p>
                    </div>
                    <DiscordChannelPickerModal
                      title="Select posting channel"
                      description="Choose where the shop should be posted."
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
                    <div className="space-y-2 border-t border-base-200 pt-3">
                      <p className="text-xs text-base-content/70">Weekly auto post</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={autoPostEnabled}
                          onChange={(event) => setAutoPostEnabled(event.target.checked)}
                        />
                        Enable weekly auto post
                      </label>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <select
                          className="select select-sm"
                          value={autoPostWeekday}
                          onChange={(event) => setAutoPostWeekday(Number(event.target.value))}
                        >
                          {weekdayOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="time"
                          className="input input-sm"
                          value={autoPostTime}
                          onChange={(event) => setAutoPostTime(event.target.value)}
                        />
                        <Button size="sm" variant="outline" onClick={handleScheduleSave} disabled={isSavingSchedule}>
                          Save schedule
                        </Button>
                      </div>
                      <p className="text-[11px] text-base-content/60">
                        Uses Europe/Berlin time.
                      </p>
                    </div>
                  </div>
                </ModalContent>
              </Modal>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePostShop}
                disabled={!selectedShop || isPosting || !settings.post_channel_id}
              >
                <Send size={16} className="mr-2" />
                Post shop
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdatePost}
                disabled={!selectedShop || isUpdatingPost || !canUpdatePost}
              >
                Update shop
              </Button>
              <ActionMenu
                items={[
                  {
                    label: 'Roll a new shop',
                    onSelect: handleCreateShop,
                  },
                ]}
              />
            </div>
          </div>
        ) : null}
        <List>
          {selectedShop?.shop_items.map((si) => (
            <ItemRow key={si.id} item={getShopItemSnapshot(si)} shopItem={si} />
          ))}
        </List>
      </div>
    </AppLayout>
  )
}
