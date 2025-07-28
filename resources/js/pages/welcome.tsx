import { cn } from '@/lib/utils'
import { Head, Link, usePage } from '@inertiajs/react'
import type { ElementType } from 'react'
import { PageProps } from '@/types'
import { Button } from '@/components/ui/button'
import LegalLinks from '@/components/legal-links'
import { format } from 'date-fns'
import { z } from 'zod'

const mySchema = z.string()

mySchema.parse('tuna') // => "tuna"

mySchema.safeParse('tuna') // => { success: true; data: "tuna" }
mySchema.safeParse(12) // => { success: false; error: ZodError }
format(new Date(), "'Today is a' eeee")

export default function Welcome() {
  const { auth } = usePage<PageProps>().props
  return (
    <>
      <Head title="Welcome"></Head>
      <div className={cn('hero bg-base-200 min-h-screen')}>
        <div className={cn('hero-content flex-col lg:flex-row-reverse')}>
          <img src="/images/icon_magiergilde.svg" className={cn('max-w-sm rounded-lg')} alt="Blaue Magiergilde" />
          <div>
            <h1 className={cn('text-5xl font-bold')}>Blaue Magiergilde</h1>
            <p className={cn('py-6')}>
              Hier kannst du deine Charaktere und gespielten Runden speichern. Deine Ressourcen und Level werden automatisch berechnet – so hast du
              alles im Blick und kannst dich voll und ganz auf dein Spiele konzentrieren!
            </p>
            <div className={cn('space-x-2')}>
              {auth.user ? (
                <Button as={Link as ElementType} href={route('characters.index')} color="primary">
                  Zur Characterverwaltung
                </Button>
              ) : (
                <div className={cn('flex gap-2')}>
                  <Button as={Link as ElementType} href={route('login')} color="accent">
                    Login
                  </Button>
                  <Button as={Link as ElementType} href={route('register')} variant="outline">
                    Register
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <LegalLinks />
    </>
  )
}
