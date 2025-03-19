import { Button } from '@/components/ui/button'
import Toast from '@/components/ui/toast'
import { calculateTier } from '@/helper/calculateTier'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { CharacterCard } from '@/pages/character/character-card'
import StoreCharacterModal from '@/pages/character/store-character-modal'
import { Character } from '@/types'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, TouchSensor, UniqueIdentifier, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { Head, router } from '@inertiajs/react'
import { Copy } from 'lucide-react'
import { useState } from 'react'

export default function Index({ characters }: { characters: Character[] }) {
  const visibleCharacters = characters.filter((char) => !char.deleted_at)
  const [chars, setChars] = useState([...visibleCharacters])
  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active.id === over?.id) return

    updateCharacterOrder(active.id, over!.id)
  }

  function updateCharacterOrder(activeId: UniqueIdentifier, overId: UniqueIdentifier) {
    setChars((prevChars) => {
      const oldIndex = prevChars.findIndex((char) => char.id === activeId)
      const newIndex = prevChars.findIndex((char) => char.id === overId)

      const newOrder = arrayMove(prevChars, oldIndex, newIndex)

      router.post(route('characters.sort'), { list: newOrder } as never, { preserveScroll: true })

      return newOrder
    })
  }

  const formatBlock = (label: string, characters: Character[], titleSuffix: string = 'Characters'): string => {
    if (characters.length === 0) return ''
    const header = `${label} ${titleSuffix}:\n`
    const body = characters
      .map((char) => {
        const classes = char.character_classes.map((cc) => cc.name).join(', ')
        return `**${char.name}** - ${classes} (${char.external_link})`
      })
      .join('\n')
    return header + body + '\n\n'
  }

  const copyCharactersToClipboard = (characters: Character[]) => {
    const activeCharacters = characters.filter((char) => !char.deleted_at)
    const charactersByTier = activeCharacters.reduce<Record<string, Character[]>>(
      (acc, char) => {
        const tier = calculateTier(char)
        acc[tier].push(char)
        return acc
      },
      { et: [], ht: [], lt: [], bt: [], filler: [] },
    )

    const result =
      formatBlock(':MG_ET:', charactersByTier.et) +
      formatBlock(':MG_HT:', charactersByTier.ht) +
      formatBlock(':MG_LT:', charactersByTier.lt) +
      formatBlock(':MG_BT:', charactersByTier.bt) +
      formatBlock(':Plus1:', charactersByTier.filler, 'Filler Character')

    navigator.clipboard.writeText(result).then(() => {
      Toast.show('Characters copied to clipboard', 'info')
    })
  }

  const activeCharacterCount = characters.filter((char) => !char.deleted_at && !(char.is_filler || calculateTier(char) === 'et')).length

  return (
    <AppLayout>
      <Head title="Characters" />
      <Toast />
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              Your characters
              <span className="ml-1 text-xs font-normal">{activeCharacterCount}/8</span>
              <Button className="ml-2" variant="ghost" modifier="square" size="xs" onClick={() => copyCharactersToClipboard(characters)}>
                <Copy size={14} />
              </Button>
            </h1>
            <p className="text-xs">Here you can manage all your characters.</p>
          </div>
          <div>
            <StoreCharacterModal></StoreCharacterModal>
          </div>
        </div>
        <div className={cn('mt-6 grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={chars} strategy={rectSortingStrategy}>
              {chars.map((char: Character) => (
                <CharacterCard key={char.id} character={char} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </AppLayout>
  )
}
