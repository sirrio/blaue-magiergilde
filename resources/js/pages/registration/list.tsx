import AppLayout from '@/layouts/app-layout'
import { Registration } from '@/types'
import { Head, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'

export default function RegistrationList({ registrations }: { registrations: Registration[] }) {
  return (
    <AppLayout>
      <Head title="Registrations" />
      <div className="container mx-auto max-w-4xl px-2 py-4 md:px-0">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Tier</th>
              <th>Discord</th>
              <th>Status</th>
              <th className="w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(r => (
              <tr key={r.id}>
                <td>{r.character_name}</td>
                <td>
                  <a href={r.character_url} className="link" target="_blank" rel="noopener noreferrer">
                    Sheet
                  </a>
                </td>
                <td>{r.tier}</td>
                <td>{r.discord_name}</td>
                <td className="capitalize">{r.status}</td>
                <td className="space-x-2">
                  {['pending', 'approved', 'declined'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      disabled={r.status === status}
                      onClick={() =>
                        router.put(route('registrations.update', r.id), { status })
                      }
                    >
                      {status}
                    </Button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}
