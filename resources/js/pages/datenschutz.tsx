import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Head, Link } from '@inertiajs/react'
import type { ElementType } from 'react'

export default function Datenschutz() {
  return (
    <>
      <Head title="Datenschutzerklärung" />
      <div
        className={cn('hero bg-base-300 relative min-h-screen overflow-hidden')}
        data-theme={'light'}
      >
        <div className="absolute inset-0 grayscale-[60%] hue-rotate-[3.5rad]">
          <img
            src="/images/bg-dragon.webp"
            className="h-full md:hidden object-cover"
            alt=""
          />
          <img
            src="/images/bg-dragon-torn.webp"
            className="h-full w-full object-cover hidden md:block"
            alt=""
          />
        </div>
        <div className="hero-content relative z-10 flex-col" data-theme={'dark'}>
          <Card className="w-full max-w-2xl prose text-center">
            <CardBody>
              <CardTitle className="justify-center">
                <h1>Datenschutzerklärung</h1>
              </CardTitle>
              <p>
                This site uses cookies solely for technical functions such as
                maintaining sessions. We do not employ tracking or advertising
                cookies.
              </p>
              <p>
                Any personal data you provide is processed only as required to
                operate the site and to deliver the services you request. We do
                not monetize, sell, or otherwise use your data for marketing
                purposes.
              </p>
              <p>Data is retained only as long as necessary for these technical reasons.</p>
              <Button
                as={Link as ElementType}
                href={route('home')}
                color="primary"
                className="mt-4"
              >
                Zurück zur Startseite
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
      <LegalLinks />
    </>
  )
}
