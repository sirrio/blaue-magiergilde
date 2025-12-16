import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Head, Link } from '@inertiajs/react'
import type { ElementType } from 'react'

export default function Datenschutz() {
  const {
    VITE_IMPRESSUM_NAME,
    VITE_IMPRESSUM_STREET,
    VITE_IMPRESSUM_CITY,
    VITE_IMPRESSUM_EMAIL,
  } = import.meta.env

  return (
    <>
      <Head title="Datenschutzerklärung" />
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
                <h1>Datenschutzerklärung</h1>
              </CardTitle>
              <h2 className="font-bold">Allgemeine Hinweise</h2>
              <p>
                Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert Sie
                über die Art, den Umfang und Zweck der Erhebung und Verwendung personenbezogener Daten auf unserer
                Website. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen
                Datenschutzvorschriften (insbesondere DSGVO) sowie dieser Datenschutzerklärung.
              </p>
              <p>
                Bitte beachten Sie, dass Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail)
                Sicherheitslücken aufweisen kann. Ein vollumfänglicher Schutz der Daten vor dem Zugriff durch Dritte
                ist nicht möglich.
              </p>
              <h2 className="font-bold">Verantwortliche Stelle</h2>
              <p>{VITE_IMPRESSUM_NAME}</p>
              <p>{VITE_IMPRESSUM_STREET}</p>
              <p>{VITE_IMPRESSUM_CITY}</p>
              <p>E-Mail: {VITE_IMPRESSUM_EMAIL}</p>
              <p>
                Als privater Websitebetreiber sind wir nicht verpflichtet, einen Datenschutzbeauftragten zu benennen.
                Bei Fragen zum Datenschutz können Sie sich jedoch jederzeit an die obige Kontaktadresse wenden.
              </p>
              <h2 className="font-bold">Hosting und Server-Log-Dateien</h2>
              <p>
                Unsere Website wird bei einem externen Dienstleister (Hosting-Provider) gehostet: <strong>DigitalOcean,
                LLC</strong>, Region Frankfurt (Datacenter FR1 in Deutschland). Personenbezogene Daten, die auf dieser
                Website erfasst werden, werden auf den Servern von DigitalOcean gespeichert. DigitalOcean handelt bei der
                Datenverarbeitung in unserem Auftrag (Auftragsverarbeitung). Wir haben mit dem Hoster einen Vertrag zur
                Auftragsverarbeitung gemäß Art. 28 DSGVO geschlossen. Dieser Vertrag stellt sicher, dass DigitalOcean die
                Daten unserer Websitebesucher nur nach unseren Weisungen und in Einklang mit den geltenden
                Datenschutzgesetzen verarbeitet. DigitalOcean ist ein US-amerikanisches Unternehmen; wir haben durch
                geeignete Garantien (insbesondere EU-Standardvertragsklauseln) dafür gesorgt, dass ein dem europäischen
                Datenschutzniveau entsprechendes Schutzniveau gewährleistet ist.
              </p>
              <p>
                Beim Aufruf unserer Website übermittelt Ihr Browser automatisch Informationen an den Server unseres
                Hosters. Diese Informationen werden in sogenannten Server-Log-Dateien temporär gespeichert. Die Logfiles
                enthalten z.B. folgende Daten:
              </p>
              <ul>
                <li>Ihre IP-Adresse (in anonymisierter Form, sofern möglich)</li>
                <li>Datum und Uhrzeit des Zugriffs</li>
                <li>Name und URL der abgerufenen Datei (angeforderte Seite)</li>
                <li>Referrer-URL (die zuvor besuchte Seite)</li>
                <li>Verwendeter Browser und ggf. Betriebssystem Ihres Geräts</li>
              </ul>
              <p>
                Diese Daten sind nicht direkt bestimmten Personen zuordenbar und dienen ausschließlich der
                Sicherstellung eines reibungslosen Verbindungsaufbaus der Website, der Systemsicherheit und -stabilität
                sowie administrativen Zwecken (z.B. Auswertung von technischen Fehlern). Eine Zusammenführung dieser
                Daten mit anderen Datenquellen wird nicht vorgenommen. Die Log-Daten werden in der Regel nach kurzer Zeit
                automatisiert gelöscht (spätestens nach 7 bis 14 Tagen), sofern keine weitere Aufbewahrung zu
                Beweiszwecken erforderlich ist.
              </p>
              <p>
                Die Verarbeitung der vorgenannten Zugriffsdaten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
                Unser berechtigtes Interesse folgt aus den genannten Zwecken zur Datenerhebung (Websitebetrieb,
                IT-Sicherheit und Fehlermanagement).
              </p>
              <h2 className="font-bold">Einsatz von Cookies</h2>
              <p>
                Unsere Website verwendet ausschließlich technisch notwendige Cookies, die für den Betrieb und die
                grundlegende Funktionalität der Seite erforderlich sind. Wir setzen keine Cookies zu Analyse-, Tracking-
                oder Werbezwecken ein.
              </p>
              <p>
                Bei den von uns eingesetzten Cookies handelt es sich z.B. um Session-Cookies, die eine eindeutige Kennung
                (Session-ID) enthalten. Ggf. nutzt unsere Seite zudem ein Cookie zur Gewährleistung der Sicherheit (z.B.
                ein CSRF-Token-Cookie), um Formular-Eingaben vor missbräuchlichen Angriffen zu schützen. Auch dieses
                Cookie ist technisch notwendig und enthält keine personenbezogenen Profile.
              </p>
              <p>
                Diese Session-Cookies sind notwendig, um Ihnen bestimmte Funktionen bereitzustellen (z.B. Login und
                Navigation) und werden nach Ende Ihres Besuchs automatisch gelöscht (Sitzungsende).
              </p>
              <p>
                Sie können Ihren Browser so einstellen, dass er Sie über das Setzen von Cookies informiert, Cookies nur
                im Einzelfall erlaubt oder die Annahme von Cookies für bestimmte Fälle oder generell ausschließt. Bitte
                beachten Sie jedoch, dass die Funktionalität dieser Website eingeschränkt sein kann, wenn Sie keine
                Cookies zulassen.
              </p>
              <p>
                Für den Einsatz technisch notwendiger Cookies ist nach § 25 Abs. 2 TTDSG keine Einwilligung erforderlich.
                Die Verarbeitung erfolgt insoweit auf Basis unseres berechtigten Interesses gemäß Art. 6 Abs. 1 lit. f
                DSGVO, da die Cookies für die Bereitstellung der von Ihnen angeforderten Dienste unbedingt erforderlich
                sind.
              </p>
              <h2 className="font-bold">Kontaktaufnahme per E-Mail</h2>
              <p>
                Auf dieser Website gibt es kein Kontaktformular. Wenn Sie uns kontaktieren möchten, nutzen Sie bitte die
                bereitgestellte E-Mail-Adresse.
              </p>
              <p>
                Wenn Sie uns über die bereitgestellte E-Mail-Adresse ( {VITE_IMPRESSUM_EMAIL} ) kontaktieren, werden die
                von Ihnen mitgeteilten Daten (z.B. Ihre E-Mail-Adresse und der Inhalt Ihrer Nachricht sowie evtl. weitere
                von Ihnen übermittelte Kontaktinformationen) zum Zweck der Bearbeitung Ihrer Anfrage und für eventuelle
                Anschlussfragen bei uns gespeichert und verarbeitet. Diese Daten geben wir nicht ohne Ihre Einwilligung
                weiter und verwenden sie ausschließlich zur Kommunikation mit Ihnen.
              </p>
              <p>
                Die Verarbeitung dieser Daten erfolgt auf Basis von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse –
                nämlich die Bearbeitung Ihrer Anfrage). Wenn Sie mit uns Kontakt aufnehmen, können Sie davon ausgehen,
                dass die Verarbeitung der übermittelten Daten in Ihrem Interesse liegt, um Ihr Anliegen zu beantworten.
                Ihre Daten aus der E-Mail-Anfrage werden von uns gelöscht, sobald die jeweilige Konversation mit Ihnen
                beendet ist und der Zweck der Speicherung entfällt. Gesetzliche Aufbewahrungspflichten bleiben
                unberührt.
              </p>
              <h2 className="font-bold">Registrierung und Login über Discord</h2>
              <p>
                Unsere Website bietet Ihnen ggf. die Möglichkeit, sich für bestimmte Bereiche anzumelden. Dies erfolgt
                als privates, nicht öffentliches Angebot vorrangig über einen Login mit Ihrem Discord-Account
                (Single-Sign-On). Wenn Sie den "Login mit Discord" nutzen, werden Sie auf die Plattform Discord
                (betrieben durch Discord Inc., 444 De Haro Street, San Francisco, CA 94107, USA) weitergeleitet. Dort
                können Sie sich mit Ihren Discord-Zugangsdaten authentifizieren. Bei diesem Vorgang erhalten wir von
                Discord bestimmte Informationen aus Ihrem Discord-Profil, insbesondere Ihren Discord-Benutzernamen, Ihre
                einmalige Discord-ID-Nummer und ggf. Ihre mit Discord verknüpfte E-Mail-Adresse (abhängig von den
                Berechtigungen, die Sie beim Login bestätigen). Wir nutzen diese Daten, um ein Benutzerkonto für Sie auf
                unserer Website einzurichten bzw. Ihr Login zu verifizieren. Ohne diese Daten ist eine Anmeldung über
                Discord nicht möglich.
              </p>
              <p>
                Die Kommunikation zwischen unserer Website und Discord erfolgt über eine verschlüsselte Verbindung. Bitte
                beachten Sie, dass bei Nutzung der Discord-Anmeldung zunächst eine Verbindung zu den Servern von Discord
                hergestellt wird. Dabei gelten die Datenschutzbestimmungen von Discord. Weitere Informationen dazu finden
                Sie in der <a className="link" href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">Datenschutzerklärung von Discord</a>.
              </p>
              <p>
                Die Verarbeitung Ihrer Daten im Rahmen des Discord-Logins erfolgt auf Grundlage Ihrer Einwilligung (Art.
                6 Abs. 1 lit. a DSGVO), die Sie durch das freiwillige Nutzen der "Login mit Discord"-Funktion erteilen.
                Sie können diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie uns z.B. eine
                Nachricht senden und die Löschung Ihres Benutzerkontos verlangen. In diesem Fall werden wir Ihre im
                Zusammenhang mit dem Discord-Login gespeicherten personenbezogenen Daten umgehend löschen, sofern keine
                gesetzlichen Aufbewahrungspflichten dem entgegenstehen.
              </p>
              <p>
                Alle über das Benutzerkonto ausgetauschten oder von Ihnen eingegebenen Inhalte unterliegen ebenfalls den
                Bestimmungen dieser Datenschutzerklärung. Bitte stellen Sie keine sensiblen personenbezogenen Daten über
                Ihr Benutzerkonto ein, die nicht unbedingt notwendig sind.
              </p>
              <h2 className="font-bold">Keine weiteren Drittanbieterdienste</h2>
              <p>
                Wir verwenden keine Analysetools wie Google Analytics oder ähnliche Tracking-Dienste. Es werden keine
                Social-Media-Plugins (Facebook-Like-Button o.Ä.) und keine extern eingebetteten Inhalte von Drittanbietern
                (z.B. Videos von YouTube, Karten von Google Maps oder Webfonts von Google Fonts) auf unserer Website
                eingesetzt. Dadurch werden beim Besuch unserer Website keine Daten ungewollt an Dritte übermittelt.
              </p>
              <p>
                Auch Content Delivery Networks (CDN) kommen bei uns nicht zum Einsatz. Alle Ressourcen (z.B. CSS- und
                JavaScript-Dateien oder Bilder) werden direkt von unserem eigenen Server geladen, der sich bei dem oben
                genannten Hosting-Provider in Deutschland befindet.
              </p>
              <p>
                Wir versenden keine Newsletter oder Werbe-E-Mails. Sie erhalten E-Mails von uns nur im Rahmen von
                direkten Anfragen oder im Zusammenhang mit der Nutzung Ihres Benutzerkontos.
              </p>
              <h2 className="font-bold">Sicherheit Ihrer Daten</h2>
              <p>
                Diese Website nutzt aus Gründen der Sicherheit und zum Schutz der Übertragung vertraulicher Inhalte eine
                SSL- bzw. TLS-Verschlüsselung. Das erkennen Sie an der "https://"-Adresszeile Ihres Browsers und dem
                Schloss-Symbol in der Browserzeile. Wenn die SSL- bzw. TLS-Verschlüsselung aktiv ist, können die Daten,
                die Sie an uns übermitteln, nicht von Dritten mitgelesen werden.
              </p>
              <p>
                Wir treffen außerdem angemessene technische und organisatorische Maßnahmen, um Ihre Daten vor Verlust,
                Missbrauch oder unbefugtem Zugriff zu schützen. Bitte beachten Sie jedoch, dass kein elektronisches
                Übertragungssystem vollkommen sicher ist. Wir werden unsere Sicherheitsmaßnahmen entsprechend der
                technologischen Entwicklung fortlaufend verbessern.
              </p>
              <h2 className="font-bold">Ihre Rechte als betroffene Person</h2>
              <ul>
                <li>Recht auf Auskunft über gespeicherte personenbezogene Daten (Art. 15 DSGVO)</li>
                <li>Recht auf Berichtigung unrichtiger oder unvollständiger Daten (Art. 16 DSGVO)</li>
                <li>Recht auf Löschung, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen (Art. 17 DSGVO)</li>
                <li>Recht auf Einschränkung der Verarbeitung unter den Voraussetzungen des Art. 18 DSGVO</li>
                <li>Recht auf Widerspruch gegen die Verarbeitung aufgrund besonderer Situation (Art. 21 DSGVO)</li>
                <li>Recht auf Datenübertragbarkeit bei automatisierter Verarbeitung (Art. 20 DSGVO)</li>
                <li>Recht auf Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
              </ul>
              <p>
                Zur Ausübung Ihrer Rechte können Sie uns jederzeit unter den oben angegebenen Kontaktdaten kontaktieren.
                Bitte stellen Sie dabei ausreichende Informationen zu Ihrer Person bereit, die uns eine eindeutige
                Identifizierung ermöglichen.
              </p>
              <p>
                Beschwerderecht: Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
                Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren (Art. 77 DSGVO). Dies können Sie
                beispielsweise bei der Aufsichtsbehörde Ihres Aufenthaltsortes oder unseres Firmensitzes tun. Für Hessen
                ist dies der Hessische Beauftragte für Datenschutz und Informationsfreiheit (HBDI).
              </p>
              <h2 className="font-bold">Aktualität und Änderungen dieser Erklärung</h2>
              <p>
                Diese Datenschutzerklärung ist aktuell gültig (Stand: August 2025). Wir behalten uns vor, den Inhalt
                dieser Erklärung bei Bedarf anzupassen, um sie an geänderte Rechtslagen oder technische Änderungen
                unseres Angebots anzupassen. Die jeweils aktuelle Fassung der Datenschutzerklärung finden Sie auf dieser
                Website. Auf wesentliche Änderungen weisen wir gegebenenfalls zusätzlich auf der Website hin.
              </p>
              <Button as={Link as ElementType} href={route('home')} variant="outline" className="mt-6 border-white/15 bg-white/0 text-white hover:bg-white/10 hover:text-white">
                Zurück zur Startseite
              </Button>
            </CardBody>
          </Card>
          <LegalLinks variant="inline" className="mt-10 text-white/70" />
        </div>
      </div>
    </>
  )
}

