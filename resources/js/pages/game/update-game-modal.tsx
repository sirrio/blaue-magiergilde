import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { MarkdownArea } from '@/components/ui/markdown-area'
import { Game } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import React from 'react'

const UpdateGameModal = ({ game, children }: { game: Game; children: React.ReactNode }) => {
  const initialFormData = {
    title: game.title,
    tier: game.tier,
    duration: game.duration,
    start_date: game.start_date,
    notes: game.notes,
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage().props

  const handleFormSubmit = () => {
    post(route('games.update', { game, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  return (
    <Modal>
      <ModalTrigger>{children}</ModalTrigger>
      <ModalTitle>Update Game</ModalTitle>
      <ModalContent>
        <form>
          <Input placeholder="Game Title" errors={errors.title} type="text" value={data.title} onChange={(e) => setData('title', e.target.value)}>
            Title
          </Input>
          <Input placeholder="Game Tier" errors={errors.tier} type="text" value={data.tier} onChange={(e) => setData('tier', e.target.value)}>
            Tier
          </Input>
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
            placeholder="Start Date"
            errors={errors.start_date}
            type="date"
            value={data.start_date}
            onChange={(e) => setData('start_date', e.target.value)}
          >
            Start Date
          </Input>
          <MarkdownArea placeholder="Notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </MarkdownArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default UpdateGameModal
