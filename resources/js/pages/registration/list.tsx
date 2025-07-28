import AppLayout from '@/layouts/app-layout'
import { Registration } from '@/types'
import { Head } from '@inertiajs/react'

export default function RegistrationList({ registrations }: { registrations: Registration[] }) {
  return (
    <AppLayout>
      <Head title="Registrations" />
      <div className="container mx-auto max-w-2xl px-2 py-4 md:px-0">
        <table className="table">
          <thead>
            <tr>
              <th>Link</th>
              <th>Tier</th>
              <th>Approved</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(r => (
              <tr key={r.id}>
                <td>{r.link}</td>
                <td>{r.tier}</td>
                <td>{r.approved_at ? '✓' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}
