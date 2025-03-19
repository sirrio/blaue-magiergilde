import React, { useState, ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePage } from '@inertiajs/react'
import { PageProps } from '@/types'

type ModalProps = { children: ReactNode, isOpen?: boolean }
type ModalTriggerProps = { children: ReactNode }
type ModalContentProps = { children: ReactNode }
type ModalTitleProps = { children: ReactNode }
type ModalActionProps = {
  children: ReactNode;
  variant?: '' | 'success' | 'error';
  onClick?: () => void;
}

function findChildByType<T>(children: ReactNode, componentType: React.FC<T>): ReactNode | null {
  return React.Children.toArray(children).find(child =>
    React.isValidElement(child) && child.type === componentType
  ) || null
}


export const Modal = ({ children }: ModalProps) => {
  const triggerElement = findChildByType(children, ModalTrigger)
  const titleElement = findChildByType(children, ModalTitle)
  const contentElement = findChildByType(children, ModalContent)
  const actionElement = findChildByType(children, ModalAction)

  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return (
    <>
      <div onClick={() => openModal()}>{triggerElement}</div>
      <dialog className="modal modal-bottom sm:modal-middle" open={isOpen}>
        <div className="modal-box">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => closeModal()}
            >
              <XIcon size={18} />
            </button>
          </form>
          <h3 className="font-semibold mb-2">
            {titleElement}
          </h3>

          <div className="text-sm">
            {contentElement}
          </div>

          <div className="modal-action">
            {actionElement}
          </div>
        </div>
      </dialog>
    </>
  )
}

export const ModalTrigger = ({ children }: ModalTriggerProps) => (
  <div>{children}</div>
)

export const ModalContent = ({ children }: ModalContentProps) => <>{children}</>

export const ModalTitle = ({ children }: ModalTitleProps) => <>{children}</>

export const ModalAction = ({ children, variant, onClick }: ModalActionProps) => (
  <button
    className={cn(
      'btn btn-outline',
      variant === 'success' ? 'btn-success' : '',
      variant === 'error' ? 'btn-error' : ''
    )}
    onClick={() => {
      onClick?.()
    }}
  >
    {children}
  </button>
)
