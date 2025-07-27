import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { MarkdownArea } from '@/components/ui/markdown-area'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { FlameKindling } from 'lucide-react'

const StoreDowntimeModal = ({ character }: { character: Character }) => {
  const initialFormData = {
    hours: 0,
    minutes: 0,
    character_id: character.id,
    start_date: new Date().toISOString().slice(0, 10),
    notes: '',
    type: 'faction',
  }

  const { data, setData, post, transform } = useForm(initialFormData)
  const { errors } = usePage<PageProps>().props

  const handleFormSubmit = () => {
    transform((data) => {
      return {
        duration: data.hours * 60 * 60 + data.minutes * 60,
        start_date: data.start_date,
        type: data.type,
        notes: data.notes,
        character_id: data.character_id,
      }
    })
    post(route('downtimes.store'), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        <Button size="sm" className={'w-full'} disabled={character.is_filler}>
          <FlameKindling size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Add downtime</ModalTitle>
      <ModalContent>
        <form>
          <div className={'grid grid-cols-2 gap-2'}>
            <Input value={data.hours} type={'number'} min={0} step={1} onChange={(e) => setData('hours', Number(e.target.value))}>
              Hours
            </Input>
            <Input value={data.minutes} type={'number'} min={0} max={59} step={1} onChange={(e) => setData('minutes', Number(e.target.value))}>
              Minutes
            </Input>
          </div>
          {errors.duration && <p className={'fieldset-label text-error'}>{errors.duration}</p>}
          <Select value={data.type} onChange={(e) => setData('type', e.target.value)}>
            <SelectLabel>Type</SelectLabel>
            <SelectOptions>
              <option value="faction">Faction</option>
              <option value="other">Other (ex. Crafting, Spell Scribing, ...)</option>
            </SelectOptions>
          </Select>
          <Input errors={errors.start_date} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)}>
            Date
          </Input>
          <MarkdownArea placeholder="Your notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </MarkdownArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default StoreDowntimeModal
