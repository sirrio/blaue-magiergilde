import LegalLinks from '@/components/legal-links'
import DiscordIcon from '@/components/discord-icon'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Head, Link } from '@inertiajs/react'
import { BookOpen, CalendarCheck2, Compass, Crown, ScrollText, Sparkles, Users } from 'lucide-react'
import type { ElementType, ReactNode } from 'react'

const DISCORD_INVITE_URL = 'https://discord.gg/dd5c'
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

export default function Welcome() {
  const t = useTranslate()
  const appLabel = t('welcome.appLabel')
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
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-3">
                <img src="/images/icon_magiergilde_white.svg" className="h-9 w-9" alt="Blaue Magiergilde" />
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Blaue Magiergilde</div>
                  <div className="text-xs opacity-70">{t('welcome.systemLabel')}</div>
                </div>
              </div>

              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
                <Button
                  as={Link as ElementType}
                  href={route('login')}
                  variant="outline"
                  className={cn('w-full gap-2 text-sm sm:w-auto sm:text-base', buttonOutlineWhite)}
                >
                  <ScrollText size={18} />
                  {appLabel}
                </Button>
                <Button
                  as="a"
                  href={DISCORD_INVITE_URL}
                  variant="outline"
                  className={cn('w-full gap-2 text-sm sm:w-auto sm:text-base', buttonOutlineDiscord)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <DiscordIcon width={20} />
                  {t('welcome.joinDiscord')}
                </Button>
              </div>
            </header>

            <div className="mt-10 grid items-start gap-8 sm:mt-14 lg:mt-20 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                  <Sparkles size={14} />
                  {t('welcome.chip')}
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-6xl">
                    {t('welcome.title')}
                    <span className="block bg-gradient-to-r from-sky-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                      {t('welcome.titleAccent')}
                    </span>
                  </h1>
                  <p className="max-w-2xl text-sm text-white/85 sm:text-base md:text-lg">
                    {t('welcome.subtitle')}
                  </p>
                </div>

                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  <Button
                    as="a"
                    href={DISCORD_INVITE_URL}
                    variant="outline"
                    className={cn('w-full gap-2 text-sm sm:w-auto sm:text-base', buttonOutlineDiscord)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <DiscordIcon width={20} />
                    {t('welcome.joinDiscord')}
                  </Button>
                  <Button
                    as={Link as ElementType}
                    href={route('login')}
                    variant="outline"
                    className={cn('w-full gap-2 text-sm sm:w-auto sm:text-base', buttonOutlineWhite)}
                  >
                    <ScrollText size={18} />
                    {appLabel}
                  </Button>
                </div>

                <a href={FAQ_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
                  <BookOpen size={16} />
                  {t('welcome.openFaq')}
                </a>

                <div className="flex flex-wrap gap-2 text-xs text-white/75">
                  <InfoChip>{t('welcome.beginners')}</InfoChip>
                  <InfoChip>{t('welcome.respectful')}</InfoChip>
                  <InfoChip>{t('welcome.sharedSetting')}</InfoChip>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Stat label={t('welcome.format')} value={t('welcome.formatValue')} />
                  <Stat label={t('welcome.focus')} value={t('welcome.focusValue')} />
                  <Stat label={t('welcome.playStyle')} value={t('welcome.playStyleValue')} />
                  <Stat label={t('welcome.progression')} value={t('welcome.progressionValue')} />
                </div>

                <div
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl"
                  style={{ backgroundImage: "url('/images/bg-dragon-torn.webp')" }}
                >
                  <div className="absolute inset-0 bg-black/55" />
                  <div className="relative p-6">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Crown size={16} />
                      {t('welcome.whoWeAre')}
                    </div>
                    <p className="mt-2 text-sm text-white/80">
                      {t('welcome.whoWeAreBody')}
                    </p>
                    <p className="mt-3 text-xs text-white/65">
                      {t('welcome.whoWeAreFootnote')}
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
              title={t('welcome.featureFlexibleTitle')}
              body={t('welcome.featureFlexibleBody')}
            />
            <FeatureCard
              icon={Users}
              title={t('welcome.featureAllLevelsTitle')}
              body={t('welcome.featureAllLevelsBody')}
            />
            <FeatureCard
              icon={Compass}
              title={t('welcome.featureDmsTitle')}
              body={t('welcome.featureDmsBody')}
            />
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <Card className="border border-white/10 bg-white/5 shadow-xl">
                <CardBody className="space-y-3">
                  <CardTitle className="text-lg">{t('welcome.quickStartTitle')}</CardTitle>
                  <p className="text-sm text-white/80">
                    {t('welcome.quickStartBody')}
                  </p>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <Button
                      as="a"
                      href={DISCORD_INVITE_URL}
                      variant="outline"
                      className={cn('w-full gap-2 text-sm sm:w-auto sm:text-base', buttonOutlineDiscord)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <DiscordIcon width={20} />
                      {t('welcome.joinDiscord')}
                    </Button>
                    <Button
                      as={Link as ElementType}
                      href={route('login')}
                      variant="outline"
                      className={cn('w-full gap-2 text-sm sm:w-auto sm:text-base', buttonOutlineWhite)}
                    >
                      <ScrollText size={18} />
                      {appLabel}
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="border border-white/10 bg-white/5 shadow-xl">
                <CardBody className="space-y-3">
                  <CardTitle className="text-lg">{t('welcome.expectationsTitle')}</CardTitle>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
                    <li>{t('welcome.expectationOne')}</li>
                    <li>{t('welcome.expectationTwo')}</li>
                    <li>{t('welcome.expectationThree')}</li>
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
