import { Link } from '@inertiajs/react'

export default function LegalLinks() {
  return (
    <div className="fixed bottom-2 right-2 space-x-2 text-sm" role="contentinfo">
      <Link href={route('impressum')} className="link">
        Impressum
      </Link>
      <Link href={route('datenschutz')} className="link">
        Datenschutz
      </Link>
    </div>
  )
}
