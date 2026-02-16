import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { calculateTier } from '@/helper/calculateTier'
import { calculateClassString } from '@/helper/calculateClassString'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { CharacterCard } from '@/pages/character/character-card'
import StoreCharacterModal from '@/pages/character/store-character-modal'
import { Character, PageProps } from '@/types'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, UniqueIdentifier, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { Head, router, usePage } from '@inertiajs/react'
import { Archive, BookUser, Copy, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export default function Index({ characters, guildCharacters }: { characters: Character[]; guildCharacters: Character[] }) {
  const { features } = usePage<PageProps>().props
  const isStatusSwitchEnabled = features?.character_status_switch ?? true
  const [updatingTrackingIds, setUpdatingTrackingIds] = useState<number[]>([])
  const [updatingAvatarMaskIds, setUpdatingAvatarMaskIds] = useState<number[]>([])
  const visibleCharacters = useMemo(() => characters.filter((char) => !char.deleted_at), [characters])
  const [chars, setChars] = useState([...visibleCharacters])
  useEffect(() => {
    setChars([...visibleCharacters])
  }, [visibleCharacters])
  const sensors = useSensors(useSensor(PointerSensor))

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
        const classes = calculateClassString(char)
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
      toast.show('Characters copied to clipboard', 'info')
    })
  }

  const activeCharacterCount = characters.filter((char) => {
    if (char.deleted_at) return false
    if (char.guild_status !== 'approved') return false
    if (char.is_filler) return false
    return ['bt', 'lt', 'ht'].includes(calculateTier(char))
  }).length
  const draftCharacterCount = characters.filter((char) => !char.deleted_at && char.guild_status === 'draft').length

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const test = () => {
    return router.post(route('auth.sync'), { email, password }, { preserveState: 'errors' })
  }

  const updateTrackingMode = (characterId: number, value: boolean) => {
    if (updatingTrackingIds.includes(characterId)) return

    setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, simplified_tracking: value } : char)))
    setUpdatingTrackingIds((currentIds) => [...currentIds, characterId])

    router.patch(
      route('characters.tracking', characterId),
      { simplified_tracking: value } as never,
      {
        preserveScroll: true,
        preserveState: true,
        onError: () => {
          const fallbackValue = visibleCharacters.find((char) => char.id === characterId)?.simplified_tracking ?? false
          setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, simplified_tracking: fallbackValue } : char)))
        },
        onFinish: () => setUpdatingTrackingIds((currentIds) => currentIds.filter((id) => id !== characterId)),
      },
    )
  }
  const updateAvatarMode = (characterId: number, value: boolean) => {
    if (updatingAvatarMaskIds.includes(characterId)) return

    setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, avatar_masked: value } : char)))
    setUpdatingAvatarMaskIds((currentIds) => [...currentIds, characterId])

    router.patch(
      route('characters.avatar-mode', characterId),
      { avatar_masked: value } as never,
      {
        preserveScroll: true,
        preserveState: true,
        onError: () => {
          const fallbackValue = visibleCharacters.find((char) => char.id === characterId)?.avatar_masked ?? true
          setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, avatar_masked: fallbackValue } : char)))
        },
        onFinish: () => setUpdatingAvatarMaskIds((currentIds) => currentIds.filter((id) => id !== characterId)),
      },
    )
  }

  return (
    <AppLayout>
      <Head title="Characters" />
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="flex flex-col justify-between gap-3 border-b border-base-200 pb-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-lg font-bold sm:text-xl">
              Your Characters{' '}
              <span className="text-base-content/50 ml-1 inline-block text-xs font-normal">{activeCharacterCount}/8 Active</span>
            </h1>
            <p className="text-xs text-base-content/70 sm:text-sm">Manage all your characters easily below.</p>
            {isStatusSwitchEnabled && draftCharacterCount > 0 ? (
              <p className="mt-1 text-xs text-warning">
                {draftCharacterCount} draft {draftCharacterCount === 1 ? 'character is' : 'characters are'} still private. Use
                "Register with Magiergilde" on a card to start review.
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button size="sm" variant="ghost" className="flex items-center gap-1.5" onClick={() => copyCharactersToClipboard(characters)}>
              <Copy size={16} /> <span>Copy Characters</span>
            </Button>
            {chars.length > 0 && (
              <>
                <StoreCharacterModal>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>Add Character</span>
                  </Button>
                </StoreCharacterModal>
                <Button as="a" href={route('characters.deleted')} size="sm" modifier="square" variant="outline">
                  <Archive size={16} />
                </Button>
              </>
            )}
          </div>
        </section>
        {chars.length === 0 ? (
          <div className="py-10 text-center">
            <BookUser size={64} className="text-base-content mx-auto mb-4" />
            <h2 className="text-base-content text-lg font-semibold">No characters yet</h2>
            <p className="text-base-content/70 text-sm">Start by creating or syncing your characters.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <StoreCharacterModal>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Plus size={16} />
                  <span>Create Character</span>
                </Button>
              </StoreCharacterModal>
              <Modal>
                <ModalTrigger>
                  <Button variant={'outline'} className="flex items-center space-x-2">
                    <RefreshCw size={16} />
                    <span>Sync Characters</span>
                  </Button>
                </ModalTrigger>
                <ModalTitle>Sync characters</ModalTitle>
                <ModalContent>
                  <Input type="email" placeholder="Enter your email" className="w-full" value={email} onChange={(e) => setEmail(e.target.value)}>
                    Email
                  </Input>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  >
                    Password
                  </Input>
                </ModalContent>
                <ModalAction onClick={() => test()}>Sync now</ModalAction>
              </Modal>
              <Button as="a" href={route('characters.deleted')} variant="outline" modifier="square">
                <Archive size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn('grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={chars} strategy={rectSortingStrategy}>
                {chars.map((char: Character) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    guildCharacters={guildCharacters}
                    isTrackingModeUpdating={updatingTrackingIds.includes(char.id)}
                    onTrackingModeChange={(value) => updateTrackingMode(char.id, value)}
                    isAvatarMaskedUpdating={updatingAvatarMaskIds.includes(char.id)}
                    onAvatarMaskedChange={(value) => updateAvatarMode(char.id, value)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
