import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageProps } from '@/types'
import { Head, Link, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import type { ElementType } from 'react'
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
      <div className={cn('hero bg-base-300 relative min-h-screen overflow-hidden')} data-theme={'light'}>
        <div className="absolute inset-0 grayscale-[60%] hue-rotate-[3.5rad] ">
          <img src="/images/bg-dragon-torn.webp" className="h-full w-full object-none md:object-cover" alt="" />
        </div>
        <div className={cn('hero-content relative z-10 flex-col bg-transparent lg:flex-row-reverse')} data-theme={'dark'}>
          <img src="/images/icon_magiergilde_white.svg" className={cn('max-w-sm rounded-lg')} alt="Blaue Magiergilde" />
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
                  <Button as={Link as ElementType} href={route('login')} color="info">
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
      <div className="bg-base-300 h-fit w-fit" data-theme={'light'}>
        <LegalLinks />
      </div>
    </>
  )
}
