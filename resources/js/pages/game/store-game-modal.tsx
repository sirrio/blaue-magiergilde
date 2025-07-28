import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Toggle } from '@/components/ui/toggle'
import { TextArea } from '@/components/ui/text-area'
import { useForm, usePage } from '@inertiajs/react'
import React from 'react'

const StoreGameModal = ({ children }: React.PropsWithChildren) => {
  const initialFormData = {
    title: '',
    tier: '',
    duration: 0,
    start_date: new Date().toISOString().slice(0, 10),
    sessions: 1,
    has_additional_bubble: false,
    notes: '',
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage().props

  const handleFormSubmit = () => {
    post(route('games.store'), {
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
          <h3 className="mb-2 mt-2 font-semibold">Game Details</h3>
          <Input placeholder="Game Title" errors={errors.title} type="text" value={data.title} onChange={(e) => setData('title', e.target.value)}>
            Title
          </Input>
          <Input placeholder="Game Tier" errors={errors.tier} type="text" value={data.tier} onChange={(e) => setData('tier', e.target.value)}>
            Tier
          </Input>
          <Input
            className="w-24"
            placeholder="Duration"
            errors={errors.duration}
            type="number"
            value={data.duration}
            onChange={(e) => setData('duration', Number(e.target.value))}
          >
            Duration
          </Input>
          <Input
            className="w-24"
            placeholder="Sessions"
            errors={errors.sessions}
            type="number"
            value={data.sessions}
            onChange={(e) => setData('sessions', Number(e.target.value))}
          >
            Sessions
          </Input>
          <Input
            placeholder="DD.MM.YYYY"
            errors={errors.start_date}
            type="date"
            value={data.start_date}
            onChange={(e) => setData('start_date', e.target.value)}
          >
            Start Date
          </Input>
          <h3 className="mb-2 mt-4 font-semibold">Economy</h3>
          <Toggle
            label="Additional Bubble"
            errors={errors.has_additional_bubble}
            checked={data.has_additional_bubble}
            onChange={(e) => setData('has_additional_bubble', e.target.checked)}
          />
          <h3 className="mb-2 mt-4 font-semibold">Metadata</h3>
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
