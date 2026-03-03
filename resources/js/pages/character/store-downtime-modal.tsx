import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import DurationInputStack from '@/components/duration-input-stack'
import { useTranslate } from '@/lib/i18n'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { FlameKindling } from 'lucide-react'

const StoreDowntimeModal = ({ character }: { character: Character }) => {
  const t = useTranslate()
  const initialFormData = {
    duration: 0,
    character_id: character.id,
    start_date: new Date().toISOString().slice(0, 10),
    notes: '',
    type: 'faction',
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage<PageProps>().props

  const handleFormSubmit = () => {
    post(route('downtimes.store'), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        <Button
          size="sm"
          className="w-full justify-center gap-1"
          disabled={character.is_filler}
          aria-label={t('characters.addDowntime')}
          title={t('characters.addDowntime')}
        >
          <FlameKindling size={14} />
          <span className="md:hidden">{t('characters.downtime')}</span>
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('characters.addDowntimeTitle')}</ModalTitle>
      <ModalContent>
        <form>
          <DurationInputStack
            mode="downtime"
            value={data.duration}
            onChange={(next) => setData('duration', next)}
            errors={errors.duration}
          />
          <Select value={data.type} onChange={(e) => setData('type', e.target.value)}>
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

export default StoreDowntimeModal
