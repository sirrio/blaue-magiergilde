import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'

export default function Impressum() {
  return (
    <AppLayout>
      <Head title="Impressum" />
      <div className="p-6 prose">
        <h1>Impressum</h1>
        <p>Blaue Magiergilde</p>
        <p>Example Street 1</p>
        <p>12345 Example City</p>
        <p>Email: info@example.com</p>
      </div>
    </AppLayout>
  )
}
