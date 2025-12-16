import LegalLinks from '@/components/legal-links'
import DiscordIcon from '@/components/discord-icon'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Head, Link } from '@inertiajs/react'
import { BookOpen, CalendarCheck2, Compass, Crown, ScrollText, Sparkles, Users } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

const DISCORD_INVITE_URL = 'https://discord.gg/dd5c'
const FAQ_URL = 'https://docs.google.com/document/d/13J4LiV4o2RygG2j35LLQC4Dyh_-B94om7EiSAl_I15c'

function InfoChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">{children}</span>
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

export default function Welcome() {
  const appLabel = 'App Login'
  const buttonOutlineWhite = 'border-white/15 bg-white/0 text-white hover:bg-white/10 hover:text-white'
  const buttonOutlineDiscord = 'border-sky-400/35 bg-white/0 text-sky-200 hover:bg-sky-400/10 hover:text-sky-100'

  return (
    <>
      <Head title="Blaue Magiergilde" />

      <div className="min-h-screen bg-[#070A12] text-white">
        <section className={cn('relative overflow-hidden')}>
          <div className="absolute inset-0">
            <img src="/images/bg-dragon.webp" className="h-full w-full object-cover opacity-45" alt="" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#070A12]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.16),transparent_45%)]" />

          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-6 md:pb-20 md:pt-10">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/images/icon_magiergilde_white.svg" className="h-9 w-9" alt="Blaue Magiergilde" />
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Blaue Magiergilde</div>
                  <div className="text-xs opacity-70">Offenes D&amp;D-Spielsystem</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  as={Link as ElementType}
                  href={route('login')}
                  variant="outline"
                  className={cn('gap-2', buttonOutlineWhite)}
                >
                  <ScrollText size={18} />
                  {appLabel}
                </Button>
                <Button
                  as="a"
                  href={DISCORD_INVITE_URL}
                  variant="outline"
                  className={cn('gap-2', buttonOutlineDiscord)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <DiscordIcon width={20} />
                  Discord beitreten
                </Button>
              </div>
            </header>

            <div className="mt-14 grid items-start gap-10 lg:mt-20 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                  <Sparkles size={14} />
                  Community-first - Westmarch-artig - Flexibel
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
                    Spiele D&amp;D, wann du Zeit hast.
                    <span className="block bg-gradient-to-r from-sky-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                      In einer freundlichen Gilde.
                    </span>
                  </h1>
                  <p className="max-w-2xl text-base text-white/85 md:text-lg">
                    Die Blaue Magiergilde ist ein offenes Spielsystem, in dem Spieler:innen und Spielleiter:innen gemeinsam magische
                    Geschichten erleben - ohne Kampagnenzwang, aber mit langfristiger Charakterentwicklung.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    as="a"
                    href={DISCORD_INVITE_URL}
                    variant="outline"
                    className={cn('gap-2', buttonOutlineDiscord)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <DiscordIcon width={20} />
                    Discord beitreten
                  </Button>
                  <Button
                    as={Link as ElementType}
                    href={route('login')}
                    variant="outline"
                    className={cn('gap-2', buttonOutlineWhite)}
                  >
                    <ScrollText size={18} />
                    {appLabel}
                  </Button>
                </div>

                <a href={FAQ_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
                  <BookOpen size={16} />
                  FAQ oeffnen
                </a>

                <div className="flex flex-wrap gap-2 text-xs text-white/75">
                  <InfoChip>Einsteiger:innen &amp; Erfahrene</InfoChip>
                  <InfoChip>Respektvolles Miteinander</InfoChip>
                  <InfoChip>Gemeinsames Setting</InfoChip>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Stat label="Format" value="Offenes Westmarch-System" />
                  <Stat label="Fokus" value="Community-first & Fair Play" />
                  <Stat label="Spielstil" value="Oneshots & Runden" />
                  <Stat label="Progression" value="Charakterentwicklung inklusive" />
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
                      Eine offene Gemeinschaft von Spieler:innen und DMs. Wir setzen auf ein freundliches, respektvolles Miteinander
                      und darauf, dass jede:r sich in der Runde wohl fuehlt.
                    </p>
                    <p className="mt-3 text-xs text-white/65">
                      Bildvorschlag: Gruppenfoto/Session-Szene oder Artwork der Gilde (z.B. Wappen/Blau-Magie-Motiv).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={CalendarCheck2}
              title="Flexibel spielen"
              body="Runden finden statt, wenn du Zeit hast. Keine langfristigen Verpflichtungen wie bei klassischen Kampagnen."
            />
            <FeatureCard
              icon={Users}
              title="Fuer alle Erfahrungsstufen"
              body="Ob du gerade erst startest oder schon lange spielst: Bei uns findest du passende Runden und Unterstuetzung."
            />
            <FeatureCard
              icon={Compass}
              title="Leiten willkommen"
              body="Du willst leiten? Sehr gern. Es gibt einen gemeinsamen Rahmen und Support, damit der Einstieg leicht faellt."
            />
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <Card className="border border-white/10 bg-white/5 shadow-xl">
                <CardBody className="space-y-3">
                  <CardTitle className="text-lg">Starte in 2 Klicks</CardTitle>
                  <p className="text-sm text-white/80">
                    Der schnellste Einstieg: Discord beitreten und direkt Teil der Community werden. Wenn du die App nutzen willst,
                    logge dich mit deinem Account ein.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      as="a"
                      href={DISCORD_INVITE_URL}
                      variant="outline"
                      className={cn('gap-2', buttonOutlineDiscord)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <DiscordIcon width={20} />
                      Discord beitreten
                    </Button>
                    <Button
                      as={Link as ElementType}
                      href={route('login')}
                      variant="outline"
                      className={cn('gap-2', buttonOutlineWhite)}
                    >
                      <ScrollText size={18} />
                      {appLabel}
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="border border-white/10 bg-white/5 shadow-xl">
                <CardBody className="space-y-3">
                  <CardTitle className="text-lg">Was dich erwartet</CardTitle>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
                    <li>Offenes Spielsystem im gemeinsamen Setting (Faerun und darueber hinaus).</li>
                    <li>Community, die Newcomer unterstuetzt und kreativen Ideen Raum gibt.</li>
                    <li>Ein klarer Rahmen - aber genug Freiheit fuer magische Geschichten.</li>
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        <footer className="bg-[#070A12]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm text-white/60">(c) {new Date().getFullYear()} Blaue Magiergilde</p>
            <div className="text-white/70">
              <LegalLinks variant="inline" />
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
