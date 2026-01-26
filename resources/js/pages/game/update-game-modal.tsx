import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import DurationInputStack from '@/components/duration-input-stack'
import { Game, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import React from 'react'

const UpdateGameModal = ({
  game,
  children,
  isOpen,
  onClose,
}: {
  game: Game
  children?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
}) => {
  const initialFormData = {
    title: game.title ?? '',
    tier: game.tier,
    duration: game.duration ?? 0,
    start_date: game.start_date ?? new Date().toISOString().slice(0, 10),
    sessions: game.sessions ?? 1,
    has_additional_bubble: game.has_additional_bubble ?? false,
    coins_disabled: game.coins_disabled ?? false,
    tier_of_month_reward: game.tier_of_month_reward ?? '',
    notes: game.notes ?? '',
  }

  const { data, setData, put } = useForm(initialFormData)
  const { tiers, errors } = usePage<PageProps>().props
  const bubbleCount = Math.trunc(data.duration / 10800)
  const adventureType = data.coins_disabled ? 'moderated' : data.has_additional_bubble ? 'charquest' : 'standard'

  const handleAdventureTypeChange = (value: string) => {
    if (value === 'charquest') {
      setData('has_additional_bubble', true)
      setData('coins_disabled', false)
      return
    }
    if (value === 'moderated') {
      setData('has_additional_bubble', false)
      setData('coins_disabled', true)
      return
    }
    setData('has_additional_bubble', false)
    setData('coins_disabled', false)
  }

  const handleFormSubmit = () => {
    put(route('game-master-log.update', { game_master_log: game.id }), {
      preserveState: 'errors',
      preserveScroll: true,
      onSuccess: () => {
        onClose?.()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {children ? <ModalTrigger>{children}</ModalTrigger> : null}
      <ModalTitle>Edit Game</ModalTitle>
      <ModalContent>
        <form>
          <Input placeholder="Game Title" errors={errors.title} type="text" value={data.title} onChange={(e) => setData('title', e.target.value)}>
            Title
          </Input>
          <Select errors={errors.tier} value={data.tier} onChange={(e) => setData('tier', e.target.value as Game['tier'])}>
            <SelectLabel>Tier</SelectLabel>
            <SelectOptions>
              {Object.entries(tiers).map(([key, value]: [string, string]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </SelectOptions>
          </Select>
          <DurationInputStack
            mode="session"
            value={data.duration}
            onChange={(next) => setData('duration', next)}
            errors={errors.duration}
          />
          <p className="text-base-content/50 text-xs">
            Reward: {bubbleCount}
            {data.has_additional_bubble ? '+1' : ''} bubbles
          </p>
          <Select
            errors={errors.coins_disabled || errors.has_additional_bubble}
            value={adventureType}
            onChange={(e) => handleAdventureTypeChange(e.target.value)}
          >
            <SelectLabel>Adventure type</SelectLabel>
            <SelectOptions>
              <option value="standard">Standard</option>
              <option value="charquest">CharQuest (-1 coin, +1 bubble)</option>
              <option value="moderated">Moderated RP (no coins)</option>
            </SelectOptions>
          </Select>
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
            Date
          </Input>
          <TextArea placeholder="Notes" errors={errors.notes} value={data.notes} onChange={(e) => setData('notes', e.target.value)}>
            Notes
          </TextArea>
          <div className="space-y-2">
            <Checkbox
              errors={errors.tier_of_month_reward}
              checked={data.tier_of_month_reward !== ''}
              onChange={(e) => setData('tier_of_month_reward', e.target.checked ? 'bubble' : '')}
            >
              Tier of the Month Reward
            </Checkbox>
            {data.tier_of_month_reward !== '' ? (
              <Select
                errors={errors.tier_of_month_reward}
                value={data.tier_of_month_reward}
                onChange={(e) => setData('tier_of_month_reward', e.target.value)}
              >
                <SelectLabel>Tier of the Month Reward</SelectLabel>
                <SelectOptions>
                  <option value="bubble">Bubble (+1)</option>
                  <option value="coin">Coin (+1)</option>
                </SelectOptions>
              </Select>
            ) : null}
          </div>
        </form>
      </ModalContent>
      <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
    </Modal>
  )
}

export default UpdateGameModal
