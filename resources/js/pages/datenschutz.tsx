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
      <Head title="Datenschutzerklõrung" />
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
                <h1>Datenschutzerklõrung</h1>
              </CardTitle>
              <h2 className="font-bold">Allgemeine Hinweise</h2>
              <p>
                Wir nehmen den Schutz Ihrer pers÷nlichen Daten sehr ernst. Diese Datenschutzerklõrung informiert Sie
                ³ber die Art, den Umfang und Zweck der Erhebung und Verwendung personenbezogener Daten auf unserer
                Website. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen
                Datenschutzvorschriften (insbesondere DSGVO) sowie dieser Datenschutzerklõrung.
              </p>
              <p>
                Bitte beachten Sie, dass Daten³bertragung im Internet (z.B. bei der Kommunikation per E-Mail)
                Sicherheitsl³cken aufweisen kann. Ein vollumfõnglicher Schutz der Daten vor dem Zugriff durch Dritte
                ist nicht m÷glich.
              </p>
              <h2 className="font-bold">Verantwortliche Stelle</h2>
              <p>{VITE_IMPRESSUM_NAME}</p>
              <p>{VITE_IMPRESSUM_STREET}</p>
              <p>{VITE_IMPRESSUM_CITY}</p>
              <p>E-Mail: {VITE_IMPRESSUM_EMAIL}</p>
              <p>
                Als privater Websitebetreiber sind wir nicht verpflichtet, einen Datenschutzbeauftragten zu benennen.
                Bei Fragen zum Datenschutz k÷nnen Sie sich jedoch jederzeit an die obige Kontaktadresse wenden.
              </p>
              <h2 className="font-bold">Hosting und Server-Log-Dateien</h2>
              <p>
                Unsere Website wird bei einem externen Dienstleister (Hosting-Provider) gehostet: <strong>DigitalOcean,
                LLC</strong>, Region Frankfurt (Datacenter FR1 in Deutschland). Personenbezogene Daten, die auf dieser
                Website erfasst werden, werden auf den Servern von DigitalOcean gespeichert. DigitalOcean handelt bei der
                Datenverarbeitung in unserem Auftrag (Auftragsverarbeitung). Wir haben mit dem Hoster einen Vertrag zur
                Auftragsverarbeitung gemõ▀ Art. 28 DSGVO geschlossen. Dieser Vertrag stellt sicher, dass DigitalOcean die
                Daten unserer Websitebesucher nur nach unseren Weisungen und in Einklang mit den geltenden
                Datenschutzgesetzen verarbeitet. DigitalOcean ist ein US-amerikanisches Unternehmen; wir haben durch
                geeignete Garantien (insbesondere EU-Standardvertragsklauseln) daf³r gesorgt, dass ein dem europõischen
                Datenschutzniveau entsprechendes Schutzniveau gewõhrleistet ist.
              </p>
              <p>
                Beim Aufruf unserer Website ³bermittelt Ihr Browser automatisch Informationen an den Server unseres
                Hosters. Diese Informationen werden in sogenannten Server-Log-Dateien temporõr gespeichert. Die Logfiles
                enthalten z.B. folgende Daten:
              </p>
              <ul>
                <li>Ihre IP-Adresse (in anonymisierter Form, sofern m÷glich)</li>
                <li>Datum und Uhrzeit des Zugriffs</li>
                <li>Name und URL der abgerufenen Datei (angeforderte Seite)</li>
                <li>Referrer-URL (die zuvor besuchte Seite)</li>
                <li>Verwendeter Browser und ggf. Betriebssystem Ihres Gerõts</li>
              </ul>
              <p>
                Diese Daten sind nicht direkt bestimmten Personen zuordenbar und dienen ausschlie▀lich der
                Sicherstellung eines reibungslosen Verbindungsaufbaus der Website, der Systemsicherheit und -stabilitõt
                sowie administrativen Zwecken (z.B. Auswertung von technischen Fehlern). Eine Zusammenf³hrung dieser
                Daten mit anderen Datenquellen wird nicht vorgenommen. Die Log-Daten werden in der Regel nach kurzer Zeit
                automatisiert gel÷scht (spõtestens nach 7 bis 14 Tagen), sofern keine weitere Aufbewahrung zu
                Beweiszwecken erforderlich ist.
              </p>
              <p>
                Die Verarbeitung der vorgenannten Zugriffsdaten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
                Unser berechtigtes Interesse folgt aus den genannten Zwecken zur Datenerhebung (Websitebetrieb,
                IT-Sicherheit und Fehlermanagement).
              </p>
              <h2 className="font-bold">Einsatz von Cookies</h2>
              <p>
                Unsere Website verwendet ausschlie▀lich technisch notwendige Cookies, die f³r den Betrieb und die
                grundlegende Funktionalitõt der Seite erforderlich sind. Wir setzen keine Cookies zu Analyse-, Tracking-
                oder Werbezwecken ein.
              </p>
              <p>
                Bei den von uns eingesetzten Cookies handelt es sich z.B. um Session-Cookies, die eine eindeutige Kennung
                (Session-ID) enthalten. Ggf. nutzt unsere Seite zudem ein Cookie zur Gewõhrleistung der Sicherheit (z.B.
                ein CSRF-Token-Cookie), um Formular-Eingaben vor missbrõuchlichen Angriffen zu sch³tzen. Auch dieses
                Cookie ist technisch notwendig und enthõlt keine personenbezogenen Profile.
              </p>
              <p>
                Diese Session-Cookies sind notwendig, um Ihnen bestimmte Funktionen bereitzustellen (z.B. Login und
                Navigation) und werden nach Ende Ihres Besuchs automatisch gel÷scht (Sitzungsende).
              </p>
              <p>
                Sie k÷nnen Ihren Browser so einstellen, dass er Sie ³ber das Setzen von Cookies informiert, Cookies nur
                im Einzelfall erlaubt oder die Annahme von Cookies f³r bestimmte Fõlle oder generell ausschlie▀t. Bitte
                beachten Sie jedoch, dass die Funktionalitõt dieser Website eingeschrõnkt sein kann, wenn Sie keine
                Cookies zulassen.
              </p>
              <p>
                F³r den Einsatz technisch notwendiger Cookies ist nach º 25 Abs. 2 TTDSG keine Einwilligung erforderlich.
                Die Verarbeitung erfolgt insoweit auf Basis unseres berechtigten Interesses gemõ▀ Art. 6 Abs. 1 lit. f
                DSGVO, da die Cookies f³r die Bereitstellung der von Ihnen angeforderten Dienste unbedingt erforderlich
                sind.
              </p>
              <h2 className="font-bold">Kontaktaufnahme per E-Mail</h2>
              <p>
                Auf dieser Website gibt es kein Kontaktformular. Wenn Sie uns kontaktieren m÷chten, nutzen Sie bitte die
                bereitgestellte E-Mail-Adresse.
              </p>
              <p>
                Wenn Sie uns ³ber die bereitgestellte E-Mail-Adresse ( {VITE_IMPRESSUM_EMAIL} ) kontaktieren, werden die
                von Ihnen mitgeteilten Daten (z.B. Ihre E-Mail-Adresse und der Inhalt Ihrer Nachricht sowie evtl. weitere
                von Ihnen ³bermittelte Kontaktinformationen) zum Zweck der Bearbeitung Ihrer Anfrage und f³r eventuelle
                Anschlussfragen bei uns gespeichert und verarbeitet. Diese Daten geben wir nicht ohne Ihre Einwilligung
                weiter und verwenden sie ausschlie▀lich zur Kommunikation mit Ihnen.
              </p>
              <p>
                Die Verarbeitung dieser Daten erfolgt auf Basis von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse û
                nõmlich die Bearbeitung Ihrer Anfrage). Wenn Sie mit uns Kontakt aufnehmen, k÷nnen Sie davon ausgehen,
                dass die Verarbeitung der ³bermittelten Daten in Ihrem Interesse liegt, um Ihr Anliegen zu beantworten.
                Ihre Daten aus der E-Mail-Anfrage werden von uns gel÷scht, sobald die jeweilige Konversation mit Ihnen
                beendet ist und der Zweck der Speicherung entfõllt. Gesetzliche Aufbewahrungspflichten bleiben
                unber³hrt.
              </p>
              <h2 className="font-bold">Registrierung und Login ³ber Discord</h2>
              <p>
                Unsere Website bietet Ihnen ggf. die M÷glichkeit, sich f³r bestimmte Bereiche anzumelden. Dies erfolgt
                als privates, nicht ÷ffentliches Angebot vorrangig ³ber einen Login mit Ihrem Discord-Account
                (Single-Sign-On). Wenn Sie den "Login mit Discord" nutzen, werden Sie auf die Plattform Discord
                (betrieben durch Discord Inc., 444 De Haro Street, San Francisco, CA 94107, USA) weitergeleitet. Dort
                k÷nnen Sie sich mit Ihren Discord-Zugangsdaten authentifizieren. Bei diesem Vorgang erhalten wir von
                Discord bestimmte Informationen aus Ihrem Discord-Profil, insbesondere Ihren Discord-Benutzernamen, Ihre
                einmalige Discord-ID-Nummer und ggf. Ihre mit Discord verkn³pfte E-Mail-Adresse (abhõngig von den
                Berechtigungen, die Sie beim Login bestõtigen). Wir nutzen diese Daten, um ein Benutzerkonto f³r Sie auf
                unserer Website einzurichten bzw. Ihr Login zu verifizieren. Ohne diese Daten ist eine Anmeldung ³ber
                Discord nicht m÷glich.
              </p>
              <p>
                Die Kommunikation zwischen unserer Website und Discord erfolgt ³ber eine verschl³sselte Verbindung. Bitte
                beachten Sie, dass bei Nutzung der Discord-Anmeldung zunõchst eine Verbindung zu den Servern von Discord
                hergestellt wird. Dabei gelten die Datenschutzbestimmungen von Discord. Weitere Informationen dazu finden
                Sie in der <a className="link" href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">Datenschutzerklõrung von Discord</a>.
              </p>
              <p>
                Die Verarbeitung Ihrer Daten im Rahmen des Discord-Logins erfolgt auf Grundlage Ihrer Einwilligung (Art.
                6 Abs. 1 lit. a DSGVO), die Sie durch das freiwillige Nutzen der "Login mit Discord"-Funktion erteilen.
                Sie k÷nnen diese Einwilligung jederzeit mit Wirkung f³r die Zukunft widerrufen, indem Sie uns z.B. eine
                Nachricht senden und die L÷schung Ihres Benutzerkontos verlangen. In diesem Fall werden wir Ihre im
                Zusammenhang mit dem Discord-Login gespeicherten personenbezogenen Daten umgehend l÷schen, sofern keine
                gesetzlichen Aufbewahrungspflichten dem entgegenstehen.
              </p>
              <p>
                Alle ³ber das Benutzerkonto ausgetauschten oder von Ihnen eingegebenen Inhalte unterliegen ebenfalls den
                Bestimmungen dieser Datenschutzerklõrung. Bitte stellen Sie keine sensiblen personenbezogenen Daten ³ber
                Ihr Benutzerkonto ein, die nicht unbedingt notwendig sind.
              </p>
              <h2 className="font-bold">Keine weiteren Drittanbieterdienste</h2>
              <p>
                Wir verwenden keine Analysetools wie Google Analytics oder õhnliche Tracking-Dienste. Es werden keine
                Social-Media-Plugins (Facebook-Like-Button o.─.) und keine extern eingebetteten Inhalte von Drittanbietern
                (z.B. Videos von YouTube, Karten von Google Maps oder Webfonts von Google Fonts) auf unserer Website
                eingesetzt. Dadurch werden beim Besuch unserer Website keine Daten ungewollt an Dritte ³bermittelt.
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
                Diese Website nutzt aus Gr³nden der Sicherheit und zum Schutz der ▄bertragung vertraulicher Inhalte eine
                SSL- bzw. TLS-Verschl³sselung. Das erkennen Sie an der "https://"-Adresszeile Ihres Browsers und dem
                Schloss-Symbol in der Browserzeile. Wenn die SSL- bzw. TLS-Verschl³sselung aktiv ist, k÷nnen die Daten,
                die Sie an uns ³bermitteln, nicht von Dritten mitgelesen werden.
              </p>
              <p>
                Wir treffen au▀erdem angemessene technische und organisatorische Ma▀nahmen, um Ihre Daten vor Verlust,
                Missbrauch oder unbefugtem Zugriff zu sch³tzen. Bitte beachten Sie jedoch, dass kein elektronisches
                ▄bertragungssystem vollkommen sicher ist. Wir werden unsere Sicherheitsma▀nahmen entsprechend der
                technologischen Entwicklung fortlaufend verbessern.
              </p>
              <h2 className="font-bold">Ihre Rechte als betroffene Person</h2>
              <ul>
                <li>Recht auf Auskunft ³ber gespeicherte personenbezogene Daten (Art. 15 DSGVO)</li>
                <li>Recht auf Berichtigung unrichtiger oder unvollstõndiger Daten (Art. 16 DSGVO)</li>
                <li>Recht auf L÷schung, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen (Art. 17 DSGVO)</li>
                <li>Recht auf Einschrõnkung der Verarbeitung unter den Voraussetzungen des Art. 18 DSGVO</li>
                <li>Recht auf Widerspruch gegen die Verarbeitung aufgrund besonderer Situation (Art. 21 DSGVO)</li>
                <li>Recht auf Daten³bertragbarkeit bei automatisierter Verarbeitung (Art. 20 DSGVO)</li>
                <li>Recht auf Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
              </ul>
              <p>
                Zur Aus³bung Ihrer Rechte k÷nnen Sie uns jederzeit unter den oben angegebenen Kontaktdaten kontaktieren.
                Bitte stellen Sie dabei ausreichende Informationen zu Ihrer Person bereit, die uns eine eindeutige
                Identifizierung erm÷glichen.
              </p>
              <p>
                Beschwerderecht: Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbeh÷rde ³ber die
                Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren (Art. 77 DSGVO). Dies k÷nnen Sie
                beispielsweise bei der Aufsichtsbeh÷rde Ihres Aufenthaltsortes oder unseres Firmensitzes tun. F³r Hessen
                ist dies der Hessische Beauftragte f³r Datenschutz und Informationsfreiheit (HBDI).
              </p>
              <h2 className="font-bold">Aktualitõt und ─nderungen dieser Erklõrung</h2>
              <p>
                Diese Datenschutzerklõrung ist aktuell g³ltig (Stand: August 2025). Wir behalten uns vor, den Inhalt
                dieser Erklõrung bei Bedarf anzupassen, um sie an geõnderte Rechtslagen oder technische ─nderungen
                unseres Angebots anzupassen. Die jeweils aktuelle Fassung der Datenschutzerklõrung finden Sie auf dieser
                Website. Auf wesentliche ─nderungen weisen wir gegebenenfalls zusõtzlich auf der Website hin.
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

