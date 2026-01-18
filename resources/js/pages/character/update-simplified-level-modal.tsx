import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { calculateLevel } from '@/helper/calculateLevel'
import { Character } from '@/types'
import { useForm } from '@inertiajs/react'
import { useMemo, useState } from 'react'

const UpdateSimplifiedLevelModal = ({ character }: { character: Character }) => {
  const [isOpen, setIsOpen] = useState(false)
  const defaultLevel = useMemo(
    () => character.simplified_level ?? calculateLevel(character),
    [character],
  )
  const { data, setData, patch, processing, errors } = useForm({
    simplified_level: defaultLevel,
  })

  const handleSubmit = () => {
    patch(route('characters.simplified-level', { character: character.id }), {
      preserveScroll: true,
      onSuccess: () => setIsOpen(false),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTrigger>
        <Button
          size="sm"
          onClick={() => {
            setData('simplified_level', defaultLevel)
            setIsOpen(true)
          }}
        >
          Set Level
        </Button>
      </ModalTrigger>
      <ModalTitle>Set current level</ModalTitle>
      <ModalContent>
        <p className="text-sm text-base-content/70">
          Simplified tracking skips adventures and downtime. Set the current level to update the tier display.
        </p>
        <Input
          type="number"
          min={1}
          max={20}
          value={data.simplified_level ?? ''}
          onChange={(event) => {
            const value = Number(event.target.value)
            setData('simplified_level', Number.isFinite(value) ? value : 1)
          }}
          errors={errors.simplified_level}
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

export default UpdateSimplifiedLevelModal
