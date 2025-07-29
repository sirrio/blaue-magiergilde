import AppLayout from '@/layouts/app-layout'
import { Registration } from '@/types'
import { Head, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import LogoTier from '@/components/logo-tier'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import React, { useState } from 'react'

export default function RegistrationList({ registrations }: { registrations: Registration[] }) {
  const currentQueryParams = route().params as Record<string, string | number | undefined>
  const NAV_OPTIONS = { preserveState: true, preserveScroll: true }

  const navigateTo = (href: string) => {
    router.get(href, {}, NAV_OPTIONS)
  }

  const [search, setSearch] = useState(currentQueryParams.search || '')

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    navigateTo(route('registrations.index', { ...currentQueryParams, search: value }))
  }

  return (
    <AppLayout>
      <Head title="Registrations" />
      <div className="container mx-auto max-w-4xl px-2 py-4 md:px-0">
        <Card className="card-xs mb-6">
          <CardBody>
            <CardContent>
              <Input
                type="search"
                placeholder="Search by name..."
                value={search}
                onChange={handleSearch}
              >
                Search
              </Input>
            </CardContent>
          </CardBody>
        </Card>
        <List>
          {registrations.map((r) => (
            <ListRow key={r.id}>
              <h3>{r.character_name}</h3>
              <a href={r.character_url} className="link text-xs" target="_blank" rel="noopener noreferrer">
                Sheet
              </a>
              <div className="text-xs">
                <LogoTier tier={r.tier} width={16} />
              </div>
              <div className="text-xs">{r.discord_name}</div>
              <div className="text-xs">{r.notes}</div>
              <div
                className={cn(
                  'flex items-center text-xs',
                  r.status === 'approved' && 'text-success',
                  r.status === 'declined' && 'text-error',
                  r.status === 'pending' && 'text-warning'
                )}
              >
                {r.status === 'approved' && <CheckCircle2 size={16} />}
                {r.status === 'declined' && <XCircle size={16} />}
                {r.status === 'pending' && <Clock size={16} />}
                <span className="ml-1 capitalize">{r.status}</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="xs"
                  modifier="square"
                  variant="ghost"
                  color="warning"
                  disabled={r.status === 'pending'}
                  onClick={() => router.put(route('registrations.update', r.id), { status: 'pending' })}
                >
                  <Clock size={14} />
                </Button>
                <Button
                  size="xs"
                  modifier="square"
                  variant="ghost"
                  color="success"
                  disabled={r.status === 'approved'}
                  onClick={() => router.put(route('registrations.update', r.id), { status: 'approved' })}
                >
                  <CheckCircle2 size={14} />
                </Button>
                <Button
                  size="xs"
                  modifier="square"
                  variant="ghost"
                  color="error"
                  disabled={r.status === 'declined'}
                  onClick={() => router.put(route('registrations.update', r.id), { status: 'declined' })}
                >
                  <XCircle size={14} />
                </Button>
              </div>
            </ListRow>
          ))}
        </List>
      </div>
    </AppLayout>
  )
}
