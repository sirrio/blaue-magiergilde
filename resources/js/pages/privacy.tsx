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
            This site uses cookies solely for technical functions such as
            maintaining sessions. We do not employ tracking or advertising
            cookies.
          </p>
          <p>
            Any personal data you provide is processed only as required to
            operate the site and to deliver the services you request. We do not
            monetize, sell, or otherwise use your data for marketing purposes.
          </p>
          <p>
            Data is retained only as long as necessary for these technical
            reasons.
          </p>
        </div>
      </div>
      <LegalLinks />
    </>
  )
}
