import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { calculateLevel } from '@/helper/calculateLevel'
import { Character, PageProps } from '@/types'
import { useForm, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Gauge } from 'lucide-react'
import React from 'react'

const SetCharacterLevelModal = ({ character }: { character: Character }) => {
  const { errors } = usePage<PageProps>().props
  const initialLevel = calculateLevel(character)
  const { data, setData, post, processing } = useForm({ level: initialLevel })

  const handleSubmit = () => {
    post(route('characters.quick-level', character.id), {
      preserveScroll: true,
      preserveState: 'errors',
    })
  }

  return (
    <Modal>
      <ModalTrigger>
        <Button size="sm" className="w-full">
          <Gauge size={14} />
          Set level
        </Button>
      </ModalTrigger>
      <ModalTitle>Set level</ModalTitle>
      <ModalContent>
        <Input
          type="number"
          min={1}
          max={20}
          errors={errors.level}
          value={data.level}
          onChange={(e) => setData('level', Number(e.target.value))}
        >
          Level
        </Input>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        Save
      </ModalAction>
    </Modal>
  )
}

export default SetCharacterLevelModal
