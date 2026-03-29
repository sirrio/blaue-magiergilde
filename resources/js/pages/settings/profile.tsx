import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/lib/i18n'
import AppLayout from '@/layouts/app-layout'
import { PageProps } from '@/types'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import { AlertTriangle, Link2, Lock, Trash, User } from 'lucide-react'
import { useState } from 'react'

export default function Profile() {
  const t = useTranslate()
  const { auth, discordConnected, status, error } = usePage<PageProps & { status?: string; error?: string }>().props
  const hasPassword = Boolean(auth.user.has_password)
  const needsPasswordFallback = Boolean(auth.user.needs_password_fallback)

  const profileForm = useForm({
    name: auth.user.name,
    email: auth.user.email ?? '',
    simplified_tracking: Boolean(auth.user.simplified_tracking),
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
        setProfileNotice(t('profile.profileUpdated'))
      },
      onError: () => {
        setProfileNotice(t('profile.profileUpdateFailed'))
      },
    })
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordNotice(null)
    passwordForm.put(route('password.update'), {
      onSuccess: () => {
        setPasswordNotice(t('profile.passwordUpdated'))
      },
      onError: () => {
        setPasswordNotice(t('profile.passwordUpdateFailed'))
      },
    })
  }

  const submitDelete = (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteNotice(null)
    deleteForm.delete(route('profile.destroy'), {
      onError: () => {
        setDeleteNotice(t('profile.deleteFailed'))
      },
    })
  }

  return (
    <AppLayout>
      <Head title={t('profile.pageTitle')} />
      <div className="container mx-auto max-w-3xl space-y-6 p-4">
        <section className="border-b border-base-200 pb-3">
          <h1 className="text-xl font-bold sm:text-2xl">{t('profile.pageTitle')}</h1>
          <p className="text-sm text-base-content/70">{t('profile.subtitle')}</p>
        </section>

        {needsPasswordFallback ? (
          <div className="alert alert-warning">
            <AlertTriangle size={16} />
            <span>{t('profile.passwordFallbackAlert')}</span>
          </div>
        ) : null}

        <Card className="border border-base-200">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 size={16} />
              {t('profile.discordTitle')}
            </CardTitle>
            <CardContent className="space-y-2 text-sm">
              {discordConnected ? (
                <>
                  <p className="text-base-content/80">{t('profile.discordConnected')}</p>
                  <Link as="button" method="delete" href={route('discord.disconnect')} className="btn btn-outline btn-sm w-fit">
                    {t('profile.disconnectDiscord')}
                  </Link>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
                    <p className="text-base-content text-sm font-semibold">{t('profile.connectDiscordTitle')}</p>
                    <p className="mt-1 text-sm text-base-content/80">
                      {t('profile.connectDiscordHint')}
                    </p>
                    <p className="mt-1 text-xs text-base-content/65">
                      {t('profile.connectDiscordWarning')}
                    </p>
                  </div>
                  <Button as="a" href={route('discord.login')} color="primary" size="sm" className="w-fit">
                    {t('profile.connectDiscordButton')}
                  </Button>
                </>
              )}
              {status === 'discord-connected' ? (
                <div className="alert alert-success alert-soft py-2 text-sm">{t('profile.discordConnectedStatus')}</div>
              ) : null}
              {status === 'discord-disconnected' ? (
                <div className="alert alert-info alert-soft py-2 text-sm">{t('profile.discordDisconnectedStatus')}</div>
              ) : null}
              {error ? <div className="alert alert-error alert-soft py-2 text-sm">{error}</div> : null}
            </CardContent>
          </CardBody>
        </Card>

        <Card className="border border-base-200">
          <CardBody>
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={16} />
              {t('profile.accountTitle')}
            </CardTitle>
            <CardContent>
              <form onSubmit={submitProfile} className="space-y-4">
                {profileNotice ? (
                  <div className={profileForm.hasErrors ? 'alert alert-error alert-soft py-2 text-sm' : 'alert alert-success alert-soft py-2 text-sm'}>
                    {profileNotice}
                  </div>
                ) : null}
                <Input type="text" autoComplete="nickname" value={profileForm.data.name} onChange={(e) => profileForm.setData('name', e.target.value)} errors={profileForm.errors.name}>
                  {t('common.nickName')}
                </Input>
                <p className="text-xs text-base-content/70">{t('profile.nicknameHint')}</p>
                <Input type="email" autoComplete="email" value={profileForm.data.email} onChange={(e) => profileForm.setData('email', e.target.value)} errors={profileForm.errors.email}>
                  {t('common.email')}
                </Input>
                <div className="space-y-2 rounded-lg border border-base-200 bg-base-200/30 p-3">
                  <div>
                    <p className="text-sm font-semibold">{t('profile.trackingModeTitle')}</p>
                    <p className="mt-1 text-xs text-base-content/70">{t('profile.trackingModeHelp')}</p>
                  </div>
                  <div className="join">
                    <Button
                      type="button"
                      size="sm"
                      variant={profileForm.data.simplified_tracking ? 'ghost' : 'soft'}
                      color={profileForm.data.simplified_tracking ? undefined : 'primary'}
                      className="join-item"
                      onClick={() => profileForm.setData('simplified_tracking', false)}
                    >
                      {t('profile.adventureTracking')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={profileForm.data.simplified_tracking ? 'soft' : 'ghost'}
                      color={profileForm.data.simplified_tracking ? 'primary' : undefined}
                      className="join-item"
                      onClick={() => profileForm.setData('simplified_tracking', true)}
                    >
                      {t('profile.levelTracking')}
                    </Button>
                  </div>
                </div>
                {discordConnected ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-base-200 bg-base-200/40 px-3 py-2 text-xs text-base-content/70">
                    <span>{t('profile.removeEmailAllowed')}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        profileForm.setData('email', '')
                        setProfileNotice(t('profile.removeEmailNotice'))
                      }}
                    >
                      {t('profile.removeEmailButton')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-base-content/70">{t('profile.keepEmailHint')}</p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" className="btn-primary" disabled={profileForm.processing}>
                    {t('common.save')}
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
              {t('profile.passwordTitle')}
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
                    {t('common.currentPassword')}
                  </Input>
                ) : null}
                <Input type="password" autoComplete="new-password" value={passwordForm.data.password} onChange={(e) => passwordForm.setData('password', e.target.value)} errors={passwordForm.errors.password}>
                  {hasPassword ? t('common.newPassword') : t('profile.setPassword')}
                </Input>
                <Input type="password" autoComplete="new-password" value={passwordForm.data.password_confirmation} onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)} errors={passwordForm.errors.password_confirmation}>
                  {t('common.confirmPassword')}
                </Input>
                <div className="flex justify-end">
                  <Button type="submit" className="btn-primary" disabled={passwordForm.processing}>
                    {t('common.save')}
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
              {t('profile.deleteTitle')}
            </CardTitle>
            <CardContent className="space-y-4">
              <p className="text-sm text-base-content/80">{t('profile.deleteBody')}</p>
              <form onSubmit={submitDelete} className="space-y-4">
                {deleteNotice ? (
                  <div className="alert alert-error alert-soft py-2 text-sm">{deleteNotice}</div>
                ) : null}
                <Input type="password" autoComplete="current-password" value={deleteForm.data.password} onChange={(e) => deleteForm.setData('password', e.target.value)} errors={deleteForm.errors.password}>
                  {t('common.password')}
                </Input>
                <div className="flex justify-end">
                  <Button type="submit" className="btn-error" disabled={deleteForm.processing}>
                    {t('profile.deleteButton')}
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
