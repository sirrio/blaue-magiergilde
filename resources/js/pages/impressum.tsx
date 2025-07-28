import { Head } from '@inertiajs/react'
import LegalLinks from '@/components/legal-links'

export default function Impressum() {
  return (
    <>
      <Head title="Impressum" />
      <div className="min-h-screen bg-base-200 p-6">
        <div className="prose mx-auto">
          <h1>Impressum</h1>
          <p>Blaue Magiergilde</p>
          <p>Example Street 1</p>
          <p>12345 Example City</p>
          <p>Email: info@example.com</p>
        </div>
      </div>
      <LegalLinks />
    </>
  )
}
