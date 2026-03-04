import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import DurationInputStack from '@/components/duration-input-stack'
import { useTranslate } from '@/lib/i18n'
import { Downtime, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Pencil } from 'lucide-react'
import React from 'react'

const UpdateDowntimeModal = ({
  downtime,
  children,
  isOpen,
  onClose,
  showTrigger = true,
}: {
  downtime: Downtime
  children?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
  showTrigger?: boolean
}) => {
  const t = useTranslate()
  const initialFormData = {
    duration: downtime.duration,
    start_date: downtime.start_date,
    notes: downtime.notes ?? '',
    type: downtime.type,
    character_id: downtime.character_id,
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage<PageProps>().props

  const handleFormSubmit = () => {
    post(route('downtimes.update', { downtime, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {showTrigger ? (
        <ModalTrigger>
          {children ?? (
            <Button size="xs" modifier="square" variant="ghost" aria-label={t('characters.editDowntime')} title={t('characters.editDowntime')}>
              <Pencil size={14} />
            </Button>
          )}
        </ModalTrigger>
      ) : null}
      <ModalTitle>{t('characters.editDowntimeTitle')}</ModalTitle>
      <ModalContent>
        <form>
          <DurationInputStack
            mode="downtime"
            value={data.duration}
            onChange={(next) => setData('duration', next)}
            errors={errors.duration}
          />
          <Select value={data.type} onChange={(e) => setData('type', e.target.value as Downtime['type'])}>
            <SelectLabel>{t('characters.type')}</SelectLabel>
            <SelectOptions>
              <option value="faction">Faction</option>
              <option value="other">{t('characters.downtimeTypeOther')}</option>
            </SelectOptions>
          </Select>
          <Input errors={errors.start_date} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)}>
            {t('characters.dateLabel')}
          </Input>
          <TextArea placeholder="Notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            {t('characters.notesLabel')}
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>{t('common.save')}</ModalAction>
    </Modal>
  )
}

export default UpdateDowntimeModal
