import { Card, CardBody, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import AppLayout from '@/layouts/app-layout'
import ItemRow from '@/pages/item/item-row'
import { Item } from '@/types'
import { Deferred, Head, router } from '@inertiajs/react'
import { LoaderCircle } from 'lucide-react'
import React, { useState } from 'react'

interface FilterOption {
  label: string
  value: string
}

export default function Index({ items }: { items: Item[] }) {
  const rarityFilters: FilterOption[] = [
    { label: 'Common', value: 'common' },
    { label: 'Uncommon', value: 'uncommon' },
    { label: 'Rare', value: 'rare' },
    { label: 'Very Rare', value: 'very_rare' },
  ]

  const typeFilters: FilterOption[] = [
    { label: 'Item', value: 'item' },
    { label: 'Consumable', value: 'consumable' },
    { label: 'Spell Scroll', value: 'spellscroll' },
  ]

  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const NAV_OPTIONS = { preserveState: true, preserveScroll: true }

  const navigateTo = (href: string) => {
    router.get(href, {}, NAV_OPTIONS)
  }

  const renderFilterOptions = (filterKey: string, filters: FilterOption[]) => {
    const buildHref = (filterValue: string | null): string =>
      route('items.index', {
        ...currentQueryParams,
        [filterKey]: filterValue,
      })

    return (
      <div className="filter">
        <input
          className="btn btn-xs filter-reset"
          type="radio"
          name={filterKey}
          aria-label="All"
          defaultChecked={!currentQueryParams[filterKey]}
          onClick={() => navigateTo(buildHref(null))}
        />
        {filters.map(({ label, value }) => (
          <input
            key={value}
            className="btn btn-xs"
            type="radio"
            name={filterKey}
            aria-label={label}
            defaultChecked={currentQueryParams[filterKey] === value}
            onClick={() => navigateTo(buildHref(value))}
          />
        ))}
      </div>
    )
  }

  const [search, setSearch] = useState(currentQueryParams.search || '')

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    navigateTo(route('items.index', { ...currentQueryParams, search: value }))
  }

  return (
    <AppLayout>
      <Head title="Items" />
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Items</h1>
          <p className="text-sm text-base-content/70">Browse and filter the guild inventory.</p>
        </section>
        <Card className="card-xs">
          <CardBody>
            <CardContent>
              <Input type="search" placeholder="Search by name..." value={search} onChange={handleSearch}>
                Filter
              </Input>
              <div className="mt-1 filter">{renderFilterOptions('rarity', rarityFilters)}</div>
              <div className="mt-1 filter">{renderFilterOptions('type', typeFilters)}</div>
            </CardContent>
          </CardBody>
        </Card>
        <Deferred
          fallback={
            <List>
              <ListRow>
                <LoaderCircle className="animate-spin" /> Loading...
              </ListRow>
            </List>
          }
          data={['items']}
        >
          <List>{items?.map((item) => <ItemRow key={item.id} item={item} />)}</List>
        </Deferred>
      </div>
    </AppLayout>
  )
}
