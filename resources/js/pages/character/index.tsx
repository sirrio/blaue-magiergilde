import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { calculateTier } from '@/helper/calculateTier'
import { calculateClassString } from '@/helper/calculateClassString'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { ActionMenu } from '@/components/ui/action-menu'
import { CharacterCard } from '@/pages/character/character-card'
import StoreCharacterModal from '@/pages/character/store-character-modal'
import { Character } from '@/types'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, TouchSensor, UniqueIdentifier, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { Head, router, usePage } from '@inertiajs/react'
import type { PageProps } from '@/types'
import { Archive, BookUser, Copy, Plus, RefreshCw, SlidersHorizontal, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export default function Index({ characters, guildCharacters }: { characters: Character[]; guildCharacters: Character[] }) {
  const { features, auth } = usePage<PageProps>().props
  const [simplifiedTracking, setSimplifiedTracking] = useState(Boolean(auth.user?.simplified_tracking))
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false)
  useEffect(() => {
    const nextValue = Boolean(auth.user?.simplified_tracking)
    setSimplifiedTracking(nextValue)
  }, [auth.user?.simplified_tracking])
  const visibleCharacters = useMemo(() => characters.filter((char) => !char.deleted_at), [characters])
  const [chars, setChars] = useState([...visibleCharacters])
  useEffect(() => {
    setChars([...visibleCharacters])
  }, [visibleCharacters])
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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const test = () => {
    if (!features.discord) return
    return router.post(route('auth.sync'), { email, password }, { preserveState: 'errors' })
  }

  const updateTrackingMode = (value: boolean) => {
    if (isUpdatingTracking) return
    setSimplifiedTracking(value)
    setIsUpdatingTracking(true)
    router.patch(
      route('characters.tracking'),
      { simplified_tracking: value },
      {
        preserveScroll: true,
        preserveState: true,
        onError: () => setSimplifiedTracking(Boolean(auth.user?.simplified_tracking)),
        onFinish: () => setIsUpdatingTracking(false),
      },
    )
  }

  return (
    <AppLayout>
      <Head title="Characters" />
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="flex flex-col justify-between gap-2 border-b pb-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Your Characters <span className="text-base-content/50 ml-1 text-sm font-normal">{activeCharacterCount}/8 Active</span>
              {simplifiedTracking ? (
                <span className="ml-2 rounded-full border border-base-200 bg-base-100 px-2 py-0.5 text-[11px] font-semibold text-base-content/70">
                  Simplified tracking
                </span>
              ) : null}
            </h1>
            <p className="text-base-content/70 text-sm">Manage all your characters easily below.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" variant="ghost" className="flex items-center space-x-1" onClick={() => copyCharactersToClipboard(characters)}>
              <Copy size={16} /> <span>Copy Characters</span>
            </Button>
            <ActionMenu
              items={[
                {
                  label: 'Use standard tracking',
                  onSelect: () => updateTrackingMode(false),
                  disabled: isUpdatingTracking || !simplifiedTracking,
                  active: !simplifiedTracking,
                  icon: <SlidersHorizontal size={14} />,
                },
                {
                  label: 'Use simplified tracking',
                  onSelect: () => updateTrackingMode(true),
                  disabled: isUpdatingTracking || simplifiedTracking,
                  active: simplifiedTracking,
                  icon: <Zap size={14} />,
                },
              ]}
            />
            {chars.length > 0 && (
              <>
                <StoreCharacterModal>
                  <Button size="sm" variant="outline" className="flex items-center space-x-2">
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
            <div className="mt-6 flex justify-center gap-4">
              <StoreCharacterModal>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Plus size={16} />
                  <span>Create Character</span>
                </Button>
              </StoreCharacterModal>
              {features.discord && (
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
              )}
              <Button as="a" href={route('characters.deleted')} variant="outline" modifier="square">
                <Archive size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={chars} strategy={rectSortingStrategy}>
                {chars.map((char: Character) => (
                  <CharacterCard key={char.id} character={char} guildCharacters={guildCharacters} simplifiedTrackingOverride={simplifiedTracking} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
