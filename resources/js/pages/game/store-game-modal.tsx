import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import React from 'react'

const StoreGameModal = ({ children }: React.PropsWithChildren) => {
  const initialFormData = {
    title: '',
    tier: 'bt',
    duration: 0,
    start_date: new Date().toISOString().slice(0, 10),
    sessions: 1,
    has_additional_bubble: false,
    notes: '',
  }

  const { data, setData, post } = useForm(initialFormData)
  const { tiers, errors } = usePage<PageProps>().props

  const handleFormSubmit = () => {
    post(route('game-master-log.store'), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>{children}</ModalTrigger>
      <ModalTitle>Add Game</ModalTitle>
      <ModalContent>
        <form>
          <Input placeholder="Game Title" errors={errors.title} type="text" value={data.title} onChange={(e) => setData('title', e.target.value)}>
            Title
          </Input>
          <Select errors={errors.tier} value={data.tier} onChange={(e) => setData('tier', e.target.value)}>
            <SelectLabel>Tier</SelectLabel>
            <SelectOptions>
              {Object.entries(tiers).map(([key, value]: [string, string]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <Input
            placeholder="Duration"
            errors={errors.duration}
            type="number"
            value={data.duration}
            onChange={(e) => setData('duration', Number(e.target.value))}
          >
            Duration
          </Input>
          <Input
            placeholder="Sessions"
            errors={errors.sessions}
            type="number"
            value={data.sessions}
            onChange={(e) => setData('sessions', Number(e.target.value))}
          >
            Sessions
          </Input>
          <Input
            placeholder="Start Date"
            errors={errors.start_date}
            type="date"
            value={data.start_date}
            onChange={(e) => setData('start_date', e.target.value)}
          >
            Start Date
          </Input>
          <Checkbox
            errors={errors.has_additional_bubble}
            checked={data.has_additional_bubble}
            onChange={(e) => setData('has_additional_bubble', e.target.checked)}
          >
            Additional Bubble
          </Checkbox>
          <TextArea placeholder="Notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default StoreGameModal
