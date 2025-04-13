import React, { useState, ReactNode, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
  children: ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  wide?: boolean;
};
type ModalTriggerProps = { children: ReactNode };
type ModalContentProps = { children: ReactNode };
type ModalTitleProps = { children: ReactNode };
type ModalActionProps = {
  children: ReactNode;
  variant?: '' | 'success' | 'error';
  onClick?: () => void;
};

function findChildByType<T>(
  children: ReactNode,
  componentType: React.FC<T>
): ReactNode | null {
  return (
    React.Children.toArray(children).find(
      (child) =>
        React.isValidElement(child) && child.type === componentType
    ) || null
  );
}

export const Modal = ({ children, isOpen: controlledOpen, onClose, wide = false }: ModalProps) => {
  const triggerElement = findChildByType(children, ModalTrigger);
  const titleElement = findChildByType(children, ModalTitle);
  const contentElement = findChildByType(children, ModalContent);
  const actionElement = findChildByType(children, ModalAction);

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const closeModal = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };
  const openModal = () => {
    if (controlledOpen === undefined) {
      setInternalOpen(true);
    }
  };

  const modalRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div onClick={openModal}>{triggerElement}</div>
      {isOpen &&
        ReactDOM.createPortal(
          <dialog
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={cn('modal modal-bottom sm:modal-middle')}
            open={isOpen}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
            onCancel={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <div className={cn('modal-box relative', wide ? '!max-w-4xl' : 'max-w-md')}>
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                onClick={closeModal}
              >
                <XIcon size={18} />
              </button>
              <h3 id="modal-title" className="font-semibold mb-2">
                {titleElement}
              </h3>
              <div className="text-sm">{contentElement}</div>
              <div className="modal-action">{actionElement}</div>
            </div>
          </dialog>,
          document.body
        )}
    </>
  );
};

export const ModalTrigger = ({ children }: ModalTriggerProps) => (
  <div>{children}</div>
);

export const ModalContent = ({ children }: ModalContentProps) => <>{children}</>;

export const ModalTitle = ({ children }: ModalTitleProps) => <>{children}</>;

export const ModalAction = ({ children, variant, onClick }: ModalActionProps) => (
  <button
    type="button"
    className={cn(
      'btn btn-outline',
      variant === 'success' ? 'btn-success' : '',
      variant === 'error' ? 'btn-error' : ''
    )}
    onClick={() => {
      onClick?.();
    }}
  >
    {children}
  </button>
);
