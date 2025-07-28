import AppLayout from '@/layouts/app-layout'
import { Head, useForm } from '@inertiajs/react'
import type { RegisteredPlayer, RegisteredCharacter } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  players: RegisteredPlayer[]
}

function PlayerCard({ player }: { player: RegisteredPlayer }) {
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
              <li key={char.id}>
                <span className="font-medium">{char.name}</span>{' '}
                <span className="text-base-content/70">({char.tier.toUpperCase()})</span>{' '}-{' '}
                <a href={char.url} target="_blank" rel="noreferrer" className="link">
                  dndbeyond
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Input value={charForm.data.name} onChange={(e) => charForm.setData('name', e.target.value)}>
            Character Name
          </Input>
          <Input value={charForm.data.tier} onChange={(e) => charForm.setData('tier', e.target.value as RegisteredCharacter['tier'])}>
            Tier
          </Input>
          <Input value={charForm.data.url} onChange={(e) => charForm.setData('url', e.target.value)}>
            URL
          </Input>
          <Button size="xs" onClick={submit}>Add</Button>
        </div>
      </div>
    </div>
  )
}

export default function RegisteredCharacters({ players }: Props) {
  const playerForm = useForm({ name: '' })

  const handlePlayerSubmit = () => {
    playerForm.post(route('registered-players.store'), {
      preserveScroll: true,
      onSuccess: () => playerForm.reset(),
    })
  }
  return (
    <AppLayout>
      <Head title="Registered Characters" />
      <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Registered Characters</h1>
        <div className="flex gap-2">
          <Input value={playerForm.data.name} onChange={(e) => playerForm.setData('name', e.target.value)}>Name</Input>
          <Button size="sm" onClick={handlePlayerSubmit}>Add Player</Button>
        </div>
        <div className="space-y-4">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
