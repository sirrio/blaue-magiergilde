import { Button } from '@/components/ui/button'
import { List } from '@/components/ui/list'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import ItemRow from '@/pages/item/item-row'
import { DiscordBackupChannel, PageProps, Shop, ShopSettings } from '@/types'
import { Head, router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { Send, Store } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

export default function Index({ shops, shopSettings }: { shops: Shop[]; shopSettings: ShopSettings }) {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(shops[0] ?? null)
  const [isPosting, setIsPosting] = useState(false)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [postChannel, setPostChannel] = useState<ShopSettings>(shopSettings ?? {})
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
    setPostChannel(shopSettings ?? {})
  }, [shopSettings])

  const formatShopCreatedAt = (createdAt: string) => format(new Date(createdAt), "iiii dd MMM'.' yyyy ' - ' HH:mm")

  const onShopSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const shopId = Number(event.target.value)
    const newShop = shops.find((shop) => shop.id === shopId) || null
    setSelectedShop(newShop)
  }

  const handleCreateShop = (): void => {
    router.post(route('shops.store'), {}, { preserveState: false, preserveScroll: true })
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
        const response = await fetch(route('shop-settings.update'), {
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

        setPostChannel({
          post_channel_id: selection.id,
          post_channel_name: selection.name,
          post_channel_type: selection.type,
          post_channel_guild_id: selection.guild_id,
          post_channel_is_thread: selection.is_thread,
        })
        toast.show('Posting channel saved.', 'info')
      } catch (error) {
        toast.show('Channel could not be saved.', 'error')
      } finally {
        setIsSavingChannel(false)
      }
    },
    [getCsrfToken, isSavingChannel],
  )

  const handlePostShop = useCallback(async () => {
    if (!selectedShop) {
      toast.show('Select a shop first.', 'error')
      return
    }
    if (isPosting) return
    if (!postChannel.post_channel_id) {
      toast.show('Select a posting channel first.', 'error')
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsPosting(true)
    try {
      const response = await fetch(route('shops.post', selectedShop.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ channel_id: postChannel.post_channel_id }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Shop could not be posted.'), 'error')
        return
      }

      toast.show('Shop post started.', 'info')
    } catch (error) {
      toast.show('Shop could not be posted.', 'error')
    } finally {
      setIsPosting(false)
    }
  }, [getCsrfToken, isPosting, postChannel.post_channel_id, selectedShop])

  return (
    <AppLayout>
      <Head title="Shop" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Shop</h1>
          <p className="text-sm text-base-content/70">Roll new shops and review the current inventory.</p>
        </section>
        <div className="join flex items-end">
          <Select className="join-item w-full" value={selectedShop?.id || ''} onChange={onShopSelectChange}>
            <SelectLabel>Shops</SelectLabel>
            <SelectOptions>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {`Shop ID ${String(shop.id).padStart(3, '0')} - ${formatShopCreatedAt(shop.created_at)}`}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <Button onClick={handleCreateShop} color={'warning'} className="join-item">
            <Store size={'18'}></Store>
            Roll a new shop
          </Button>
        </div>
        {isAdmin ? (
          <div className="rounded-box border border-base-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-base-content/70">Posting channel</p>
                <p className="text-sm font-semibold">
                  {postChannel.post_channel_name ?? postChannel.post_channel_id ?? 'No channel selected'}
                </p>
              </div>
              <DiscordChannelPickerModal
                title="Select posting channel"
                description="Choose where the shop should be posted."
                confirmLabel="Save channel"
                includeThreads
                includeArchivedThreads={false}
                includePrivateThreads={false}
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
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePostShop}
                disabled={!selectedShop || isPosting || !postChannel.post_channel_id}
              >
                <Send size={16} className="mr-2" />
                Post shop
              </Button>
            </div>
          </div>
        ) : null}
        <List>
          {selectedShop?.shop_items.map((si) => (
            <ItemRow key={si.id} item={si.item} shopItem={si} />
          ))}
        </List>
      </div>
    </AppLayout>
  )
}
