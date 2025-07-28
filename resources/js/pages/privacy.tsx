import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'

export default function Privacy() {
  return (
    <AppLayout>
      <Head title="Privacy Policy" />
      <div className="p-6 prose">
        <h1>Privacy Policy</h1>
        <p>
          We do not collect personal data beyond what is necessary for the
          operation of this site.
        </p>
      </div>
    </AppLayout>
  )
}
