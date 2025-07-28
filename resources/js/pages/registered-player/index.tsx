import AppLayout from '@/layouts/app-layout'
import { Head, useForm, usePage } from '@inertiajs/react'
import type { RegisteredPlayer, RegisteredCharacter, PageProps } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import LogoTier from '@/components/logo-tier'
import { useState } from 'react'

interface Props {
  players: RegisteredPlayer[]
}

const AddPlayerModal = () => {
  const form = useForm({ name: '' })

  const submit = () => {
    form.post(route('registered-players.store'), {
      preserveScroll: true,
      onSuccess: () => form.reset(),
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        <Button size="sm" variant="outline">
          Add Player
        </Button>
      </ModalTrigger>
      <ModalTitle>Add player</ModalTitle>
      <ModalContent>
        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)}>
          Name
        </Input>
      </ModalContent>
      <ModalAction onClick={submit}>Save</ModalAction>
    </Modal>
  )
}

function PlayerCard({ player }: { player: RegisteredPlayer }) {
  const { tiers } = usePage<PageProps>().props
  const charForm = useForm({ name: '', tier: 'bt' as RegisteredCharacter['tier'], url: '' })

  const submit = () => {
    charForm.post(route('registered-players.characters.store', { registered_player: player.id }), {
      preserveScroll: true,
      onSuccess: () => charForm.reset(),
    })
  }

  return (
    <div className="card card-bordered bg-base-100">
      <div className="card-body space-y-2">
        <h2 className="card-title text-lg">{player.name}</h2>
        {player.registered_characters.length === 0 ? (
          <p className="text-base-content/70 text-sm">No registered characters</p>
        ) : (
          <ul className="ml-4 list-disc space-y-1">
            {player.registered_characters.map((char) => (
              <li key={char.id} className="flex items-center gap-2">
                <span className="font-medium">{char.name}</span>
                <LogoTier tier={char.tier} width={14} />
                <a href={char.url} target="_blank" rel="noreferrer" className="link flex items-center">
                  <img src="/images/dnd-beyond-logo.svg" className="w-4" alt="dndbeyond" />
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end pt-2">
          <Modal>
            <ModalTrigger>
              <Button size="xs" variant="outline" modifier="square">
                +
              </Button>
            </ModalTrigger>
            <ModalTitle>Add character</ModalTitle>
            <ModalContent>
              <Input value={charForm.data.name} onChange={(e) => charForm.setData('name', e.target.value)}>
                Character Name
              </Input>
              <Select value={charForm.data.tier} onChange={(e) => charForm.setData('tier', e.target.value as RegisteredCharacter['tier'])}>
                <SelectLabel>Tier</SelectLabel>
                <SelectOptions>
                  {Object.entries(tiers).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
              <Input value={charForm.data.url} onChange={(e) => charForm.setData('url', e.target.value)}>
                URL
              </Input>
            </ModalContent>
            <ModalAction onClick={submit}>Save</ModalAction>
          </Modal>
        </div>
      </div>
    </div>
  )
}

export default function RegisteredCharacters({ players }: Props) {
  const [search, setSearch] = useState('')


  const searchMatch = (text: string) => text.toLowerCase().includes(search.toLowerCase())

  const filteredPlayers = players
    .map((p) => ({
      ...p,
      registered_characters: p.registered_characters.filter((c) => searchMatch(c.name)),
    }))
    .filter((p) => search === '' || searchMatch(p.name) || p.registered_characters.length > 0)
  return (
    <AppLayout>
      <Head title="Players" />
      <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Players</h1>
        <div className="flex flex-wrap gap-2 items-end">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players"
          >
            Search
          </Input>
          <AddPlayerModal />
        </div>
        <div className="space-y-4">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
