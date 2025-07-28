import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import type { PageProps } from '@/types'
import LegalLinks from '@/components/legal-links'

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
      <div className="hero bg-base-200 min-h-screen">
        <form onSubmit={submit} className="hero-content card w-full max-w-sm flex-col space-y-4 p-6 shadow">
          <img className="mx-auto w-24" src="/images/icon_magiergilde.svg" alt="Blaue Magiergilde" />
          <h1 className="text-2xl font-bold text-center">Register</h1>
          {features.discord && (
            <Button as="a" href={route('discord.login')} color="primary" modifier="block">
              Register with Discord
            </Button>
          )}
          <Input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} errors={errors.name}>
            Name
          </Input>
          <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} errors={errors.email}>
            Email
          </Input>
          <Input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} errors={errors.password}>
            Password
          </Input>
          <Input
            type="password"
            value={data.password_confirmation}
            onChange={(e) => setData('password_confirmation', e.target.value)}
            errors={errors.password_confirmation}
          >
            Confirm Password
          </Input>
          <Button type="submit" disabled={processing} className="btn-primary w-full">
            Register
          </Button>
          <p className="text-center text-sm">
            Already registered? <Link href={route('login')} className="link">Login</Link>
          </p>
        </form>
      </div>
      <LegalLinks />
    </>
  )
}
