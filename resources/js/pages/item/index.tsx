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
  const rarityLabelMap = Object.fromEntries(rarityFilters.map((entry) => [entry.value, entry.label]))
  const typeLabelMap = Object.fromEntries(typeFilters.map((entry) => [entry.value, entry.label]))

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

  const [search, setSearch] = useState(String(currentQueryParams.search ?? ''))

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    navigateTo(route('items.index', { ...currentQueryParams, search: value }))
  }

  const activeFilters = [
    search ? `Search: ${search}` : null,
    currentQueryParams.rarity
      ? `Rarity: ${rarityLabelMap[String(currentQueryParams.rarity)] ?? currentQueryParams.rarity}`
      : null,
    currentQueryParams.type
      ? `Type: ${typeLabelMap[String(currentQueryParams.type)] ?? currentQueryParams.type}`
      : null,
  ].filter(Boolean) as string[]
  const totalItems = items?.length ?? 0

  return (
    <AppLayout>
      <Head title="Items" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Items</h1>
          <p className="text-sm text-base-content/70">Browse and filter the guild inventory.</p>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase text-base-content/50">Filters</p>
              <h2 className="text-lg font-semibold">Inventory filters</h2>
              <p className="text-xs text-base-content/70">Refine the list by name, rarity, or type.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
              <span className="rounded-full border border-base-200 px-2 py-1">{totalItems} items</span>
              {activeFilters.length === 0 ? (
                <span className="text-base-content/50">No filters</span>
              ) : (
                activeFilters.map((filter) => (
                  <span key={filter} className="rounded-full border border-base-200 px-2 py-1">
                    {filter}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="mt-3">
            <Input type="search" placeholder="Search by name..." value={search} onChange={handleSearch}>
              Search
            </Input>
            <div className="mt-2 filter">{renderFilterOptions('rarity', rarityFilters)}</div>
            <div className="mt-2 filter">{renderFilterOptions('type', typeFilters)}</div>
          </div>
        </div>
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
