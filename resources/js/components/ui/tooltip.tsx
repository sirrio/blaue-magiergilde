import { cn } from '@/lib/utils'
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import React, { ReactNode, useCallback, useMemo, useState } from 'react'

type TooltipProps = {
  content?: ReactNode
  children: ReactNode
  placement?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
  wrapperClassName?: string
  contentClassName?: string
  wrapperElement?: 'span' | 'div'
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  disabled = false,
  wrapperClassName,
  contentClassName,
  wrapperElement = 'span',
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const hasContent = useMemo(() => {
    if (content === null || typeof content === 'undefined' || content === false) {
      return false
    }

    if (typeof content === 'string') {
      return content.trim().length > 0
    }

    return true
  }, [content])

  const { refs, floatingStyles, context } = useFloating({
    open: hasContent && !disabled ? open : false,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, {
    move: false,
  })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])

  const setReference = useCallback(
    (node: HTMLElement | null) => {
      refs.setReference(node)
      setPortalRoot((node?.closest('.modal-box') as HTMLElement | null) ?? (node?.closest('dialog') as HTMLElement | null) ?? null)
    },
    [refs],
  )

  if (!hasContent) {
    return <>{children}</>
  }

  const Wrapper = wrapperElement

  return (
    <>
      <Wrapper
        ref={setReference}
        className={cn(wrapperElement === 'span' ? 'inline-flex' : undefined, wrapperClassName)}
        {...getReferenceProps()}
      >
        {children}
      </Wrapper>
      <FloatingPortal root={portalRoot ?? undefined}>
        {open ? (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={cn(
              'z-[10000] max-w-xs rounded-md bg-neutral px-2 py-1.5 text-xs leading-snug text-neutral-content shadow-2xl',
              contentClassName,
            )}
            {...getFloatingProps()}
          >
            {content}
          </div>
        ) : null}
      </FloatingPortal>
    </>
  )
}
