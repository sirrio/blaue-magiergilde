import LogoTier from '@/components/logo-tier'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { Registration } from '@/types'
import { Head, router } from '@inertiajs/react'
import { CheckCircle2, Clock, ExternalLink, StickyNote, XCircle } from 'lucide-react'
import React, { useState } from 'react'
import UpdateRegistrationModal from './update-registration-modal'

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
              <Input type="search" placeholder="Search by name..." value={search} onChange={handleSearch}>
                Search
              </Input>
            </CardContent>
          </CardBody>
        </Card>
        <List>
          {registrations.map((r) => (
            <ListRow key={r.id}>
              <div className="flex w-6 justify-center">
                <LogoTier tier={r.tier} width={16} />
              </div>
              <div className="flex-1 truncate text-sm justify-center">

                <a href={r.character_url} className="flex items-center link" target="_blank" rel="noopener noreferrer">
                  <img src="/images/dnd-beyond-logo.svg" className="h-8 w-8" alt="sheet-link" />
                  <span className="ml-2">{r.character_name}</span>
                </a>
              </div>
              <div className="flex w-8 justify-center">

              </div>
              <div className="w-32 truncate text-right text-xs">{r.discord_name}</div>
              <div className="flex w-4 justify-center">
                <a href={`https://discord.com/users/${r.discord_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <ExternalLink size={16} />
                </a>
              </div>
              <div className="flex w-4 justify-center">
                <div className="tooltip" data-tip={r.notes || 'No notes'}>
                  <StickyNote size={16} className={cn('text-base-content', !r.notes && 'text-base-content/30')} />
                </div>
              </div>
              <div className="flex w-4 justify-center">
                <UpdateRegistrationModal registration={r} />
              </div>
              <div className="bg-base-content/20 mx-2 h-6 w-px" />
              <div className="flex flex-1 w-44 items-center justify-end gap-2">
                <div
                  className={cn(
                    'flex items-center text-xs',
                    r.status === 'approved' && 'text-success',
                    r.status === 'declined' && 'text-error',
                    r.status === 'pending' && 'text-warning',
                  )}
                >
                  {r.status === 'approved' && <CheckCircle2 size={16} />}
                  {r.status === 'declined' && <XCircle size={16} />}
                  {r.status === 'pending' && <Clock size={16} />}
                  <span className="ml-1 capitalize">{r.status}</span>
                </div>
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
