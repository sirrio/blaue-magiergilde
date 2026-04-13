import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import AppLayout from '@/layouts/app-layout'
import { useTranslate } from '@/lib/i18n'
import { MundaneItemVariant } from '@/types'
import { Deferred, Head, router, useForm } from '@inertiajs/react'
import { LoaderCircle, Pencil, Plus, Shield, Sword, Trash } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const VariantForm = ({
  data,
  setData,
  errors,
}: {
  data: { name: string; slug: string; category: string; cost_gp: string; is_placeholder: boolean; sort_order: number }
  setData: (key: string, value: unknown) => void
  errors: Partial<Record<string, string>>
}) => {
  const t = useTranslate()
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input errors={errors.name} placeholder="Longsword" value={data.name} onChange={(e) => setData('name', e.target.value)}>
          {t('compendium.variantName')}
        </Input>
        <Input errors={errors.slug} placeholder="longsword" value={data.slug} onChange={(e) => setData('slug', e.target.value)}>
          Slug
        </Input>
      </div>
      <Select errors={errors.category} value={data.category} onChange={(e) => setData('category', e.target.value)}>
        <SelectLabel>{t('compendium.variantCategory')}</SelectLabel>
        <SelectOptions>
          <option value="weapon">{t('compendium.weapon')}</option>
          <option value="armor">{t('compendium.armor')}</option>
        </SelectOptions>
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          errors={errors.cost_gp}
          placeholder="15"
          type="number"
          min={0}
          step="0.01"
          value={data.cost_gp}
          onChange={(e) => setData('cost_gp', e.target.value)}
        >
          {t('compendium.variantCostGp')}
        </Input>
        <Input
          errors={errors.sort_order}
          placeholder="0"
          type="number"
          min={0}
          value={data.sort_order}
          onChange={(e) => setData('sort_order', Number(e.target.value))}
        >
          {t('compendium.variantSortOrder')}
        </Input>
      </div>
      <Checkbox
        errors={errors.is_placeholder}
        checked={data.is_placeholder}
        onChange={(e) => setData('is_placeholder', e.target.checked)}
      >
        {t('compendium.variantPlaceholder')}
      </Checkbox>
    </div>
  )
}

