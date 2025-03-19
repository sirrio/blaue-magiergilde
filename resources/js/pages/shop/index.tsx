import { Button } from '@/components/ui/button'
import { List } from '@/components/ui/list'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import Toast from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import ItemRow from '@/pages/item/item-row'
import { Shop } from '@/types'
import { Head, router } from '@inertiajs/react'
import { format } from 'date-fns'
import { Store } from 'lucide-react'
import React, { useState } from 'react'

export default function Index({ shops }: { shops: Shop[] }) {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(shops[0] ?? null)

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
      <Toast />
      <div className="container mx-auto max-w-2xl px-2 py-4 md:px-0">
        <div className="join mb-6 flex items-end">
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
        <List>{selectedShop?.items.map((item) => <ItemRow key={item.id} item={item} />)}</List>
      </div>
    </AppLayout>
  )
}
