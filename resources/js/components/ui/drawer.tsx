import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { findChildByType } from '@/lib/react-helpers'

type DrawerProps = {
  children: ReactNode
  isOpen?: boolean
  onClose?: () => void
  wide?: boolean
}

type DrawerTriggerProps = { children: ReactNode }
type DrawerTitleProps = { children: ReactNode }
type DrawerContentProps = { children: ReactNode }
type DrawerFooterProps = { children: ReactNode }

export const Drawer = ({ children, isOpen: controlledOpen, onClose, wide = false }: DrawerProps) => {
  const triggerElement = findChildByType(children, DrawerTrigger)
  const titleElement = findChildByType(children, DrawerTitle)
  const contentElement = findChildByType(children, DrawerContent)
  const footerElement = findChildByType(children, DrawerFooter)

  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const panelRef = useRef<HTMLDivElement>(null)

  const closeDrawer = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      setInternalOpen(false)
    }
  }, [onClose])

  const openDrawer = () => {
    if (controlledOpen === undefined) {
      setInternalOpen(true)
    }
  }

  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeDrawer, isOpen])

  return (
    <>
      <div onClick={openDrawer}>{triggerElement}</div>
      {isOpen
        ? ReactDOM.createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeDrawer()
                }
              }}
            />
            <div
              ref={panelRef}
              tabIndex={-1}
              className={cn(
                'absolute right-0 top-0 h-full w-full bg-base-100 shadow-xl',
                wide ? 'max-w-2xl' : 'max-w-md',
              )}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
                  <h3 id="drawer-title" className="text-sm font-semibold">
                    {titleElement}
                  </h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-circle btn-ghost"
                    onClick={closeDrawer}
                  >
                    <XIcon size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
                  {contentElement}
                </div>
                {footerElement ? (
                  <div className="border-t border-base-200 px-4 py-3">
                    {footerElement}
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  )
}

export const DrawerTrigger = ({ children }: DrawerTriggerProps) => <div>{children}</div>
export const DrawerTitle = ({ children }: DrawerTitleProps) => <>{children}</>
export const DrawerContent = ({ children }: DrawerContentProps) => <>{children}</>
export const DrawerFooter = ({ children }: DrawerFooterProps) => <>{children}</>
