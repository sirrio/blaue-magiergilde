import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import type { PageProps } from '@/types'
import LegalLinks from '@/components/legal-links'
import DiscordIcon from '@/components/discord-icon'
import { cn } from '@/lib/utils'

export default function Login() {
  const { features } = usePage<PageProps>().props
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route('login'))
  }

  return (
    <>
      <Head title="Login" />
      <div className="relative min-h-screen bg-base-200 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-info/20 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
          <Card className="border border-base-300/60 shadow-lg">
            <CardBody className="space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Link href={route('home')} className="inline-flex items-center justify-center">
                  <img className={cn('h-20 w-20')} src="/images/icon_magiergilde.svg" alt="Blaue Magiergilde" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Willkommen zurück</h1>
                  <p className="text-sm opacity-70">Melde dich an, um deine Charaktere zu verwalten.</p>
                </div>
              </div>

              {features.discord && (
                <Button as="a" href={route('discord.login')} color="primary" modifier="block" className="gap-2">
                  <DiscordIcon width={20} />
                  Mit Discord fortfahren
                </Button>
              )}

              {features.discord && <div className="divider my-0">oder</div>}

              <form onSubmit={submit} className="space-y-4">
                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} errors={errors.email} placeholder="you@example.com">
                  Email
                </Input>
                <Input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} errors={errors.password} placeholder="••••••••">
                  Password
                </Input>
                <Button type="submit" disabled={processing} color="primary" modifier="block">
                  Login
                </Button>
              </form>

              <p className="text-center text-sm opacity-80">
                Kein Account?{' '}
                <Link href={route('register')} className="link link-hover font-medium">
                  Registrieren
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
