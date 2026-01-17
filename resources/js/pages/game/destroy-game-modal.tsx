import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Game } from '@/types'
import { router } from '@inertiajs/react'
import { Trash } from 'lucide-react'
import React from 'react'

const DestroyGameModal = ({ game, children }: { game: Game; children?: React.ReactNode }) => {
  const handleFormSubmit = () => {
    router.delete(route('game-master-log.destroy', { game_master_log: game.id }), {
      preserveScroll: true,
      preserveState: 'errors',
    })
  }

  return (
    <Modal>
      {children ? <ModalTrigger>{children}</ModalTrigger> : null}
      <ModalTitle>Delete Game</ModalTitle>
      <ModalContent>
        <p>
          Your game &quot;{game.title ?? 'Game'}&quot; will be deleted. Are you sure?
        </p>
      </ModalContent>
      <ModalAction variant="error" onClick={handleFormSubmit}>
        Delete
      </ModalAction>
    </Modal>
  )
}

const DestroyGameButton = ({ label }: { label?: string }) => (
  <Button size="xs" variant="ghost" modifier="square" color="error" aria-label={label ?? 'Delete game'} title={label ?? 'Delete game'}>
    <Trash size={14} />
  </Button>
)

export { DestroyGameButton }
export default DestroyGameModal
