import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { TextArea } from '@/components/ui/text-area'
import AdventureParticipantPicker from '@/pages/character/adventure-ally-picker'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Droplets, Swords } from 'lucide-react'
import React from 'react'

const MAX_DURATION = 99 * 3600
const MIN_DURATION = 0
const FIFTEEN_MINUTES_DELTA = 900
const ONE_HOUR_DELTA = 3600

const StoreAdventureModal = ({ character, guildCharacters = [] }: { character: Character; guildCharacters?: Character[] }) => {
  const initialFormData = {
    duration: 10800,
    character_id: character.id,
    start_date: new Date().toISOString().slice(0, 10),
    has_additional_bubble: false,
    notes: '',
    title: '',
    game_master: '',
    ally_ids: [] as number[],
    guild_character_ids: [] as number[],
  }

  const { data, setData, post } = useForm(initialFormData)
  const { errors } = usePage<PageProps>().props

  const handleFormSubmit = () => {
    post(route('adventures.store'), {
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
        <Button size="sm" className="w-full" aria-label="Add adventure" title="Add adventure">
          <Swords size={14} />
        </Button>
      </ModalTrigger>
      <ModalTitle>Add adventure</ModalTitle>
      <ModalContent>
        <form>
          <div>
            <div className="text flex items-center justify-center font-mono text-5xl font-bold sm:text-7xl">
              <div className="mr-5 flex flex-col gap-1 sm:flex-row">
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => adjustDuration(-FIFTEEN_MINUTES_DELTA, e)}
                  size="xs"
                  variant="outline"
                  color="error"
                >
                  -15m
                </Button>
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => adjustDuration(-ONE_HOUR_DELTA, e)}
                  size="xs"
                  variant="outline"
                  color="error"
                >
                  -1h
                </Button>
              </div>
              <div>{hours}</div>
              <div>:</div>
              <div>{minutes}</div>
              <div className="ml-5 flex flex-col gap-1 sm:flex-row">
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => adjustDuration(FIFTEEN_MINUTES_DELTA, e)}
                  size="xs"
                  variant="outline"
                  color="success"
                >
                  +15m
                </Button>
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => adjustDuration(ONE_HOUR_DELTA, e)}
                  size="xs"
                  variant="outline"
                  color="success"
                >
                  +1h
                </Button>
              </div>
            </div>
            <div className="text-base-content/50 flex items-center justify-center font-mono whitespace-pre-wrap">
              (Reward {bubbleCount}
              {data.has_additional_bubble ? '+1' : ''}
              <Droplets size={13} />)
            </div>
            {errors.duration && <p className={'fieldset-label text-error flex items-center justify-center text-center'}>{errors.duration}</p>}
          </div>
          <Input
            placeholder="Dragons in Waterdeep"
            errors={errors.title}
            type="text"
            value={data.title}
            onChange={(e) => setData('title', e.target.value)}
          >
            Game title
          </Input>
          <Input
            placeholder="Matt Mercer"
            errors={errors.game_master}
            type="text"
            value={data.game_master}
            onChange={(e) => setData('game_master', e.target.value)}
          >
            Game master
          </Input>
          <Input errors={errors.start_date} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)}>
            Date
          </Input>
          <Checkbox
            errors={errors.has_additional_bubble}
            checked={data.has_additional_bubble}
            onChange={(e) => setData('has_additional_bubble', e.target.checked)}
          >
            Additional bubble (ex. Char Quest, Event Quest, ...)
          </Checkbox>
          <TextArea placeholder="Your notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
          <AdventureParticipantPicker
            allies={character.allies ?? []}
            guildCharacters={guildCharacters.filter((entry) => entry.id !== character.id)}
            selectedAllyIds={data.ally_ids}
            selectedGuildCharacterIds={data.guild_character_ids}
            onChange={({ allyIds, guildCharacterIds }) => {
              setData('ally_ids', allyIds)
              setData('guild_character_ids', guildCharacterIds)
            }}
          />
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default StoreAdventureModal
