import LegalLinks from '@/components/legal-links'
import { Head } from '@inertiajs/react'

export default function Impressum() {
  const {
    VITE_IMPRESSUM_NAME,
    VITE_IMPRESSUM_STREET,
    VITE_IMPRESSUM_CITY,
  } = import.meta.env

  return (
    <>
      <Head title="Impressum" />
      <div className="bg-base-200 min-h-screen p-6">
        <div className="prose mx-auto">
          <h1>Impressum</h1>
          <p>{VITE_IMPRESSUM_NAME}</p>
          <p>{VITE_IMPRESSUM_STREET}</p>
          <p>{VITE_IMPRESSUM_CITY}</p>
          <p>Diese Seite ist ein privates Projekt. Alle Entwicklung und Inhalte wurden von mir erstellt. Alle Rechte vorbehalten.</p>
          <p>
            Logo-Design von{' '}
            <a href="https://linktr.ee/lizzylizarts" target="_blank" rel="noopener noreferrer">
              lizzylizarts
            </a>
            .
          </p>
          <p>
            Diese Webseite nutzt Open-Source-Software wie Laravel, React, InertiaJS, Tailwind&nbsp;CSS und Vite. Vielen Dank an alle Mitwirkenden
            dieser Projekte.
          </p>
        </div>
      </div>
      <LegalLinks />
    </>
  )
}