const StoreVariantModal = ({ onSuccess }: { onSuccess: () => void }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    slug: '',
    category: 'weapon',
    cost_gp: '',
    is_placeholder: false,
    sort_order: 0,
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('category', 'weapon')
  }, [isOpen, reset, setData])

  const handleSubmit = () => {
    post(route('admin.mundane-item-variants.store'), {
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
          <Plus size={14} /> {t('compendium.addVariant')}
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('compendium.addVariant')}</ModalTitle>
      <ModalContent>
        <VariantForm data={data} setData={(k, v) => setData(k as keyof typeof data, v as never)} errors={errors} />
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

const UpdateVariantModal = ({ variant, onSuccess }: { variant: MundaneItemVariant; onSuccess: () => void }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { data, setData, post, processing, reset, errors } = useForm({
    name: variant.name,
    slug: variant.slug,
    category: variant.category,
    cost_gp: variant.cost_gp != null ? String(variant.cost_gp) : '',
    is_placeholder: variant.is_placeholder ?? false,
    sort_order: variant.sort_order ?? 0,
    _method: 'put',
  })

  useEffect(() => {
    if (!isOpen) return
    reset()
    setData('name', variant.name)
    setData('slug', variant.slug)
    setData('category', variant.category)
    setData('cost_gp', variant.cost_gp != null ? String(variant.cost_gp) : '')
    setData('is_placeholder', variant.is_placeholder ?? false)
    setData('sort_order', variant.sort_order ?? 0)
  }, [isOpen, reset, variant, setData])

  const handleSubmit = () => {
    post(route('admin.mundane-item-variants.update', { mundane_item_variant: variant.id }), {
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
      <ModalTitle>{t('compendium.editVariant')}</ModalTitle>
      <ModalContent>
        <VariantForm data={data} setData={(k, v) => setData(k as keyof typeof data, v as never)} errors={errors} />
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {t('common.save')}
      </ModalAction>
    </Modal>
  )
}

const DestroyVariantModal = ({ variant, onSuccess }: { variant: MundaneItemVariant; onSuccess: () => void }) => {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(false)
  const { post, processing } = useForm({})

  const handleSubmit = () => {
    post(route('admin.mundane-item-variants.destroy', { mundane_item_variant: variant.id, _method: 'delete' }), {
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
      <ModalTitle>{t('compendium.deleteVariant')}</ModalTitle>
      <ModalContent>
        <p>{t('compendium.deleteVariantConfirm', { name: variant.name })}</p>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing} color="error">
        {t('common.delete')}
      </ModalAction>
    </Modal>
  )
}

export default function Index({
  variants,
  canManage = false,
}: {
  variants: MundaneItemVariant[]
  canManage?: boolean
}) {
  const t = useTranslate()
  const [search, setSearch] = useState('')
  const currentParams = route().params as Record<string, string | undefined>

  const reload = () => router.reload({ only: ['variants'] })

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(value)
    router.get(route('admin.mundane-item-variants.index'), { ...currentParams, search: value }, { preserveState: true, preserveScroll: true })
  }

  const navigateCategory = (category: string | null) => {
    router.get(route('admin.mundane-item-variants.index'), { ...currentParams, category: category ?? undefined }, { preserveState: true, preserveScroll: true })
  }

  const weapons = variants?.filter((v) => v.category === 'weapon') ?? []
  const armors = variants?.filter((v) => v.category === 'armor') ?? []
  const total = (variants?.length ?? 0)
  const activeFilters = [
    search ? `Search: ${search}` : null,
    currentParams.category ? `${t('compendium.variantCategory')}: ${currentParams.category}` : null,
  ].filter(Boolean) as string[]

  return (
    <AppLayout>
      <Head title={t('compendium.variantsTitle')} />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{t('compendium.variantsTitle')}</h1>
            <p className="text-sm text-base-content/70">{t('compendium.variantsDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? <StoreVariantModal onSuccess={reload} /> : null}
          </div>
        </section>
        <div className="rounded-box border border-base-200 bg-base-100 p-4 space-y-3">
          <Input type="search" placeholder={t('compendium.searchByName')} value={search} onChange={handleSearch}>
            {t('common.search')}
          </Input>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base-content/60">{t('compendium.variantCategory')}:</span>
            <div className="filter">
              <input className="btn btn-xs filter-reset" type="radio" name="category" aria-label="All"
                defaultChecked={!currentParams.category} onClick={() => navigateCategory(null)} />
              <input className="btn btn-xs" type="radio" name="category" aria-label={t('compendium.weapon')}
                defaultChecked={currentParams.category === 'weapon'} onClick={() => navigateCategory('weapon')} />
              <input className="btn btn-xs" type="radio" name="category" aria-label={t('compendium.armor')}
                defaultChecked={currentParams.category === 'armor'} onClick={() => navigateCategory('armor')} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/50">
            <span>{total} ({weapons.length} {t('compendium.weapon')} · {armors.length} {t('compendium.armor')})</span>
            {activeFilters.map((filter) => (
              <span key={filter} className="rounded-full border border-base-200 px-2 py-1 text-base-content/60">
                {filter}
              </span>
            ))}
          </div>
        </div>
        <Deferred
          fallback={
            <List>
              <ListRow>
                <LoaderCircle className="animate-spin" /> {t('compendium.loading')}
              </ListRow>
            </List>
          }
          data={['variants']}
        >
          <List>
            {variants?.map((variant) => (
              <ListRow key={variant.id}>
                <div className="flex flex-1 items-center gap-3">
                  {variant.category === 'weapon' ? (
                    <Sword size={13} className="shrink-0 text-base-content/40" />
                  ) : (
                    <Shield size={13} className="shrink-0 text-base-content/40" />
                  )}
                  <span className="font-medium">{variant.name}</span>
                  <span className="text-xs text-base-content/50">{variant.slug}</span>
                  {variant.is_placeholder ? (
                    <span className="rounded border border-base-300 px-1.5 py-0.5 text-xs text-base-content/50">{t('compendium.variantPlaceholder')}</span>
                  ) : null}
                </div>
                <span className="text-sm text-base-content/60">
                  {variant.cost_gp != null ? `${variant.cost_gp} GP` : '—'}
                </span>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
                    <UpdateVariantModal variant={variant} onSuccess={reload} />
                    <DestroyVariantModal variant={variant} onSuccess={reload} />
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
