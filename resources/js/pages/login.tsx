import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import type { PageProps } from '@/types'

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
      <div className="hero bg-base-200 min-h-screen">
        <form onSubmit={submit} className="hero-content card w-full max-w-sm flex-col space-y-4 p-6 shadow">
          <img className="mx-auto w-24" src="/images/icon_magiergilde.svg" alt="Blaue Magiergilde" />
          <h1 className="text-2xl font-bold text-center">Login</h1>
          {features.discord && (
            <Button as="a" href={route('discord.login')} color="primary" modifier="block">
              Login with Discord
            </Button>
          )}
          <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} errors={errors.email}>
            Email
          </Input>
          <Input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} errors={errors.password}>
            Password
          </Input>
          <Button type="submit" disabled={processing} className="btn-primary w-full">
            Login
          </Button>
          <p className="text-center text-sm">
            No account? <Link href={route('register')} className="link">Register</Link>
          </p>
        </form>
      </div>
    </>
  )
}
