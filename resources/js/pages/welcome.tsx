import { cn } from '@/lib/utils'
import { Head } from '@inertiajs/react'
import { format } from 'date-fns'
import { z } from 'zod'

const mySchema = z.string()

mySchema.parse('tuna') // => "tuna"

mySchema.safeParse('tuna') // => { success: true; data: "tuna" }
mySchema.safeParse(12) // => { success: false; error: ZodError }
format(new Date(), "'Today is a' eeee")

export default function Welcome() {
  return (
    <>
      <Head title="Welcome"></Head>
      <div className={cn('hero bg-base-200 min-h-screen')}>
        <div className={cn('hero-content flex-col lg:flex-row-reverse')}>
          <img src="/images/logo.webp" className={cn('max-w-sm rounded-lg')} />
          <div>
            <h1 className={cn('text-5xl font-bold')}>Blaue Magiergilde</h1>
            <p className={cn('py-6')}>
              Hier kannst du deine Charaktere und gespielten Runden speichern. Deine Ressourcen und Level werden automatisch berechnet – so hast du
              alles im Blick und kannst dich voll und ganz auf dein Spiele konzentrieren!
            </p>
            <div className={cn('space-x-2')}>
              <a href={route('discord.login')} className={cn('btn btn-primary')}>
                Login
              </a>
              <button className={cn('btn btn-primary')}>Discord</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
