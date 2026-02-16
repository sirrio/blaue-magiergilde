import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Character } from '@/types'
import { router } from '@inertiajs/react'
import { Trash } from 'lucide-react'
import React from 'react'

const DestroyCharacterModal = ({ character, children }: { character: Character; children?: React.ReactNode }) => {
  const handleFormSubmit = () => {
    router.delete(route('characters.destroy', character.id), { preserveState: 'errors' })
  }

  return (
    <Modal>
      <ModalTrigger>
        {children ?? (
          <Button
            className="flex md:hidden md:group-hover:flex"
            size="xs"
            modifier="square"
            color="error"
            aria-label="Delete character"
            title="Delete character"
          >
            <Trash size={14} />
          </Button>
        )}
      </ModalTrigger>
      <ModalTitle>Delete</ModalTitle>
      <ModalContent>
        <p>Your character "{character.name}" will be deleted. Are you sure?</p>
      </ModalContent>
      <ModalAction variant={'error'} onClick={handleFormSubmit}>
        Delete
      </ModalAction>
    </Modal>
  )
}
export default DestroyCharacterModal
