import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Character } from '@/types'
import { router } from '@inertiajs/react'
import { Trash } from 'lucide-react'

const DestroyCharacterModal = ({ character }: { character: Character }) => {
  const handleFormSubmit = () => {
    router.delete(route('characters.destroy', character.id), { preserveState: 'errors' })
  }

  return (
    <Modal>
      <ModalTrigger>
        <Button className={'hidden group-hover:flex'} size="xs" modifier="square" color="error">
          <Trash size={14} />
        </Button>
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
