import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import type { RegisteredCharacter, User } from '@/types'

interface Props {
  users: Array<User & { registered_characters: RegisteredCharacter[] }>
}

export default function RegisteredCharacters({ users }: Props) {
  return (
    <AppLayout>
      <Head title="Registered Characters" />
      <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Registered Characters</h1>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="card card-bordered bg-base-100">
              <div className="card-body">
                <h2 className="card-title text-lg">{user.name}</h2>
                {user.registered_characters.length === 0 ? (
                  <p className="text-base-content/70 text-sm">No registered characters</p>
                ) : (
                  <ul className="ml-4 list-disc space-y-1">
                    {user.registered_characters.map((char) => (
                      <li key={char.id}>
                        <span className="font-medium">{char.name}</span>{' '}
                        <span className="text-base-content/70">({char.tier.toUpperCase()})</span>{' '}
                        -{' '}
                        <a href={char.url} target="_blank" rel="noreferrer" className="link">
                          dndbeyond
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
