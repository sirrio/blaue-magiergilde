import DiscordIcon from '@/components/discord-icon'
import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import type { ElementType } from 'react'

export default function Register() {
  const t = useTranslate()
  const { privacyPolicyVersion, privacyPolicyUpdatedNotice } = usePage<{
    privacyPolicyVersion: number
    privacyPolicyUpdatedNotice: string
  }>().props

  const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    privacy_policy_accepted: false,
  })

  const buttonOutlineWhite = 'border-white/15 bg-white/0 text-white hover:bg-white/10 hover:text-white'
  const buttonOutlineDiscord = 'border-sky-400/35 bg-white/0 text-sky-200 hover:bg-sky-400/10 hover:text-sky-100'

  const ensurePrivacyAccepted = () => {
    if (data.privacy_policy_accepted) {
      return true
    }

    setError('privacy_policy_accepted', t('auth.privacyConsentRequired'))
    return false
  }

  const handlePrivacyAcceptedChange = (checked: boolean) => {
    setData('privacy_policy_accepted', checked)
    if (checked) {
      clearErrors('privacy_policy_accepted')
    }
  }

  const handleDiscordRegisterClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ensurePrivacyAccepted()) {
      e.preventDefault()
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ensurePrivacyAccepted()) {
      return
    }
    post(route('register'))
  }

  return (
    <>
      <Head title={t('auth.registerTitle')} />

      <div className="relative min-h-screen overflow-hidden bg-[#070A12] text-white" data-theme="dark">
        <div className="pointer-events-none absolute inset-0">
          <img src="/images/bg-dragon.webp" className="h-full w-full object-cover opacity-30" alt="" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#070A12]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-3 py-6 sm:px-4 sm:py-10">
          <Card className="border border-white/10 bg-white/5 shadow-xl backdrop-blur">
            <CardBody className="space-y-4 p-4 sm:space-y-5 sm:p-8">
              <div className="flex flex-col items-center gap-1.5 text-center sm:gap-2">
                <Link href={route('home')} className="inline-flex items-center justify-center">
                  <img className={cn('h-14 w-14 sm:h-20 sm:w-20')} src="/images/icon_magiergilde_white.svg" alt="Blaue Magiergilde" />
                </Link>
                <div>
                  <h1 className="text-xl leading-tight font-bold sm:text-2xl">{t('auth.registerTitle')}</h1>
                  <p className="text-xs text-white/70 sm:text-sm">{t('auth.registerSubtitle')}</p>
                </div>
              </div>

              <div className="rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning-content sm:p-3">
                <p className="font-semibold">{t('auth.privacyUpdatedTitle')}</p>
                <p className="mt-1 text-white/85">
                  {privacyPolicyUpdatedNotice} (Version {privacyPolicyVersion})
                </p>
              </div>
              <Checkbox
                checked={data.privacy_policy_accepted}
                onChange={(e) => handlePrivacyAcceptedChange(e.target.checked)}
                errors={errors.privacy_policy_accepted}
              >
                {t('auth.privacyAcceptancePrefix')}{' '}
                <Link href={route('datenschutz')} className="link text-white" target="_blank">
                  {t('auth.privacyLinkLabel')}
                </Link>{' '}
                {t('auth.privacyAcceptanceSuffix')}
              </Checkbox>

              <Button
                as="a"
                href={route('discord.login')}
                onClick={handleDiscordRegisterClick}
                variant="outline"
                modifier="block"
                className={cn('gap-2 text-sm sm:text-base', buttonOutlineDiscord)}
              >
                <DiscordIcon width={20} />
                {t('auth.createWithDiscord')}
              </Button>
              <div className="rounded-lg border border-sky-400/20 bg-sky-400/8 p-3 text-xs text-sky-100/90">
                <p className="font-semibold text-sky-100">{t('auth.createWithDiscordTitle')}</p>
                <p className="mt-1">{t('auth.createWithDiscordHint')}</p>
                <p className="mt-1 text-sky-100/75">
                  {t('auth.createWithDiscordExistingWarning')}
                </p>
              </div>

              <div className="divider my-0 opacity-60">{t('auth.or')}</div>

              <form onSubmit={submit} className="space-y-3 sm:space-y-4">
                <Input
                  type="text"
                  autoComplete="nickname"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  errors={errors.name}
                  placeholder={t('auth.nicknameHint')}
                >
                  {t('common.nickName')}
                </Input>
                <p className="text-xs text-white/70">{t('auth.nicknameHint')}</p>
                <Input type="email" autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} errors={errors.email} placeholder={t('auth.emailPlaceholder')}>
                  {t('common.email')}
                </Input>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  errors={errors.password}
                  placeholder="********"
                >
                  {t('common.password')}
                </Input>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  errors={errors.password_confirmation}
                  placeholder="********"
                >
                  {t('common.confirmPassword')}
                </Input>
                <Button
                  type="submit"
                  disabled={processing}
                  variant="outline"
                  modifier="block"
                  className={cn('text-sm sm:text-base', buttonOutlineWhite)}
                >
                  {t('auth.registerButton')}
                </Button>
              </form>

              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-sm text-white/80">
                  {t('auth.alreadyRegistered')}{' '}
                  <Link href={route('login')} className="underline underline-offset-4 text-white/80 transition-colors hover:text-white">
                    {t('auth.goToLogin')}
                  </Link>
                </p>
                <Button as={Link as ElementType} href={route('home')} variant="outline" className={cn('btn-sm', buttonOutlineWhite)}>
                  {t('common.backToHome')}
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
