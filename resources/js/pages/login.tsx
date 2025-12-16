import DiscordIcon from '@/components/discord-icon'
import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PageProps } from '@/types'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import type { ElementType } from 'react'

export default function Login() {
  const { features } = usePage<PageProps>().props
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  })

  const buttonOutlineWhite = 'border-white/15 bg-white/0 text-white hover:bg-white/10 hover:text-white'
  const buttonOutlineDiscord = 'border-sky-400/35 bg-white/0 text-sky-200 hover:bg-sky-400/10 hover:text-sky-100'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route('login'))
  }

  return (
    <>
      <Head title="Login" />

      <div className="relative min-h-screen overflow-hidden bg-[#070A12] text-white" data-theme="dark">
        <div className="pointer-events-none absolute inset-0">
          <img src="/images/bg-dragon.webp" className="h-full w-full object-cover opacity-30" alt="" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#070A12]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
          <Card className="border border-white/10 bg-white/5 shadow-xl backdrop-blur">
            <CardBody className="space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Link href={route('home')} className="inline-flex items-center justify-center">
                  <img className={cn('h-20 w-20')} src="/images/icon_magiergilde_white.svg" alt="Blaue Magiergilde" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Willkommen zur Blauen Magiergilde</h1>
                  <p className="text-sm text-white/70">Melde dich an, um deine Charaktere zu verwalten.</p>
                </div>
              </div>

              {features.discord && (
                <Button as="a" href={route('discord.login')} variant="outline" modifier="block" className={cn('gap-2', buttonOutlineDiscord)}>
                  <DiscordIcon width={20} />
                  Mit Discord fortfahren
                </Button>
              )}

              {features.discord && <div className="divider my-0 opacity-60">oder</div>}

              <form onSubmit={submit} className="space-y-4">
                <Input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  errors={errors.email}
                  placeholder="you@example.com"
                >
                  Email
                </Input>
                <Input
                  type="password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  errors={errors.password}
                  placeholder="********"
                >
                  Password
                </Input>
                <Button type="submit" disabled={processing} variant="outline" modifier="block" className={buttonOutlineWhite}>
                  Login
                </Button>
              </form>

              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-sm text-white/80">
                  Kein Account?{' '}
                  <Link href={route('register')} className="underline underline-offset-4 text-white/80 transition-colors hover:text-white">
                    Registrieren
                  </Link>
                </p>
                <Button as={Link as ElementType} href={route('home')} variant="outline" className={cn('btn-sm', buttonOutlineWhite)}>
                  Zurück zur Startseite
                </Button>
              </div>
            </CardBody>
          </Card>

          <LegalLinks variant="inline" className="mt-8 text-white/70" />
        </div>
      </div>
    </>
  )
}
