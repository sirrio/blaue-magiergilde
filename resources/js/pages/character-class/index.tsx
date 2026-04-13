import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import AppLayout from '@/layouts/app-layout'
import { useTranslate } from '@/lib/i18n'
import { CharacterClass } from '@/types'
import { Deferred, Head, router, useForm } from '@inertiajs/react'
import { LoaderCircle, Pencil, Plus, Trash } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const StoreCharacterClassModal = ({ onSuccess }: { onSuccess: () => void }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    src: '',
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
  }, [isOpen, reset])

  const handleSubmit = () => {
    post(route('admin.character-classes.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        reset()
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus size={14} /> {t('compendium.addClass')}
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.addClass')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <Input errors={errors.name} placeholder="Fighter" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            {t('compendium.className')}
          </Input>
          <Input errors={errors.src} placeholder="PHB" value={data.src} onChange={(e) => setData('src', e.target.value)}>
            {t('compendium.classSource')}
          </Input>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

const UpdateCharacterClassModal = ({ characterClass, onSuccess }: { characterClass: CharacterClass; onSuccess: () => void }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: characterClass.name,
    src: characterClass.src ?? '',
    _method: 'put',
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('name', characterClass.name)
    setData('src', characterClass.src ?? '')
  }, [isOpen, reset, characterClass, setData])

  const handleSubmit = () => {
    post(route('admin.character-classes.update', { character_class: characterClass.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" onClick={() => setIsOpen(true)} aria-label={t('common.edit')}>
          <Pencil size={13} />
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.editClass')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <Input errors={errors.name} placeholder="Fighter" value={data.name} onChange={(e) => setData('name', e.target.value)}>
            {t('compendium.className')}
          </Input>
          <Input errors={errors.src} placeholder="PHB" value={data.src} onChange={(e) => setData('src', e.target.value)}>
            {t('compendium.classSource')}
          </Input>
        </div>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

const DestroyCharacterClassModal = ({ characterClass, onSuccess }: { characterClass: CharacterClass; onSuccess: () => void }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { post, processing } = useForm({})

  const handleSubmit = () => {
    post(route('admin.character-classes.destroy', { character_class: characterClass.id, _method: 'delete' }), {
      preserveScroll: true,
      onSuccess: () => {
        setIsOpen(false)
        onSuccess()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button size="xs" variant="ghost" modifier="square" color="error" onClick={() => setIsOpen(true)} aria-label={t('common.delete')}>
          <Trash size={13} />
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.deleteClass')}</ModalTitle>
      <ModalContent>
        <p>{t('compendium.deleteClassConfirm', { name: characterClass.name })}</p>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing} color="error">
        {t('common.delete')}
      </ModalAction>
    </Modal>
  )
}

export default function Index({
  characterClasses,
  canManage = false,
}: {
  characterClasses: CharacterClass[]
  canManage?: boolean
}) {
  const t = useTranslate()
  const [search, setSearch] = useState('')

  const reload = () => router.reload({ only: ['characterClasses'] })

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    router.get(route('admin.character-classes.index'), { search: value }, { preserveState: true, preserveScroll: true })
  }

  const total = characterClasses?.length ?? 0

  return (
    <AppLayout>
      <Head title={t('compendium.classesTitle')} />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{t('compendium.classesTitle')}</h1>
            <p className="text-sm text-base-content/70">{t('compendium.classesDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? <StoreCharacterClassModal onSuccess={reload} /> : null}
          </div>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4 space-y-3">
          <Input type="search" placeholder={t('compendium.searchByName')} value={search} onChange={handleSearch}>
            {t('common.search')}
          </Input>
          <p className="text-xs text-base-content/50">{total} {t('compendium.classesCount')}</p>
        </div>
        <Deferred
          fallback={
            <List>
              <ListRow>
                <LoaderCircle className="animate-spin" /> {t('compendium.loading')}
              </ListRow>
            </List>
          }
          data={['characterClasses']}
        >
          <List>
            {characterClasses?.map((cc) => (
              <ListRow key={cc.id}>
                <div className="flex flex-1 items-center gap-3">
                  <span className="font-medium">{cc.name}</span>
                  {cc.src ? (
                    <span className="rounded border border-base-300 px-1.5 py-0.5 text-xs text-base-content/60">{cc.src}</span>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
                    <UpdateCharacterClassModal characterClass={cc} onSuccess={reload} />
                    <DestroyCharacterClassModal characterClass={cc} onSuccess={reload} />
                  </div>
                ) : null}
              </ListRow>
            ))}
          </List>
        </Deferred>
      </div>
    </AppLayout>
  )
}
