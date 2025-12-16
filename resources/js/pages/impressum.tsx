import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Head, Link } from '@inertiajs/react'
import type { ElementType } from 'react'

export default function Impressum() {
  const {
    VITE_IMPRESSUM_NAME,
    VITE_IMPRESSUM_STREET,
    VITE_IMPRESSUM_CITY,
    VITE_IMPRESSUM_EMAIL,
  } = import.meta.env

  return (
    <>
      <Head title="Impressum" />
      <div className={cn('relative min-h-screen overflow-hidden bg-[#070A12] text-white')} data-theme="dark">
        <div className="pointer-events-none absolute inset-0">
          <img src="/images/bg-dragon.webp" className="h-full w-full object-cover opacity-30" alt="" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#070A12]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_55%)]" />

        <div className="relative mx-auto max-w-4xl px-4 py-10 md:py-14">
          <Card className="w-full border border-white/10 bg-white/5 shadow-xl backdrop-blur">
            <CardBody className="prose prose-invert max-w-none">
              <CardTitle className="justify-center">
                <h1>Impressum</h1>
              </CardTitle>
              <h2 className="font-bold">Angaben gemõ▀ º 5 TMG (Telemediengesetz):</h2>
              <p>{VITE_IMPRESSUM_NAME}</p>
              <p>{VITE_IMPRESSUM_STREET}</p>
              <p>{VITE_IMPRESSUM_CITY}</p>
              <p>Deutschland</p>
              <p>
                Website-Betreiber: Diese Webseite wird von {VITE_IMPRESSUM_NAME} als Privatperson betrieben (kein
                kommerzielles Angebot).
              </p>
              <h2 className="font-bold">Kontakt:</h2>
              <p>E-Mail: {VITE_IMPRESSUM_EMAIL}</p>
              <h2 className="font-bold">Inhaltlich Verantwortlicher gemõ▀ º 18 Abs. 2 MStV:</h2>
              <p>{VITE_IMPRESSUM_NAME}</p>
              <h2 className="font-bold">Haftung f³r Inhalte</h2>
              <p>
                Als Diensteanbieter sind wir gemõ▀ º 7 Abs. 1 TMG f³r eigene Inhalte auf diesen Seiten nach den
                allgemeinen Gesetzen verantwortlich. Wir ³bernehmen jedoch keine Gewõhr f³r die Richtigkeit,
                Vollstõndigkeit und Aktualitõt der bereitgestellten Inhalte. Nach den ºº 8 bis 10 TMG sind wir als
                Diensteanbieter nicht verpflichtet, ³bermittelte oder gespeicherte fremde Informationen zu ³berwachen
                oder nach Umstõnden zu forschen, die auf eine rechtswidrige Tõtigkeit hinweisen. Verpflichtungen zur
                Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon
                unber³hrt. Eine diesbez³gliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
                Rechtsverletzung m÷glich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
                Inhalte umgehend entfernen.
              </p>
              <h2 className="font-bold">Haftung f³r externe Links</h2>
              <p>
                Unser Angebot enthõlt Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
                Deshalb k÷nnen wir f³r diese fremden Inhalte auch keine Gewõhr ³bernehmen. F³r die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Zum
                Zeitpunkt der Verlinkung wurden die verlinkten Seiten auf m÷gliche Rechtsverst÷▀e ³berpr³ft;
                rechtswidrige Inhalte waren zu diesem Zeitpunkt nicht erkennbar. Eine permanente inhaltliche Kontrolle
                der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
                Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
              </p>
              <h2 className="font-bold">Haftung f³r Nutzerinhalte</h2>
              <p>
                Soweit diese Website M÷glichkeiten zur Einstellung von eigenen Inhalten durch Nutzer (z.B. Kommentare,
                Beitrõge in Foren o.─.) bietet, sind f³r solche Nutzerinhalte ausschlie▀lich die jeweiligen Nutzer
                verantwortlich. Der Betreiber dieser Website ³bernimmt keine Haftung f³r die von Nutzern bereitgestellten
                Inhalte. Bei Bekanntwerden von rechtswidrigen oder gegen die guten Sitten versto▀enden Nutzerinhalten
                behalten wir uns vor, diese umgehend zu l÷schen.
              </p>
              <h2 className="font-bold">Urheberrecht</h2>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
                Urheberrecht. Beitrõge Dritter sind als solche gekennzeichnet. Die Vervielfõltigung, Bearbeitung,
                Verbreitung und <strong>jede Art der Verwertung au▀erhalb</strong> der Grenzen des Urheberrechts bed³rfen
                der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
                sind nur f³r den <strong>privaten, nicht kommerziellen Gebrauch</strong> gestattet. Sollten Sie auf eine
                Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden
                von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
              </p>
              <h2 className="font-bold">Attribution</h2>
              <p>
                Logo-Design von{' '}
                <a className="link" href="https://linktr.ee/lizzylizarts" target="_blank" rel="noopener noreferrer">
                  lizzylizarts
                </a>
                .
              </p>
              <p>
                Diese Webseite nutzt Open-Source-Software wie Laravel, React, InertiaJS, Tailwind&nbsp;CSS und Vite.
                Vielen Dank an alle Mitwirkenden dieser Projekte.
              </p>
              <Button as={Link as ElementType} href={route('home')} variant="outline" className="mt-6 border-white/15 bg-white/0 text-white hover:bg-white/10 hover:text-white">
                Zur³ck zur Startseite
              </Button>
            </CardBody>
          </Card>
          <LegalLinks variant="inline" className="mt-10 text-white/70" />
        </div>
      </div>
    </>
  )
}

