import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { List, ListRow } from '@/components/ui/list'
import AppLayout from '@/layouts/app-layout'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { Character } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { format } from 'date-fns'

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

        <Card>
          <CardBody>
            <CardTitle>Adventures</CardTitle>
            <CardContent>
              {character.adventures.length > 0 ? (
                <List>
                  {character.adventures.map((adv) => (
                    <ListRow key={adv.id}>
                      <div className="grid grid-cols-3 gap-2 text-sm w-full">
                        <div>{adv.title || 'Adventure'}</div>
                        <div className="text-base-content/70">
                          {format(new Date(adv.start_date), 'dd.MM.yyyy')}
                        </div>
                        <div className="text-base-content/70">
                          {secondsToHourMinuteString(adv.duration)}
                        </div>
                      </div>
                    </ListRow>
                  ))}
                </List>
              ) : (
                <p className="text-center text-sm text-base-content/70">No adventures</p>
              )}
            </CardContent>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Downtimes</CardTitle>
            <CardContent>
              {character.downtimes.length > 0 ? (
                <List>
                  {character.downtimes.map((dt) => (
                    <ListRow key={dt.id}>
                      <div className="grid grid-cols-3 gap-2 text-sm w-full">
                        <div className="capitalize">{dt.type}</div>
                        <div className="text-base-content/70">
                          {format(new Date(dt.start_date), 'dd.MM.yyyy')}
                        </div>
                        <div className="text-base-content/70">
                          {secondsToHourMinuteString(dt.duration)}
                        </div>
                      </div>
                    </ListRow>
                  ))}
                </List>
              ) : (
                <p className="text-center text-sm text-base-content/70">No downtimes</p>
              )}
            </CardContent>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Allies</CardTitle>
            <CardContent>
              {character.allies.length > 0 ? (
                <List>
                  {character.allies.map((ally) => (
                    <ListRow key={ally.id}>
                      <div className="grid grid-cols-3 gap-2 text-sm w-full">
                        <div>{ally.name}</div>
                        <div className="capitalize">{ally.standing}</div>
                        <div className="text-base-content/70">{ally.classes || '-'}</div>
                      </div>
                    </ListRow>
                  ))}
                </List>
              ) : (
                <p className="text-center text-sm text-base-content/70">No allies</p>
              )}
            </CardContent>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
