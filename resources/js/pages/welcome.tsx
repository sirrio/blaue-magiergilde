import LegalLinks from '@/components/legal-links'
import { Button } from '@/components/ui/button'
import DiscordIcon from '@/components/discord-icon'
import { cn } from '@/lib/utils'
import { Head, Link, usePage } from '@inertiajs/react'
import type { PageProps } from '@/types'
import { format } from 'date-fns'
import type { ElementType } from 'react'
import { z } from 'zod'

const mySchema = z.string()

mySchema.parse('tuna') // => "tuna"

mySchema.safeParse('tuna') // => { success: true; data: "tuna" }
mySchema.safeParse(12) // => { success: false; error: ZodError }
format(new Date(), "'Today is a' eeee")

export default function Welcome() {
  const { features } = usePage<PageProps>().props

  return (
    <>
      <Head title="Welcome"></Head>
      <div className={cn('hero bg-base-300 relative min-h-screen overflow-hidden')} data-theme={'light'}>
        <div className="absolute inset-0 grayscale-[60%] hue-rotate-[3.5rad] ">
          <img src="/images/bg-dragon.webp" className="h-full md:hidden object-cover" alt="" />
          <img src="/images/bg-dragon-torn.webp" className="h-full w-full object-cover hidden md:block" alt="" />
        </div>
        <div className={cn('hero-content relative z-10 flex-col bg-transparent lg:flex-row-reverse')} data-theme={'dark'}>
          <img src="/images/icon_magiergilde_white.svg" className={cn('max-w-sm rounded-lg')} alt="Blaue Magiergilde" />
          <div>
            <h1 className={cn('text-5xl font-bold')}>Blaue Magiergilde</h1>
            <p className={cn('py-6')}>
              Hier kannst du deine Charaktere und gespielten Runden speichern. Deine Ressourcen und Level werden automatisch berechnet – so hast du
              alles im Blick und kannst dich voll und ganz auf dein Spiele konzentrieren!
            </p>
            <div className={cn('flex gap-2 flex-wrap')}>
              <Button
                as="a"
                href="https://discord.gg/dd5c"
                color="info"
                className="gap-2"
                target="_blank"
              >
                <DiscordIcon width={24} />
                Mitmachen im DD5C-Discord
              </Button>
              {!features.character_manager ? (
                <div className="tooltip" data-tip="comming soon">
                  <Button
                    as={Link as ElementType}
                    href={route('login')}
                    variant={'outline'}
                    disabled
                  >
                    Charactermanger
                  </Button>
                </div>
              ) : (
                <Button
                  as={Link as ElementType}
                  href={route('login')}
                  variant={'outline'}
                >
                  Charactermanger
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-base-300 h-fit w-fit md:text-base-content text-info" data-theme={'light'}>
        <LegalLinks />
      </div>
    </>
  )
}
