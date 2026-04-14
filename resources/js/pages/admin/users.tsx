import AppLayout from '@/layouts/app-layout'
import { Head, router } from '@inertiajs/react'
import { UserRoundCheck } from 'lucide-react'
import { useState } from 'react'

interface AdminUser {
  id: number
  name: string
  email: string | null
  discord_username: string | null
  discord_display_name: string | null
  avatar: string | null
  created_at: string
}

interface Props {
  users: AdminUser[]
}

export default function AdminUsersPage({ users }: Props) {
  const [search, setSearch] = useState('')
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null)

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.discord_username?.toLowerCase().includes(q) ||
      u.discord_display_name?.toLowerCase().includes(q)
    )
  })

  function impersonate(user: AdminUser) {
    setImpersonatingId(user.id)
    router.post(
      route('admin.impersonate.take', user.id),
      {},
      { onFinish: () => setImpersonatingId(null) },
    )
  }

  return (
    <AppLayout>
      <Head title="Benutzer" />
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="border-b border-base-200 pb-3">
          <h1 className="text-2xl font-bold">Benutzer</h1>
          <p className="text-xs text-base-content/70 sm:text-sm">Als Benutzer einloggen, um seine Sicht zu sehen.</p>
        </div>

        <input
          type="search"
          className="input input-bordered w-full max-w-sm"
          placeholder="Suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="overflow-x-auto rounded-box border border-base-200">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Discord</th>
                <th>E-Mail</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-base-content/50">
                    Keine Benutzer gefunden.
                  </td>
                </tr>
              )}
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="size-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-7 items-center justify-center rounded-full bg-base-300 text-xs font-bold text-base-content/60">
                          {user.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="text-sm text-base-content/70">
                    {user.discord_display_name ?? user.discord_username ?? <span className="italic opacity-50">—</span>}
                  </td>
                  <td className="text-sm text-base-content/70">{user.email ?? <span className="italic opacity-50">—</span>}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-ghost btn-xs gap-1.5"
                      disabled={impersonatingId === user.id}
                      onClick={() => impersonate(user)}
                    >
                      <UserRoundCheck size={14} />
                      {impersonatingId === user.id ? 'Bitte warten…' : 'Impersonieren'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
