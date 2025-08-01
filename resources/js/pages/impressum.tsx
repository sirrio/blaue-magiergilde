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
    VITE_IMPRESSUM_PHONE,
    VITE_IMPRESSUM_FAX,
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
              <h2>Angaben gemäß § 5 DDG</h2>
              <p>{VITE_IMPRESSUM_NAME}</p>
              <p>{VITE_IMPRESSUM_STREET}</p>
              <p>{VITE_IMPRESSUM_CITY}</p>
              <h2>Vertreten durch:</h2>
              <p>{VITE_IMPRESSUM_NAME}</p>
              <h2>Kontakt:</h2>
              <p>Telefon: {VITE_IMPRESSUM_PHONE}</p>
              <p>Fax: {VITE_IMPRESSUM_FAX}</p>
              <p>E-Mail: {VITE_IMPRESSUM_EMAIL}</p>
              <h2>Umsatzsteuer-ID:</h2>
              <p>Umsatzsteuer-Identifikationsnummer gemäß §27a Umsatzsteuergesetz: Musterustid.</p>
              <h2>Wirtschafts-ID:</h2>
              <p>Musterwirtschaftsid</p>
              <h2>Aufsichtsbehörde:</h2>
              <p>Musteraufsicht Musterstadt</p>
              <h2>Haftungsausschluss:</h2>
              <h3>Haftung für Inhalte</h3>
              <p>
                Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet,
                übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
                Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
              <h3>Haftung für Links</h3>
              <p>
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
                Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
                Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
              </p>
              <h3>Urheberrecht</h3>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet.
                Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
              </p>
              <h3>Datenschutz</h3>
              <p>
                Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder eMail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger Basis.
                Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte weitergegeben. Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann.
                Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich. Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten durch Dritte zur Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit ausdrücklich widersprochen.
                Die Betreiber der Seiten behalten sich ausdrücklich rechtliche Schritte im Falle der unverlangten Zusendung von Werbeinformationen, etwa durch Spam-Mails, vor.
              </p>
              <h2>Attribution</h2>
              <p>
                Logo-Design von{' '}
                <a href="https://linktr.ee/lizzylizarts" target="_blank" rel="noopener noreferrer">
                  lizzylizarts
                </a>
                .
              </p>
              <p>
                Diese Webseite nutzt Open-Source-Software wie Laravel, React, InertiaJS, Tailwind&nbsp;CSS und Vite.
                Vielen Dank an alle Mitwirkenden dieser Projekte.
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
