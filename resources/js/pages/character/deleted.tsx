import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { List, ListRow } from '@/components/ui/list'
import AppLayout from '@/layouts/app-layout'
import { Character } from '@/types'
import { Head, router, Link } from '@inertiajs/react'
import { RotateCcw } from 'lucide-react'

export default function Deleted({ characters }: { characters: Character[] }) {
  const restore = (id: number) => {
    router.post(route('characters.restore-deleted', id))
  }

  return (
    <AppLayout>
      <Head title="Restore Characters" />
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h1 className="text-2xl font-bold">Deleted Characters</h1>
          <Link href={route('characters.index')} className="btn btn-sm">
            Back
          </Link>
        </div>
        <Card>
          <CardBody>
            <CardTitle>Restore</CardTitle>
            <CardContent>
              {characters.length === 0 ? (
                <p className="text-center text-sm text-base-content/70">No deleted characters</p>
              ) : (
                <List>
                  {characters.map((char) => (
                    <ListRow key={char.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{char.name}</span>
                        <Button size="xs" modifier="square" onClick={() => restore(char.id)}>
                          <RotateCcw size={14} />
                        </Button>
                      </div>
                    </ListRow>
                  ))}
                </List>
              )}
            </CardContent>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
