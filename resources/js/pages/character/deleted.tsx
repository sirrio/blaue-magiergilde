import { Button } from '@/components/ui/button'
import { List, ListRow } from '@/components/ui/list'
import { calculateClassString } from '@/helper/calculateClassString'
import { calculateLevel } from '@/helper/calculateLevel'
import AppLayout from '@/layouts/app-layout'
import { Character } from '@/types'
import { Head, router, Link } from '@inertiajs/react'
import { Eye, RotateCcw, Trash } from 'lucide-react'

export default function Deleted({ characters }: { characters: Character[] }) {
  const restore = (id: number) => {
    router.post(route('characters.restore-deleted', id))
  }

  const forceDelete = (id: number) => {
    if (!window.confirm('Diesen gelöschten Charakter endgültig löschen? Dies kann nicht rückgängig gemacht werden.')) {
      return
    }

    router.delete(route('characters.force-delete', id))
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
        <h2 className="text-xl font-semibold">Restore</h2>
        {characters.length === 0 ? (
          <p className="text-center text-sm text-base-content/70">No deleted characters</p>
        ) : (
          <List>
            {characters.map((char) => (
              <ListRow key={char.id} className="grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="truncate font-medium leading-none">{char.name}</p>
                  <p className="text-xs text-base-content/70">
                    Level {calculateLevel(char)} {calculateClassString(char)}
                  </p>
                </div>
                <div className="justify-self-end flex items-center gap-2">
                  <Link href={route('characters.deleted.show', char.id)} className="btn btn-xs btn-ghost btn-square" title="Details">
                    <Eye size={14} />
                  </Link>
                  <Button size="xs" variant="ghost" modifier="square" onClick={() => restore(char.id)} title="Restore">
                    <RotateCcw size={14} />
                  </Button>
                  {char.can_force_delete ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      modifier="square"
                      color="error"
                      onClick={() => forceDelete(char.id)}
                      title="Endgültig löschen"
                    >
                      <Trash size={14} />
                    </Button>
                  ) : (
                    <span title={char.force_delete_block_reason ?? 'Nicht möglich'}>
                      <Button
                        size="xs"
                        variant="ghost"
                        modifier="square"
                        color="error"
                        disabled
                        title={char.force_delete_block_reason ?? 'Nicht möglich'}
                      >
                        <Trash size={14} />
                      </Button>
                    </span>
                  )}
                </div>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </AppLayout>
  )
}
