import { Button } from '@/components/ui/button'
import { List } from '@/components/ui/list'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import AppLayout from '@/layouts/app-layout'
import ItemRow from '@/pages/item/item-row'
import { Shop } from '@/types'
import { Head, router } from '@inertiajs/react'
import { format } from 'date-fns'
import { Store } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function Index({ shops }: { shops: Shop[] }) {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(shops[0] ?? null)

   
  useEffect(() => {
    setSelectedShop((prev) => {
      if (prev) {
        return shops.find((s) => s.id === prev.id) || null
      }
      return shops[0] ?? null
    })
  }, [shops, selectedShop?.id])

  const formatShopCreatedAt = (createdAt: string) => format(new Date(createdAt), "iiii dd MMM'.' yyyy ' - ' HH:mm")

  const onShopSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const shopId = Number(event.target.value)
    const newShop = shops.find((shop) => shop.id === shopId) || null
    setSelectedShop(newShop)
  }

  const handleCreateShop = (): void => {
    router.post(route('shops.store'), {}, { preserveState: false, preserveScroll: true })
  }

  return (
    <AppLayout>
      <Head title="Shop" />
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
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
        <List>
          {selectedShop?.shop_items.map((si) => (
            <ItemRow key={si.id} item={si.item} shopItem={si} />
          ))}
        </List>
      </div>
    </AppLayout>
  )
}
