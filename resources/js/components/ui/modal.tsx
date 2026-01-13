import React, { useState, ReactNode, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { findChildByType } from '@/lib/react-helpers';

type ModalProps = {
  children: ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  wide?: boolean;
  overflowVisible?: boolean;
};
type ModalTriggerProps = { children: ReactNode };
type ModalContentProps = { children: ReactNode };
type ModalTitleProps = { children: ReactNode };
type ModalActionProps = {
  children: ReactNode;
  variant?: '' | 'success' | 'error';
  onClick?: () => void;
  disabled?: boolean;
};

export const Modal = ({ children, isOpen: controlledOpen, onClose, wide = false, overflowVisible = false }: ModalProps) => {
  const triggerElement = findChildByType(children, ModalTrigger);
  const titleElement = findChildByType(children, ModalTitle);
  const contentElement = findChildByType(children, ModalContent);
  const actionElement = findChildByType(children, ModalAction);

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const closeModal = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  }, [onClose]);
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
  }, [closeModal, isOpen]);

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
            <div
              className={cn(
                'modal-box relative',
                wide ? '!max-w-4xl' : 'max-w-md',
                overflowVisible && 'overflow-visible'
              )}
            >
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
              {actionElement ? <div className="modal-action">{actionElement}</div> : null}
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

export const ModalAction = ({ children, variant, onClick, disabled = false }: ModalActionProps) => (
  <button
    type="button"
    className={cn(
      'btn btn-outline',
      variant === 'success' ? 'btn-success' : '',
      variant === 'error' ? 'btn-error' : ''
    )}
    disabled={disabled}
    onClick={() => {
      onClick?.();
    }}
  >
    {children}
  </button>
);
