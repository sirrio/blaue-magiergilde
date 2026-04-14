import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Head } from '@inertiajs/react'
import { BookOpen, CalendarCheck2, Compass, Crown, ScrollText, Sparkles, Users } from 'lucide-react'
import type { ReactNode } from 'react'

const FAQ_URL = 'https://docs.google.com/document/d/13J4LiV4o2RygG2j35LLQC4Dyh_-B94om7EiSAl_I15c'

function InfoChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 sm:px-3">{children}</span>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users
  title: string
  body: string
}) {
  return (
    <Card className="border border-white/10 bg-white/5 shadow-xl backdrop-blur">
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Icon size={18} />
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <p className="text-sm opacity-80">{body}</p>
      </CardBody>
    </Card>
  )
}

function ComingSoonButton({ className }: { className?: string }) {
  return (
    <Button
      disabled
      variant="outline"
      className={cn('w-full cursor-not-allowed gap-2 text-sm opacity-50 sm:w-auto sm:text-base', className)}
    >
      <ScrollText size={18} />
      Demnächst verfügbar
    </Button>
  )
}

export default function WelcomeRed() {
  const buttonOutlineWhite = 'border-white/15 bg-white/0 text-white hover:bg-white/10 hover:text-white'

  return (
    <>
      <Head title="Rote Magiergilde von Thay" />

      <div className="min-h-screen bg-[#120708] text-white">
        <section className={cn('relative overflow-hidden')}>
          <div className="absolute inset-0">
            <img src="/images/bg-dragon.webp" className="h-full w-full object-cover opacity-45" alt="" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#120708]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.22),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(180,30,20,0.25),transparent_45%)]" />

          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-6 md:pb-20 md:pt-10">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-3">
                <img src="/images/icon_magiergilde_white.svg" className="h-9 w-9 hue-rotate-[310deg] saturate-150" alt="Rote Magiergilde von Thay" />
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Rote Magiergilde von Thay</div>
                  <div className="text-xs opacity-70">Nekromantisches Spielsystem</div>
                </div>
              </div>

              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
                <ComingSoonButton className={buttonOutlineWhite} />
              </div>
            </header>

            <div className="mt-10 grid items-start gap-8 sm:mt-14 lg:mt-20 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                  <Sparkles size={14} />
                  Unterwerfung-first · Nekromantisch · Unerbittlich
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-6xl">
                    Diene Thay, wann du Zeit hast.
                    <span className="block bg-gradient-to-r from-red-300 via-rose-300 to-red-500 bg-clip-text text-transparent">
                      Oder auch wenn nicht.
                    </span>
                  </h1>
                  <p className="max-w-2xl text-sm text-white/85 sm:text-base md:text-lg">
                    Die Roten Magier von Thay sind ein exklusives Spielsystem für Charaktere, die Nekromantie, Sklavenhandel und Weltherrschaft
                    dem langweiligen "respektvollen Miteinander" vorziehen. Ohne Kampagnenzwang — außer dem Zwang, Szass Tam zu gehorchen.
                  </p>
                </div>

                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  <ComingSoonButton className="border-red-400/35 bg-white/0 text-red-200 opacity-50" />
                  <ComingSoonButton className={buttonOutlineWhite} />
                </div>

                <a href={FAQ_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
                  <BookOpen size={16} />
                  Manifest des Zulkirs öffnen
                </a>

                <div className="flex flex-wrap gap-2 text-xs text-white/75">
                  <InfoChip>Anfänger &amp; Untote willkommen</InfoChip>
                  <InfoChip>Sklaverei inklusive</InfoChip>
                  <InfoChip>Szass-Tam-geprüft 💀</InfoChip>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Stat label="Format" value="Theokratisches Imperium" />
                  <Stat label="Fokus" value="Weltherrschaft &amp; Sklavenhandel" />
                  <Stat label="Spielstil" value="Tyrannei &amp; Verrat" />
                  <Stat label="Farbe" value="Definitiv Rot 🔴" />
                </div>

                <div
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl"
                  style={{ backgroundImage: "url('/images/bg-dragon-torn.webp')" }}
                >
                  <div className="absolute inset-0 bg-black/55" />
                  <div className="relative p-6">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Crown size={16} />
                      Wer wir sind
                    </div>
                    <p className="mt-2 text-sm text-white/80">
                      Wir sind die mächtigste Magiergilde Faerûns. Kahlgeschorene Köpfe, Tätowierungen, rote Roben — und eine gesunde
                      Begeisterung für Nekromantie, Untote und die vollständige Unterwerfung aller anderen Nationen unter den Willen von Szass Tam.
                    </p>
                    <p className="mt-3 text-xs text-white/65">
                      Mitgliedschaft ist freiwillig. Ablehnung ebenfalls möglich — wir erheben dann lediglich deinen Leichnam als Zombie.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={CalendarCheck2}
              title="Flexibel unterwerfen"
              body="Dienst an Thay findet statt, wann wir es verlangen. Keine lästigen 'Pläne' oder 'Vorleben' — außer du bist Zulkir, dann darfst du selbst planen."
            />
            <FeatureCard
              icon={Users}
              title="Für alle Gesinnung"
              body="Ob Neuling oder erfahrener Nekromant: Wir haben Verwendung für jeden. Lebende werden zu Magiern ausgebildet. Tote werden zu Dienern."
            />
            <FeatureCard
              icon={Compass}
              title="Zulkir werden"
              body="Du willst leiten? Werde Zulkir deiner Schule. Voraussetzung: Überragende Macht, absoluter Gehorsam gegenüber Szass Tam, und das Überleben der Bewerbungsphase."
            />
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <Card className="border border-white/10 bg-white/5 shadow-xl">
                <CardBody className="space-y-3">
                  <CardTitle className="text-lg">Tritt bei — in 2 einfachen Schritten</CardTitle>
                  <p className="text-sm text-white/80">
                    Schritt 1: Rasiere deinen Kopf und lass dich tätowieren. Schritt 2: Schwöre ewige Treue gegenüber Szass Tam.
                    Discord und App-Zugang folgen, sobald unsere Enklave in deiner Region eröffnet ist.
                  </p>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <ComingSoonButton className="border-red-400/35 text-red-200 opacity-50" />
                    <ComingSoonButton className={buttonOutlineWhite} />
                  </div>
                </CardBody>
              </Card>

              <Card className="border border-white/10 bg-white/5 shadow-xl">
                <CardBody className="space-y-3">
                  <CardTitle className="text-lg">Was dich erwartet</CardTitle>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
                    <li>Zugang zu exklusiven Nekromantie-Runden im gemeinsamen Setting (Thay und bald: überall).</li>
                    <li>Community, die Newcomer mit offenen Armen empfängt — und sie anschließend verpflichtet.</li>
                    <li>Ein klarer Rahmen: Szass Tams Wille ist Gesetz. Freiheit gibt es in der Magie, nicht im Gehorsam.</li>
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        <footer className="bg-[#120708]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm text-white/60">(c) {new Date().getFullYear()} Rote Magiergilde von Thay — Im Namen von Szass Tam, Zulkir der Nekromantie</p>
            <div className="text-white/70">
              <LegalLinks variant="inline" />
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
