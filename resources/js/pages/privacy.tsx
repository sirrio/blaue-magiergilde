import { Head } from '@inertiajs/react'
import LegalLinks from '@/components/legal-links'

export default function Privacy() {
  return (
    <>
      <Head title="Privacy Policy" />
      <div className="min-h-screen bg-base-200 p-6">
        <div className="prose mx-auto">
          <h1>Privacy Policy</h1>
          <p>
            We do not collect personal data beyond what is necessary for the
            operation of this site.
          </p>
        </div>
      </div>
      <LegalLinks />
    </>
  )
}
