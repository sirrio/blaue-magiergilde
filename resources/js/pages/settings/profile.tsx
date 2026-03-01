import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/app-layout'
import { PageProps } from '@/types'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import { AlertTriangle, Link2, Lock, Trash, User } from 'lucide-react'
import { useState } from 'react'

export default function Profile() {
  const { auth, discordConnected, status, error } = usePage<PageProps & { status?: string; error?: string }>().props
  const hasPassword = Boolean(auth.user.has_password)
  const needsPasswordFallback = Boolean(auth.user.needs_password_fallback)

  const profileForm = useForm({
    name: auth.user.name,
    email: auth.user.email ?? '',
  })

  const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const deleteForm = useForm({
    password: '',
  })
  const [profileNotice, setProfileNotice] = useState<string | null>(null)
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null)
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null)

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileNotice(null)
    profileForm.patch(route('profile.update'), {
      onSuccess: () => {
        setProfileNotice('Profile updated.')
      },
      onError: () => {
        setProfileNotice('Profile could not be saved. Check the highlighted fields and try again.')
      },
    })
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordNotice(null)
    passwordForm.put(route('password.update'), {
      onSuccess: () => {
        setPasswordNotice('Password updated.')
      },
      onError: () => {
        setPasswordNotice('Password could not be updated. Check the highlighted fields and try again.')
      },
    })
  }

  const submitDelete = (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteNotice(null)
    deleteForm.delete(route('profile.destroy'), {
      onError: () => {
        setDeleteNotice('Account could not be deleted. Check the password field and try again.')
      },
    })
  }

  return (
    <AppLayout>
      <Head title="Profile" />
      <div className="container mx-auto max-w-3xl space-y-6 p-4">
        <section className="border-b border-base-200 pb-3">
          <h1 className="text-xl font-bold sm:text-2xl">Profile</h1>
          <p className="text-sm text-base-content/70">Edit your account settings and connected services.</p>
        </section>

        {needsPasswordFallback ? (
          <div className="alert alert-warning">
            <AlertTriangle size={16} />
            <span>ALERT: Please set your password for fallback login.</span>
          </div>
        ) : null}

        <Card className="border border-base-200">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 size={16} />
              Discord
            </CardTitle>
            <CardContent className="space-y-2 text-sm">
              {discordConnected ? (
                <>
                  <p className="text-base-content/80">Your account is connected to Discord.</p>
                  <Link as="button" method="delete" href={route('discord.disconnect')} className="btn btn-outline btn-sm w-fit">
                    Disconnect Discord
                  </Link>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
                    <p className="text-base-content text-sm font-semibold">Connect Discord to this existing account</p>
                    <p className="mt-1 text-sm text-base-content/80">
                      Use this if you already use the website and want the bot to access your current characters.
                    </p>
                    <p className="mt-1 text-xs text-base-content/65">
                      Do not create a second account in the bot. Linking Discord here is the correct path for existing users.
                    </p>
                  </div>
                  <Button as="a" href={route('discord.login')} color="primary" size="sm" className="w-fit">
                    Connect Discord to this account
                  </Button>
                </>
              )}
              {status === 'discord-connected' ? (
                <div className="alert alert-success alert-soft py-2 text-sm">Discord connected.</div>
              ) : null}
              {status === 'discord-disconnected' ? (
                <div className="alert alert-info alert-soft py-2 text-sm">Discord connection removed.</div>
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
                {profileNotice ? (
                  <div className={profileForm.hasErrors ? 'alert alert-error alert-soft py-2 text-sm' : 'alert alert-success alert-soft py-2 text-sm'}>
                    {profileNotice}
                  </div>
                ) : null}
                <Input type="text" autoComplete="nickname" value={profileForm.data.name} onChange={(e) => profileForm.setData('name', e.target.value)} errors={profileForm.errors.name}>
                  Nickname
                </Input>
                <p className="text-xs text-base-content/70">Use a nickname here, not your real name.</p>
                <Input type="email" autoComplete="email" value={profileForm.data.email} onChange={(e) => profileForm.setData('email', e.target.value)} errors={profileForm.errors.email}>
                  Email
                </Input>
                {discordConnected ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-base-200 bg-base-200/40 px-3 py-2 text-xs text-base-content/70">
                    <span>You can remove your stored email because this account is connected to Discord.</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        profileForm.setData('email', '')
                        setProfileNotice('Email will be removed when you save the profile.')
                      }}
                    >
                      Remove email
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-base-content/70">Keep an email on the account unless Discord is connected.</p>
                )}
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
                {passwordNotice ? (
                  <div className={passwordForm.hasErrors ? 'alert alert-error alert-soft py-2 text-sm' : 'alert alert-success alert-soft py-2 text-sm'}>
                    {passwordNotice}
                  </div>
                ) : null}
                {hasPassword ? (
                  <Input type="password" autoComplete="current-password" value={passwordForm.data.current_password} onChange={(e) => passwordForm.setData('current_password', e.target.value)} errors={passwordForm.errors.current_password}>
                    Current Password
                  </Input>
                ) : null}
                <Input type="password" autoComplete="new-password" value={passwordForm.data.password} onChange={(e) => passwordForm.setData('password', e.target.value)} errors={passwordForm.errors.password}>
                  {hasPassword ? 'New Password' : 'Set Password'}
                </Input>
                <Input type="password" autoComplete="new-password" value={passwordForm.data.password_confirmation} onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)} errors={passwordForm.errors.password_confirmation}>
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
                {deleteNotice ? (
                  <div className="alert alert-error alert-soft py-2 text-sm">{deleteNotice}</div>
                ) : null}
                <Input type="password" autoComplete="current-password" value={deleteForm.data.password} onChange={(e) => deleteForm.setData('password', e.target.value)} errors={deleteForm.errors.password}>
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
