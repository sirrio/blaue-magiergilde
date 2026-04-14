import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { calculateTier } from '@/helper/calculateTier'
import { calculateClassString } from '@/helper/calculateClassString'
import AppLayout from '@/layouts/app-layout'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CharacterCard } from '@/pages/character/character-card'
import StoreCharacterModal from '@/pages/character/store-character-modal'
import { Character } from '@/types'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, UniqueIdentifier, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { Head, router } from '@inertiajs/react'
import { Archive, BookUser, Copy, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'


export default function Index({ characters, guildCharacters }: { characters: Character[]; guildCharacters: Character[] }) {
  const t = useTranslate()
  const [updatingTrackingIds, setUpdatingTrackingIds] = useState<number[]>([])
  const [updatingAvatarMaskIds, setUpdatingAvatarMaskIds] = useState<number[]>([])
  const [updatingPrivateModeIds, setUpdatingPrivateModeIds] = useState<number[]>([])
  const [, startNavigationTransition] = useTransition()
  const visibleCharacters = useMemo(() => characters.filter((char) => !char.deleted_at), [characters])
  const [chars, setChars] = useState([...visibleCharacters])
  useEffect(() => {
    setChars([...visibleCharacters])
  }, [visibleCharacters])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active.id === over?.id) return

    updateCharacterOrder(active.id, over!.id)
  }

  function updateCharacterOrder(activeId: UniqueIdentifier, overId: UniqueIdentifier) {
    const oldIndex = chars.findIndex((char) => char.id === activeId)
    const newIndex = chars.findIndex((char) => char.id === overId)

    if (oldIndex < 0 || newIndex < 0) {
      return
    }

    const newOrder = arrayMove(chars, oldIndex, newIndex)
    setChars(newOrder)

    startNavigationTransition(() => {
      router.post(route('characters.sort'), { list: newOrder } as never, { preserveScroll: true })
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
      toast.show(t('characters.copyCharactersCopied'), 'info')
    })
  }

  const activeCharacterCount = characters.filter((char) => {
    if (char.deleted_at) return false
    if (!['approved', 'pending'].includes(char.guild_status ?? 'pending')) return false
    if (char.is_filler) return false
    return ['bt', 'lt'].includes(calculateTier(char))
  }).length + Math.max(0, characters.filter((char) => {
    if (char.deleted_at) return false
    if (!['approved', 'pending'].includes(char.guild_status ?? 'pending')) return false
    if (char.is_filler) return false
    return calculateTier(char) === 'ht'
  }).length - 2)
  const activeFillerCount = characters.filter((char) => {
    if (char.deleted_at) return false
    if (!['approved', 'pending'].includes(char.guild_status ?? 'pending')) return false
    return Boolean(char.is_filler)
  }).length
  const activeHighTierCount = characters.filter((char) => {
    if (char.deleted_at) return false
    if (!['approved', 'pending'].includes(char.guild_status ?? 'pending')) return false
    if (char.is_filler) return false
    return calculateTier(char) === 'ht'
  }).length
  const activeEpicCharacterCount = characters.filter((char) => {
    if (char.deleted_at) return false
    if (!['approved', 'pending'].includes(char.guild_status ?? 'pending')) return false
    if (char.is_filler) return false
    return calculateTier(char) === 'et'
  }).length
  const updateTrackingMode = (characterId: number, value: boolean) => {
    if (updatingTrackingIds.includes(characterId)) return

    setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, simplified_tracking: value } : char)))
    setUpdatingTrackingIds((currentIds) => [...currentIds, characterId])

    startNavigationTransition(() => {
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
    })
  }
  const updateAvatarMode = (characterId: number, value: boolean) => {
    if (updatingAvatarMaskIds.includes(characterId)) return

    setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, avatar_masked: value } : char)))
    setUpdatingAvatarMaskIds((currentIds) => [...currentIds, characterId])

    startNavigationTransition(() => {
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
    })
  }
  const updatePrivateMode = (characterId: number, value: boolean) => {
    if (updatingPrivateModeIds.includes(characterId)) return

    setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, private_mode: value } : char)))
    setUpdatingPrivateModeIds((currentIds) => [...currentIds, characterId])

    startNavigationTransition(() => {
      router.patch(
        route('characters.private-mode', characterId),
        { private_mode: value } as never,
        {
          preserveScroll: true,
          preserveState: true,
          onError: () => {
            const fallbackValue = visibleCharacters.find((char) => char.id === characterId)?.private_mode ?? false
            setChars((currentChars) => currentChars.map((char) => (char.id === characterId ? { ...char, private_mode: fallbackValue } : char)))
          },
          onFinish: () => setUpdatingPrivateModeIds((currentIds) => currentIds.filter((id) => id !== characterId)),
        },
      )
    })
  }

  return (
    <AppLayout>
      <Head title={t('characters.pageTitle')} />
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="flex flex-col justify-between gap-3 border-b border-base-200 pb-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold">
              {t('characters.heading')}{' '}
              <span className="text-base-content/50 ml-1 inline-block text-xs font-normal">{t('characters.activeCount', { count: activeCharacterCount })}</span>
              <span className="text-base-content/50 ml-2 inline-block text-xs font-normal">{t('characters.activeHighTierCount', { count: activeHighTierCount })}</span>
              <span className="text-base-content/50 ml-2 inline-block text-xs font-normal">{t('characters.activeFillerCount', { count: activeFillerCount })}</span>
              <span className="text-base-content/50 ml-2 inline-block text-xs font-normal">{t('characters.activeEpicCount', { count: activeEpicCharacterCount })}</span>
            </h1>
            <p className="text-xs text-base-content/70 sm:text-sm">{t('characters.subtitle')}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button size="sm" variant="ghost" className="flex items-center gap-1.5" onClick={() => copyCharactersToClipboard(characters)}>
              <Copy size={16} /> <span>{t('characters.copyCharacters')}</span>
            </Button>
            {chars.length > 0 && (
              <>
                <StoreCharacterModal>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>{t('characters.addCharacter')}</span>
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
            <h2 className="text-base-content text-lg font-semibold">{t('characters.noCharactersTitle')}</h2>
            <p className="text-base-content/70 text-sm">{t('characters.noCharactersBody')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <StoreCharacterModal>
                <Button variant="outline" className="flex items-center gap-2">
                  <Plus size={16} />
                  <span>{t('characters.createCharacter')}</span>
                </Button>
              </StoreCharacterModal>
            </div>
          </div>
        ) : (
          <div className={cn('grid grid-cols-1 items-start gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={chars} strategy={rectSortingStrategy}>
                {chars.map((char: Character) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    allCharacters={characters}
                    guildCharacters={guildCharacters}
                    isTrackingModeUpdating={updatingTrackingIds.includes(char.id)}
                    onTrackingModeChange={(value) => updateTrackingMode(char.id, value)}
                    isAvatarMaskedUpdating={updatingAvatarMaskIds.includes(char.id)}
                    onAvatarMaskedChange={(value) => updateAvatarMode(char.id, value)}
                    isPrivateModeUpdating={updatingPrivateModeIds.includes(char.id)}
                    onPrivateModeChange={(value) => updatePrivateMode(char.id, value)}
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
