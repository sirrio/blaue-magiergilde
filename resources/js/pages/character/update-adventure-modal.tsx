import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import { Adventure, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Settings } from 'lucide-react'
import React from 'react'

const MAX_DURATION = 99 * 3600
const MIN_DURATION = 0
const FIFTEEN_MINUTES_DELTA = 900
const ONE_HOUR_DELTA = 3600

const UpdateAdventureModal = ({ adventure, children }: { adventure: Adventure; children?: React.ReactNode }) => {
  const initialFormData = {
    duration: adventure.duration,
    character_id: adventure.character_id,
    start_date: adventure.start_date,
    has_additional_bubble: adventure.has_additional_bubble,
    notes: adventure.notes ?? '',
    title: adventure.title ?? '',
    game_master: adventure.game_master ?? '',
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage<PageProps>().props

  const handleFormSubmit = () => {
    post(route('adventures.update', { adventure, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  const adjustDuration = (delta: number, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const newDuration = Math.max(MIN_DURATION, Math.min(data.duration + delta, MAX_DURATION))
    setData('duration', newDuration)
  }

  const getFormattedDuration = (duration: number): [string, string] => {
    const hours = String(Math.trunc(duration / 3600)).padStart(2, '0')
    const minutes = String(Math.trunc((duration % 3600) / 60)).padStart(2, '0')
    return [hours, minutes]
  }

  const [hours, minutes] = getFormattedDuration(data.duration)
  const bubbleCount = Math.trunc(data.duration / 10800)

  return (
    <Modal>
      <ModalTrigger>
        {children ?? (
          <Button size="xs" modifier="square" variant="ghost" aria-label="Edit adventure" title="Edit adventure">
            <Settings size={14} />
          </Button>
        )}
      </ModalTrigger>
      <ModalTitle>Update adventure</ModalTitle>
      <ModalContent>
        <form>
          <div className="text flex items-center justify-center font-mono text-5xl font-bold sm:text-7xl">
            <div className="mr-5 flex flex-col gap-1 sm:flex-row">
              <Button onClick={(e) => adjustDuration(-FIFTEEN_MINUTES_DELTA, e)} size="xs" variant="outline" color="error">
                -15m
              </Button>
              <Button onClick={(e) => adjustDuration(-ONE_HOUR_DELTA, e)} size="xs" variant="outline" color="error">
                -1h
              </Button>
            </div>
            <div>{hours}</div>
            <div>:</div>
            <div>{minutes}</div>
            <div className="ml-5 flex flex-col gap-1 sm:flex-row">
              <Button onClick={(e) => adjustDuration(FIFTEEN_MINUTES_DELTA, e)} size="xs" variant="outline" color="success">
                +15m
              </Button>
              <Button onClick={(e) => adjustDuration(ONE_HOUR_DELTA, e)} size="xs" variant="outline" color="success">
                +1h
              </Button>
            </div>
          </div>
          <div className="text-base-content/50 flex items-center justify-center font-mono whitespace-pre-wrap">
            (Reward {bubbleCount}
            {data.has_additional_bubble ? '+1' : ''})
          </div>
          {errors.duration && <p className="fieldset-label text-error flex items-center justify-center text-center">{errors.duration}</p>}
          <Input
            placeholder="Dragons in Waterdeep"
            errors={errors.title}
            type="text"
            value={data.title}
            onChange={(e) => setData('title', e.target.value)}
          >
            Game title
          </Input>
          <Input placeholder="Matt Mercer" errors={errors.game_master} type="text" value={data.game_master} onChange={(e) => setData('game_master', e.target.value)}>
            Game master
          </Input>
          <Input errors={errors.start_date} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)}>
            Date
          </Input>
          <Checkbox errors={errors.has_additional_bubble} checked={data.has_additional_bubble} onChange={(e) => setData('has_additional_bubble', e.target.checked)}>
            Additional bubble (ex. Char Quest, Event Quest, ...)
          </Checkbox>
          <TextArea placeholder="Your notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default UpdateAdventureModal
