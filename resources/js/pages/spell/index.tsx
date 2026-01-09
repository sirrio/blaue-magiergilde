import { Card, CardBody, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import AppLayout from '@/layouts/app-layout'
import SpellRow from '@/pages/spell/spell-row'
import { Spell } from '@/types'
import { Deferred, Head, router } from '@inertiajs/react'
import { LoaderCircle } from 'lucide-react'
import React, { useState } from 'react'

interface FilterOption {
  label: string
  value: string
}

export default function Index({ spells }: { spells: Spell[] }) {
  const spellSchoolFilters: FilterOption[] = [
    { label: 'Abjuration', value: 'abjuration' },
    { label: 'Conjuration', value: 'conjuration' },
    { label: 'Divination', value: 'divination' },
    { label: 'Enchantment', value: 'enchantment' },
    { label: 'Evocation', value: 'evocation' },
    { label: 'Illusion', value: 'illusion' },
    { label: 'Necromancy', value: 'necromancy' },
    { label: 'Transmutation', value: 'transmutation' },
  ]

  const spellLevelFilters: FilterOption[] = [
    { label: 'Cantrip', value: '0' },
    ...Array.from({ length: 9 }, (_, i) => ({
      label: (i + 1).toString(),
      value: (i + 1).toString(),
    })),
  ]

  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const NAV_OPTIONS = { preserveState: true, preserveScroll: true }

  const navigateTo = (href: string) => {
    router.get(href, {}, NAV_OPTIONS)
  }

  const renderFilterOptions = (filterKey: string, filters: FilterOption[]) => {
    const buildHref = (filterValue: string | null): string =>
      route('spells.index', {
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
    navigateTo(route('spells.index', { ...currentQueryParams, search: value }))
  }

  return (
    <AppLayout>
      <Head title="Spells" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Spells</h1>
          <p className="text-sm text-base-content/70">Search the spell list by school or level.</p>
        </section>
        <Card className="card-xs">
          <CardBody>
            <CardContent>
              <Input type="search" placeholder="Search by name..." value={search} onChange={handleSearch}>
                Filter
              </Input>
              <div className="mt-1 filter">{renderFilterOptions('spell_school', spellSchoolFilters)}</div>
              <div className="mt-1 filter">{renderFilterOptions('spell_level', spellLevelFilters)}</div>
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
          data={['spells']}
        >
          <List>{spells?.map((spell) => <SpellRow key={spell.id} spell={spell} />)}</List>
        </Deferred>
      </div>
    </AppLayout>
  )
}
