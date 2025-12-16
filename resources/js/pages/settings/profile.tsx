import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/app-layout'
import { PageProps } from '@/types'
import { Head, Link, useForm, usePage } from '@inertiajs/react'

export default function Profile() {
  const { auth, discordConnected, features, status, error } = usePage<PageProps & { status?: string; error?: string }>().props

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
      <div className="container mx-auto max-w-xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p>Edit your settings here</p>
        <div className="card bg-base-100 p-4 space-y-2">
          <p className="font-semibold">Discord</p>
          {!features.discord ? (
            <p className="text-sm opacity-80">
              Discord-Integration ist aktuell deaktiviert. (FEATURE_DISCORD / DISCORD_* Konfiguration)
            </p>
          ) : discordConnected ? (
            <>
              <p className="text-sm opacity-80">Dein Account ist mit Discord verbunden.</p>
              <Link as="button" method="delete" href={route('discord.disconnect')} className="btn btn-outline btn-sm w-fit">
                Disconnect Discord
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm opacity-80">
                Um den Discord Bot zu nutzen, musst du deinen Account einmalig mit Discord verbinden.
              </p>
              <Button as="a" href={route('discord.login')} color="primary" size="sm" className="w-fit">
                Connect Discord
              </Button>
            </>
          )}
          {status === 'discord-connected' && <p className="text-sm text-success mt-2">Discord verbunden.</p>}
          {status === 'discord-disconnected' && <p className="text-sm text-info mt-2">Discord Verbindung entfernt.</p>}
          {error && <p className="text-sm text-error mt-2">{error}</p>}
        </div>
        <form onSubmit={submitProfile} className="card bg-base-100 space-y-4 p-4">
          <h2 className="text-xl font-semibold">Update your account's profile information and email address.</h2>
          <Input type="text" value={profileForm.data.name} onChange={(e) => profileForm.setData('name', e.target.value)} errors={profileForm.errors.name}>
            Name
          </Input>
          <Input type="email" value={profileForm.data.email} onChange={(e) => profileForm.setData('email', e.target.value)} errors={profileForm.errors.email}>
            Email
          </Input>
          <Button type="submit" className="btn-primary" disabled={profileForm.processing}>
            Save
          </Button>
        </form>
        <form onSubmit={submitPassword} className="card bg-base-100 space-y-4 p-4">
          <h2 className="text-xl font-semibold">Update Password.</h2>
          <Input type="password" value={passwordForm.data.current_password} onChange={(e) => passwordForm.setData('current_password', e.target.value)} errors={passwordForm.errors.current_password}>
            Current Password
          </Input>
          <Input type="password" value={passwordForm.data.password} onChange={(e) => passwordForm.setData('password', e.target.value)} errors={passwordForm.errors.password}>
            Password
          </Input>
          <Input type="password" value={passwordForm.data.password_confirmation} onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)} errors={passwordForm.errors.password_confirmation}>
            Confirm Password
          </Input>
          <Button type="submit" className="btn-primary" disabled={passwordForm.processing}>
            Save
          </Button>
        </form>
        <form onSubmit={submitDelete} className="card bg-base-100 space-y-4 p-4">
          <h2 className="text-xl font-semibold">Delete Account</h2>
          <p>Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.</p>
          <Input type="password" value={deleteForm.data.password} onChange={(e) => deleteForm.setData('password', e.target.value)} errors={deleteForm.errors.password}>
            Password
          </Input>
          <Button type="submit" className="btn-error" disabled={deleteForm.processing}>
            Delete Account
          </Button>
        </form>
      </div>
    </AppLayout>
  )
}
