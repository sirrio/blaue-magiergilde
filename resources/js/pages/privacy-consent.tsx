import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import type { ElementType } from 'react'

export default function PrivacyConsent() {
  const { privacyPolicyVersion, privacyPolicyUpdatedNotice } = usePage<{
    privacyPolicyVersion: number
    privacyPolicyUpdatedNotice: string
  }>().props

  const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
    privacy_policy_accepted: false,
  })

  const ensurePrivacyAccepted = () => {
    if (data.privacy_policy_accepted) {
      return true
    }

    setError('privacy_policy_accepted', 'Bitte bestaetige die Datenschutzerklaerung.')
    return false
  }

  const handlePrivacyAcceptedChange = (checked: boolean) => {
    setData('privacy_policy_accepted', checked)
    if (checked) {
      clearErrors('privacy_policy_accepted')
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ensurePrivacyAccepted()) {
      return
    }
    post(route('privacy-consent.store'))
  }

  const buttonOutlineWhite = 'border-white/15 bg-white/0 text-white hover:bg-white/10 hover:text-white'

  return (
    <>
      <Head title="Datenschutz bestaetigen" />

      <div className="relative min-h-screen overflow-hidden bg-[#070A12] text-white" data-theme="dark">
        <div className="pointer-events-none absolute inset-0">
          <img src="/images/bg-dragon.webp" className="h-full w-full object-cover opacity-30" alt="" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#070A12]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-3 py-6 sm:px-4 sm:py-10">
          <Card className="border border-white/10 bg-white/5 shadow-xl backdrop-blur">
            <CardBody className="space-y-4 p-4 sm:space-y-5 sm:p-8">
              <div className="space-y-2 text-center">
                <h1 className="text-xl leading-tight font-bold sm:text-2xl">Datenschutz bestaetigen</h1>
                <p className="text-xs text-white/80 sm:text-sm">
                  Die Datenschutzerklaerung wurde geaendert. Bitte bestaetige die aktuelle Version, um fortzufahren.
                </p>
              </div>

              <div className="rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning-content sm:p-3">
                <p className="font-semibold">Aenderungshinweis</p>
                <p className="mt-1 text-white/85">
                  {privacyPolicyUpdatedNotice} (Version {privacyPolicyVersion})
                </p>
              </div>

              <form onSubmit={submit} className="space-y-3 sm:space-y-4">
                <Checkbox
                  checked={data.privacy_policy_accepted}
                  onChange={(e) => handlePrivacyAcceptedChange(e.target.checked)}
                  errors={errors.privacy_policy_accepted}
                >
                  Ich habe die{' '}
                  <Link href={route('datenschutz')} className="link text-white" target="_blank">
                    Datenschutzerklaerung
                  </Link>{' '}
                  gelesen und akzeptiere sie.
                </Checkbox>

                <Button
                  type="submit"
                  disabled={processing || !data.privacy_policy_accepted}
                  variant="outline"
                  modifier="block"
                  className={cn('text-sm sm:text-base', buttonOutlineWhite)}
                >
                  Datenschutzerklaerung akzeptieren
                </Button>
              </form>

              <Button
                as={Link as ElementType}
                href={route('logout')}
                method="post"
                variant="outline"
                modifier="block"
                className={cn('btn-sm', buttonOutlineWhite)}
              >
                Abmelden
              </Button>
            </CardBody>
          </Card>

          <LegalLinks variant="inline" className="mt-8 text-white/70" />
        </div>
      </div>
    </>
  )
}
