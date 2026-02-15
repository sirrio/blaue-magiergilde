import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/app-layout'
import { PageProps } from '@/types'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import { Link2, Lock, Trash, User } from 'lucide-react'

export default function Profile() {
  const { auth, discordConnected, status, error } = usePage<PageProps & { status?: string; error?: string }>().props

  const profileForm = useForm({
    name: auth.user.name,
    email: auth.user.email,
  })

  const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const deleteForm = useForm({
    password: '',
  })

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    profileForm.patch(route('profile.update'))
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    passwordForm.put(route('password.update'))
  }

  const submitDelete = (e: React.FormEvent) => {
    e.preventDefault()
    deleteForm.delete(route('profile.destroy'))
  }

  return (
    <AppLayout>
      <Head title="Profile" />
      <div className="container mx-auto max-w-3xl space-y-6 p-4">
        <section className="border-b border-base-200 pb-3">
          <h1 className="text-xl font-bold sm:text-2xl">Profile</h1>
          <p className="text-sm text-base-content/70">Edit your account settings and connected services.</p>
        </section>

        <Card className="border border-base-200">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 size={16} />
              Discord
            </CardTitle>
            <CardContent className="space-y-2 text-sm">
              {discordConnected ? (
                <>
                  <p className="text-base-content/80">Dein Account ist mit Discord verbunden.</p>
                  <Link as="button" method="delete" href={route('discord.disconnect')} className="btn btn-outline btn-sm w-fit">
                    Disconnect Discord
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-base-content/80">
                    Um den Discord Bot zu nutzen, musst du deinen Account einmalig mit Discord verbinden.
                  </p>
                  <Button as="a" href={route('discord.login')} color="primary" size="sm" className="w-fit">
                    Connect Discord
                  </Button>
                </>
              )}
              {status === 'discord-connected' ? (
                <div className="alert alert-success alert-soft py-2 text-sm">Discord verbunden.</div>
              ) : null}
              {status === 'discord-disconnected' ? (
                <div className="alert alert-info alert-soft py-2 text-sm">Discord Verbindung entfernt.</div>
              ) : null}
              {error ? <div className="alert alert-error alert-soft py-2 text-sm">{error}</div> : null}
            </CardContent>
          </CardBody>
        </Card>

        <Card className="border border-base-200">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={16} />
              Account
            </CardTitle>
            <CardContent>
              <form onSubmit={submitProfile} className="space-y-4">
                <Input type="text" value={profileForm.data.name} onChange={(e) => profileForm.setData('name', e.target.value)} errors={profileForm.errors.name}>
                  Nickname
                </Input>
                <p className="text-xs text-base-content/70">Use a nickname here, not your real name.</p>
                <Input type="email" value={profileForm.data.email} onChange={(e) => profileForm.setData('email', e.target.value)} errors={profileForm.errors.email}>
                  Email
                </Input>
                <div className="flex justify-end">
                  <Button type="submit" className="btn-primary" disabled={profileForm.processing}>
                    Save
                  </Button>
                </div>
              </form>
            </CardContent>
          </CardBody>
        </Card>

        <Card className="border border-base-200">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock size={16} />
              Password
            </CardTitle>
            <CardContent>
              <form onSubmit={submitPassword} className="space-y-4">
                <Input type="password" value={passwordForm.data.current_password} onChange={(e) => passwordForm.setData('current_password', e.target.value)} errors={passwordForm.errors.current_password}>
                  Current Password
                </Input>
                <Input type="password" value={passwordForm.data.password} onChange={(e) => passwordForm.setData('password', e.target.value)} errors={passwordForm.errors.password}>
                  New Password
                </Input>
                <Input type="password" value={passwordForm.data.password_confirmation} onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)} errors={passwordForm.errors.password_confirmation}>
                  Confirm Password
                </Input>
                <div className="flex justify-end">
                  <Button type="submit" className="btn-primary" disabled={passwordForm.processing}>
                    Save
                  </Button>
                </div>
              </form>
            </CardContent>
          </CardBody>
        </Card>

        <Card className="border border-error/30">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base text-error">
              <Trash size={16} />
              Delete Account
            </CardTitle>
            <CardContent className="space-y-4">
              <p className="text-sm text-base-content/80">Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.</p>
              <form onSubmit={submitDelete} className="space-y-4">
                <Input type="password" value={deleteForm.data.password} onChange={(e) => deleteForm.setData('password', e.target.value)} errors={deleteForm.errors.password}>
                  Password
                </Input>
                <div className="flex justify-end">
                  <Button type="submit" className="btn-error" disabled={deleteForm.processing}>
                    Delete Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
