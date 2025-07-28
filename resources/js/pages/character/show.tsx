import { List, ListRow } from '@/components/ui/list'
import { Button } from '@/components/ui/button'
import UpdateAdventureModal from '@/pages/character/update-adventure-modal'
import UpdateDowntimeModal from '@/pages/character/update-downtime-modal'
import AppLayout from '@/layouts/app-layout'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { Character, Ally } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { format } from 'date-fns'
import { Settings } from 'lucide-react'
import { useImage } from 'react-image'
import { cn } from '@/lib/utils'

function CharacterPortrait({ character, className }: { character: Character; className?: string }) {
  const { src } = useImage({
    srcList: ['storage/' + character.avatar, '/images/no-avatar.svg'],
  })
  return <img className={cn('aspect-square rounded-full object-cover', className)} src={src} alt={character.name} />
}

function AllyPortrait({ ally, className }: { ally: Ally; className?: string }) {
  const { src } = useImage({
    srcList: ally.avatar ? ['storage/' + ally.avatar, '/images/no-avatar.svg'] : ['/images/no-avatar.svg'],
  })
  return <img className={cn('h-10 w-10 rounded-full object-cover', className)} src={src} alt={ally.name} />
}

export default function Show({ character }: { character: Character }) {
  return (
    <AppLayout>
      <Head title={character.name + ' Details'} />
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h1 className="text-2xl font-bold">{character.name} Details</h1>
          <Link href={route('characters.index')} className="btn btn-sm">
            Back
          </Link>
        </div>
        <div className="flex justify-center">
          <CharacterPortrait character={character} className="h-32 w-32" />
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Adventures</h2>
            {character.adventures.length > 0 ? (
              <List>
                  {character.adventures.map((adv) => (
                    <ListRow key={adv.id}>
                      <h3>{adv.title || 'Adventure'}</h3>
                      <p className="text-base-content/50 truncate text-xs">
                        {adv.notes || 'No notes'}
                      </p>
                      <p className="text-xs">
                        {secondsToHourMinuteString(adv.duration)}
                      </p>
                      <div className="text-base-content/70 font-mono">
                        {format(new Date(adv.start_date), 'dd.MM.yyyy')}
                      </div>
                      <UpdateAdventureModal adventure={adv}>
                        <Button size="xs" modifier="square" variant="ghost">
                          <Settings size={14} />
                        </Button>
                      </UpdateAdventureModal>
                    </ListRow>
                  ))}
                </List>
              ) : (
                <p className="text-center text-sm text-base-content/70">No adventures</p>
              )}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Downtimes</h2>
            {character.downtimes.length > 0 ? (
              <List>
                  {character.downtimes.map((dt) => (
                    <ListRow key={dt.id}>
                      <h3 className="capitalize">{dt.type}</h3>
                      <p className="text-base-content/50 truncate text-xs">
                        {dt.notes || 'No notes'}
                      </p>
                      <p className="text-xs">{secondsToHourMinuteString(dt.duration)}</p>
                      <div className="text-base-content/70 font-mono">
                        {format(new Date(dt.start_date), 'dd.MM.yyyy')}
                      </div>
                      <UpdateDowntimeModal downtime={dt}>
                        <Button size="xs" modifier="square" variant="ghost">
                          <Settings size={14} />
                        </Button>
                      </UpdateDowntimeModal>
                    </ListRow>
                  ))}
                </List>
              ) : (
                <p className="text-center text-sm text-base-content/70">No downtimes</p>
              )}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Allies</h2>
            {character.allies.length > 0 ? (
              <List>
                  {character.allies.map((ally) => (
                    <ListRow key={ally.id}>
                      <div className="flex items-center gap-2 w-full">
                        <AllyPortrait ally={ally} />
                        <div className="grid flex-1 grid-cols-3 gap-2 text-sm">
                          <div>{ally.name}</div>
                          <div className="capitalize">{ally.standing}</div>
                          <div className="text-base-content/70">{ally.classes || '-'}</div>
                        </div>
                      </div>
                    </ListRow>
                  ))}
                </List>
              ) : (
                <p className="text-center text-sm text-base-content/70">No allies</p>
              )}
        </div>
      </div>
    </AppLayout>
  )
}
