import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import type { PageProps } from '@/types'
import LegalLinks from '@/components/legal-links'
import DiscordIcon from '@/components/discord-icon'
import { cn } from '@/lib/utils'

export default function Register() {
  const { features } = usePage<PageProps>().props
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route('register'))
  }

  return (
    <>
      <Head title="Register" />
      <div className="relative min-h-screen bg-base-200 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
          <Card className="border border-base-300/60 shadow-lg">
            <CardBody className="space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Link href={route('home')} className="inline-flex items-center justify-center">
                  <img className={cn('h-20 w-20')} src="/images/icon_magiergilde.svg" alt="Blaue Magiergilde" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Account erstellen</h1>
                  <p className="text-sm opacity-70">Starte mit der Verwaltung deiner Charaktere.</p>
                </div>
              </div>

              {features.discord && (
                <Button as="a" href={route('discord.login')} color="primary" modifier="block" className="gap-2">
                  <DiscordIcon width={20} />
                  Mit Discord registrieren
                </Button>
              )}

              {features.discord && <div className="divider my-0">oder</div>}

              <form onSubmit={submit} className="space-y-4">
                <Input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} errors={errors.name} placeholder="Dein Name">
                  Name
                </Input>
                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} errors={errors.email} placeholder="you@example.com">
                  Email
                </Input>
                <Input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} errors={errors.password} placeholder="••••••••">
                  Password
                </Input>
                <Input
                  type="password"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  errors={errors.password_confirmation}
                  placeholder="••••••••"
                >
                  Confirm Password
                </Input>
                <Button type="submit" disabled={processing} color="primary" modifier="block">
                  Register
                </Button>
              </form>

              <p className="text-center text-sm opacity-80">
                Schon registriert?{' '}
                <Link href={route('login')} className="link link-hover font-medium">
                  Login
                </Link>
              </p>
            </CardBody>
          </Card>

          <LegalLinks variant="inline" className="mt-8" />
        </div>
      </div>
    </>
  )
}
