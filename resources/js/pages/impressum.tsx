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
      <div className={cn('hero bg-base-300 relative min-h-screen overflow-hidden')} data-theme={'light'}>
        <div className="absolute inset-0 grayscale-[60%] hue-rotate-[3.5rad]">
          <img src="/images/bg-dragon.webp" className="h-full md:hidden object-cover" alt="" />
          <img src="/images/bg-dragon-torn.webp" className="h-full w-full object-cover hidden md:block" alt="" />
        </div>
        <div className="hero-content relative z-10 flex-col" data-theme={'dark'}>
          <Card className="w-full max-w-2xl prose text-center">
            <CardBody>
              <CardTitle className="justify-center">
                <h1>Impressum</h1>
              </CardTitle>
              <h2 className="font-bold">Angaben gemäß § 5 TMG (Telemediengesetz):</h2>
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
              <h2 className="font-bold">Inhaltlich Verantwortlicher gemäß § 18 Abs. 2 MStV:</h2>
              <p>{VITE_IMPRESSUM_NAME}</p>
              <h2 className="font-bold">Haftung für Inhalte</h2>
              <p>
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
                allgemeinen Gesetzen verantwortlich. Wir übernehmen jedoch keine Gewähr für die Richtigkeit,
                Vollständigkeit und Aktualität der bereitgestellten Inhalte. Nach den §§ 8 bis 10 TMG sind wir als
                Diensteanbieter nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
                oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur
                Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon
                unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
                Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
                Inhalte umgehend entfernen.
              </p>
              <h2 className="font-bold">Haftung für externe Links</h2>
              <p>
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
                Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Zum
                Zeitpunkt der Verlinkung wurden die verlinkten Seiten auf mögliche Rechtsverstöße überprüft;
                rechtswidrige Inhalte waren zu diesem Zeitpunkt nicht erkennbar. Eine permanente inhaltliche Kontrolle
                der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
                Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
              </p>
              <h2 className="font-bold">Haftung für Nutzerinhalte</h2>
              <p>
                Soweit diese Website Möglichkeiten zur Einstellung von eigenen Inhalten durch Nutzer (z.B. Kommentare,
                Beiträge in Foren o.Ä.) bietet, sind für solche Nutzerinhalte ausschließlich die jeweiligen Nutzer
                verantwortlich. Der Betreiber dieser Website übernimmt keine Haftung für die von Nutzern bereitgestellten
                Inhalte. Bei Bekanntwerden von rechtswidrigen oder gegen die guten Sitten verstoßenden Nutzerinhalten
                behalten wir uns vor, diese umgehend zu löschen.
              </p>
              <h2 className="font-bold">Urheberrecht</h2>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
                Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die Vervielfältigung, Bearbeitung,
                Verbreitung und <strong>jede Art der Verwertung außerhalb</strong> der Grenzen des Urheberrechts bedürfen
                der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
                sind nur für den <strong>privaten, nicht kommerziellen Gebrauch</strong> gestattet. Sollten Sie auf eine
                Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden
                von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
              </p>
              <Button as={Link as ElementType} href={route('home')} color="primary" className="mt-4">
                Zurück zur Startseite
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
      <LegalLinks />
    </>
  )
}
