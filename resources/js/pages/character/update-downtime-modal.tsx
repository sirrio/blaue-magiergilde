import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { Downtime, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Settings } from 'lucide-react'
import React from 'react'

const UpdateDowntimeModal = ({ downtime, children }: { downtime: Downtime; children?: React.ReactNode }) => {
  const initialFormData = {
    hours: Math.trunc(downtime.duration / 3600),
    minutes: Math.trunc((downtime.duration % 3600) / 60),
    start_date: downtime.start_date,
    notes: downtime.notes ?? '',
    type: downtime.type,
    character_id: downtime.character_id,
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
    post(route('downtimes.update', { downtime, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        {children ?? (
          <Button size="xs" modifier="square" variant="ghost" aria-label="Edit downtime" title="Edit downtime">
            <Settings size={14} />
          </Button>
        )}
      </ModalTrigger>
      <ModalTitle>Update downtime</ModalTitle>
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
          <Select value={data.type} onChange={(e) => setData('type', e.target.value as Downtime['type'])}>
            <SelectLabel>Type</SelectLabel>
            <SelectOptions>
              <option value="faction">Faction</option>
              <option value="other">Other (ex. Crafting, Spell Scribing, ...)</option>
            </SelectOptions>
          </Select>
          <Input errors={errors.start_date} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)}>
            Date
          </Input>
          <TextArea placeholder="Your notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default UpdateDowntimeModal
