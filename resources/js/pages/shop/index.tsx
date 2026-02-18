import { Button } from '@/components/ui/button'
import { List } from '@/components/ui/list'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import ItemRow from '@/pages/item/item-row'
import { cn } from '@/lib/utils'
import { DiscordBackupChannel, Item, PageProps, Shop, ShopItem, ShopOperation, ShopSettings } from '@/types'
import { Head, router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { Plus, RotateCcw, Send, Settings } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

export default function Index({ shops, shopSettings }: { shops: Shop[]; shopSettings: ShopSettings }) {
  const stepLabels: Record<string, string> = {
    pending: 'Queued',
    posting_to_discord: 'Posting to Discord',
    rotating_pointers: 'Updating Current/Draft',
    completed: 'Completed',
  }
  const stepsByAction: Record<string, string[]> = {
    publish_draft: ['pending', 'posting_to_discord', 'rotating_pointers', 'completed'],
    update_current_post: ['pending', 'posting_to_discord', 'completed'],
  }
  const isTerminalOperation = (operation: ShopOperation | null) =>
    operation ? operation.status === 'completed' || operation.status === 'failed' : true
  const resolveFallbackShop = useCallback(
    (availableShops: Shop[], preferredShopId?: number | null): Shop | null => {
      if (!availableShops.length) return null
      if (preferredShopId) {
        const preferred = availableShops.find((shop) => shop.id === preferredShopId)
        if (preferred) return preferred
      }
      return availableShops[0] ?? null
    },
    [],
  )
  const [selectedShop, setSelectedShop] = useState<Shop | null>(
    resolveFallbackShop(shops, shopSettings?.draft_shop_id ?? null),
  )
  const [isPosting, setIsPosting] = useState(false)
  const [isUpdatingPost, setIsUpdatingPost] = useState(false)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [activeOperation, setActiveOperation] = useState<ShopOperation | null>(null)
  const [settings, setSettings] = useState<ShopSettings>(shopSettings ?? {})
  const [autoPostEnabled, setAutoPostEnabled] = useState(Boolean(shopSettings?.auto_post_enabled))
  const [autoPostWeekday, setAutoPostWeekday] = useState<number>(shopSettings?.auto_post_weekday ?? 0)
  const [autoPostTime, setAutoPostTime] = useState<string>(shopSettings?.auto_post_time ?? '09:00')
  const { auth } = usePage<PageProps>().props
  const isAdmin = Boolean(auth?.user?.is_admin)

  useEffect(() => {
    setSelectedShop(resolveFallbackShop(shops, shopSettings?.draft_shop_id ?? null))
  }, [resolveFallbackShop, shops, shopSettings?.draft_shop_id])

  useEffect(() => {
    setSettings(shopSettings ?? {})
    setAutoPostEnabled(Boolean(shopSettings?.auto_post_enabled))
    setAutoPostWeekday(shopSettings?.auto_post_weekday ?? 0)
    setAutoPostTime(shopSettings?.auto_post_time ?? '09:00')
  }, [shopSettings])

  useEffect(() => {
    if (!activeOperation || isTerminalOperation(activeOperation)) {
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let reloadTimer: ReturnType<typeof setTimeout> | null = null

    const pollOperation = async () => {
      try {
        const response = await fetch(route('admin.shops.operations.show', activeOperation.id), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (!cancelled) {
            setActiveOperation((current) => (current ? { ...current, status: 'failed', error: String(payload?.error ?? 'Operation polling failed.') } : null))
            toast.show(String(payload?.error ?? 'Could not read operation status.'), 'error')
          }

          return
        }

        const nextOperation = (payload?.operation ?? null) as ShopOperation | null
        if (!nextOperation || cancelled) {
          return
        }

        setActiveOperation(nextOperation)

        if (nextOperation.status === 'completed') {
          if (nextOperation.action === 'publish_draft') {
            const newCurrentShopId = Number(nextOperation.current_shop_id || nextOperation.result_shop_id || 0) || null
            const newDraftShopId = Number(nextOperation.draft_shop_id || 0) || null
            setSettings((current) => ({
              ...current,
              current_shop_id: newCurrentShopId ?? current.current_shop_id ?? null,
              draft_shop_id: newDraftShopId ?? current.draft_shop_id ?? null,
            }))
            toast.show(
              `Published draft #${nextOperation.result_shop_id ?? 'n/a'}. Current: #${newCurrentShopId ?? 'n/a'}, Draft: #${newDraftShopId ?? 'n/a'}.`,
              'info',
            )
            if (!cancelled) {
              reloadTimer = setTimeout(() => {
                router.reload({ only: ['shops', 'shopSettings'] })
              }, 1500)
            }
          } else {
            toast.show('Current shop post updated.', 'info')
            if (!cancelled) {
              reloadTimer = setTimeout(() => {
                router.reload({ only: ['shopSettings'] })
              }, 1500)
            }
          }

          return
        }

        if (nextOperation.status === 'failed') {
          toast.show(String(nextOperation.error ?? 'Shop operation failed.'), 'error')
          return
        }
      } catch {
        if (!cancelled) {
          setActiveOperation((current) => (current ? { ...current, status: 'failed', error: 'Could not read operation status.' } : null))
          toast.show('Could not read operation status.', 'error')
        }

        return
      }

      if (!cancelled) {
        timer = setTimeout(pollOperation, 1000)
      }
    }

    timer = setTimeout(pollOperation, 600)

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
      if (reloadTimer) {
        clearTimeout(reloadTimer)
      }
    }
  }, [activeOperation])

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
      name: shopItem.item_name ?? item.name ?? 'Unknown item',
      url: shopItem.item_url ?? item.url ?? '',
      cost: shopItem.item_cost ?? item.cost ?? '',
      rarity: (shopItem.item_rarity ?? item.rarity ?? 'common') as Item['rarity'],
      type: (shopItem.item_type ?? item.type ?? 'item') as Item['type'],
      pick_count: item.pick_count ?? 0,
    }
  }

  const handleCreateShop = (): void => {
    if (!window.confirm('Roll a new draft shop?')) {
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
      } catch {
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
    } catch {
      toast.show('Schedule could not be saved.', 'error')
    } finally {
      setIsSavingSchedule(false)
    }
  }, [autoPostEnabled, autoPostTime, autoPostWeekday, getCsrfToken, isSavingSchedule])

  const handlePostShop = useCallback(async () => {
    if (isPosting) return
    if (!settings.post_channel_id) {
      toast.show('Select a posting channel first.', 'error')
      return
    }
    if (!settings.draft_shop_id) {
      toast.show('No draft shop available.', 'error')
      return
    }
    if (!window.confirm('Publish the draft shop to Discord now? This promotes it to current and rolls a new draft.')) {
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsPosting(true)
    try {
      const response = await fetch(route('admin.shops.post'), {
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

      const operation = (payload?.operation ?? null) as ShopOperation | null
      if (!operation?.id) {
        toast.show('Shop operation could not be started.', 'error')
        return
      }

      setActiveOperation(operation)
      toast.show('Publishing draft started.', 'info')
    } catch {
      toast.show('Shop could not be posted.', 'error')
    } finally {
      setIsPosting(false)
    }
  }, [getCsrfToken, isPosting, settings.draft_shop_id, settings.post_channel_id])

  const handleUpdatePost = useCallback(async () => {
    if (isUpdatingPost) return
    if (!settings.last_post_channel_id) {
      toast.show('No previously posted shop to update.', 'error')
      return
    }
    if (!settings.current_shop_id) {
      toast.show('No current shop available.', 'error')
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
      const response = await fetch(route('admin.shops.update-post'), {
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

      const operation = (payload?.operation ?? null) as ShopOperation | null
      if (!operation?.id) {
        toast.show('Shop operation could not be started.', 'error')
        return
      }

      setActiveOperation(operation)
      toast.show('Updating current post started.', 'info')
    } catch {
      toast.show('Shop could not be updated.', 'error')
    } finally {
      setIsUpdatingPost(false)
    }
  }, [getCsrfToken, isUpdatingPost, settings.current_shop_id, settings.last_post_channel_id])

  const destinationLabel = settings.post_channel_name ?? settings.post_channel_id ?? 'Not set'
  const destinationKind = settings.post_channel_id
    ? settings.post_channel_is_thread
      ? 'Thread'
      : 'Channel'
    : null
  const destinationText = `Destination: ${destinationKind ? `${destinationKind} ${destinationLabel}` : destinationLabel}`
  const hasPostDestination = Boolean(settings.post_channel_id)
  const currentShopId = settings.current_shop_id ?? null
  const draftShopId = settings.draft_shop_id ?? null
  const operationRunning = !isTerminalOperation(activeOperation)
  const operationSteps = activeOperation ? (stepsByAction[activeOperation.action] ?? ['pending', 'completed']) : []
  const operationStep = activeOperation
    ? activeOperation.status === 'failed'
      ? (activeOperation.step ?? 'pending')
      : (activeOperation.step ?? activeOperation.status)
    : null
  const operationStepIndex = operationStep ? operationSteps.indexOf(operationStep) : -1
  const resolvedOperationStepIndex = operationStepIndex < 0 ? 0 : operationStepIndex
  const operationProgress = activeOperation
    ? activeOperation.status === 'completed'
      ? 100
      : Math.round(((resolvedOperationStepIndex + 1) / Math.max(1, operationSteps.length)) * 100)
    : 0
  const operationPendingTooLong = (() => {
    if (!activeOperation || activeOperation.status !== 'pending') {
      return false
    }

    if (!activeOperation.created_at) {
      return false
    }

    const createdAtMs = new Date(activeOperation.created_at).getTime()
    if (!Number.isFinite(createdAtMs)) {
      return false
    }

    return Date.now() - createdAtMs > 10_000
  })()
  const canUpdatePost = Boolean(settings.current_shop_id && settings.last_post_channel_id)

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
                  {`Shop ID ${String(shop.id).padStart(3, '0')} - ${formatShopCreatedAt(shop.created_at)}${
                    shop.id === draftShopId ? ' [Draft]' : shop.id === currentShopId ? ' [Current]' : ''
                  }`}
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
                  Current: {currentShopId ? `#${String(currentShopId).padStart(3, '0')}` : 'n/a'}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  Draft: {draftShopId ? `#${String(draftShopId).padStart(3, '0')}` : 'n/a'}
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
            {activeOperation ? (
              <div className="mt-3 rounded-box border border-base-200 bg-base-50/40 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/70">
                  <span className="font-semibold">Bot action</span>
                  <span className="rounded-full border border-base-200 px-2 py-0.5">
                    #{String(activeOperation.id).padStart(3, '0')}
                  </span>
                  <span className="rounded-full border border-base-200 px-2 py-0.5">
                    {activeOperation.action === 'publish_draft' ? 'Publish draft' : 'Update current post'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 capitalize',
                      activeOperation.status === 'completed'
                        ? 'border-success/40 text-success'
                        : activeOperation.status === 'failed'
                          ? 'border-error/40 text-error'
                          : 'border-info/40 text-info',
                    )}
                  >
                    {activeOperation.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-base-content/70">
                    <span>{stepLabels[operationStep ?? 'pending'] ?? String(operationStep ?? 'pending').replaceAll('_', ' ')}</span>
                    <span>{operationProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-base-200">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        activeOperation.status === 'failed' ? 'bg-error' : activeOperation.status === 'completed' ? 'bg-success' : 'bg-info',
                      )}
                      style={{ width: `${operationProgress}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {operationSteps.map((step, index) => {
                    const isCompleted = activeOperation.status === 'completed' ? index <= resolvedOperationStepIndex : index < resolvedOperationStepIndex
                    const isCurrent = activeOperation.status !== 'completed' && activeOperation.status !== 'failed' && index === resolvedOperationStepIndex

                    return (
                      <span
                        key={`${activeOperation.id}-${step}`}
                        className={cn(
                          'rounded-full border px-2 py-1 text-[11px]',
                          isCompleted
                            ? 'border-success/40 bg-success/10 text-success'
                            : isCurrent
                              ? 'border-info/40 bg-info/10 text-info'
                              : 'border-base-200 text-base-content/60',
                        )}
                      >
                        {stepLabels[step] ?? step.replaceAll('_', ' ')}
                      </span>
                    )
                  })}
                  {activeOperation.status === 'failed' ? (
                    <span className="rounded-full border border-error/40 bg-error/10 px-2 py-1 text-[11px] text-error">
                      Failed
                    </span>
                  ) : null}
                </div>
                {activeOperation.error ? (
                  <p className="mt-2 text-xs text-error">{activeOperation.error}</p>
                ) : null}
                {operationPendingTooLong ? (
                  <p className="mt-2 text-xs text-warning">
                    Operation is still queued. If this persists, start the queue worker (`php artisan queue:work`).
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePostShop}
                disabled={isPosting || operationRunning || !settings.post_channel_id || !settings.draft_shop_id}
                className="gap-2"
              >
                <Send size={16} />
                Publish draft
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdatePost}
                disabled={isUpdatingPost || operationRunning || !canUpdatePost}
                className="gap-2"
              >
                <RotateCcw size={16} />
                Update current post
              </Button>
              <Button size="sm" variant="outline" onClick={handleCreateShop} className="gap-2" disabled={operationRunning}>
                <Plus size={16} />
                Roll new draft
              </Button>
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
