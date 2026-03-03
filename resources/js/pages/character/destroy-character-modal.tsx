import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { useTranslate } from '@/lib/i18n'
import { Character } from '@/types'
import { router } from '@inertiajs/react'
import { Trash } from 'lucide-react'
import React from 'react'

const DestroyCharacterModal = ({ character, children }: { character: Character; children?: React.ReactNode }) => {
  const t = useTranslate()

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
            aria-label={t('characters.deleteCharacter')}
            title={t('characters.deleteCharacter')}
          >
            <Trash size={14} />
          </Button>
        )}
      </ModalTrigger>
      <ModalTitle>{t('characters.deleteModalTitle')}</ModalTitle>
      <ModalContent>
        <p>{t('characters.deleteModalBody', { name: character.name })}</p>
      </ModalContent>
      <ModalAction variant={'error'} onClick={handleFormSubmit}>
        {t('common.delete')}
      </ModalAction>
    </Modal>
  )
}
export default DestroyCharacterModal
