import { cn } from '@/lib/utils'
import { SlidersHorizontal } from 'lucide-react'
import React from 'react'

type ActionMenuItem =
  | {
      type?: 'action'
      label: string
      onSelect: () => void
      disabled?: boolean
      tone?: 'default' | 'error'
      active?: boolean
      icon?: React.ReactNode
    }
  | {
      type: 'toggle'
      label: string
      checked: boolean
      onToggle: (value: boolean) => void
      disabled?: boolean
      icon?: React.ReactNode
    }
  | {
      type: 'label'
      label: string
    }
  | {
      type: 'divider'
      id?: string
    }

export const ActionMenu = ({
  items,
  align = 'end',
  disabled = false,
}: {
  items: ActionMenuItem[]
  align?: 'start' | 'end'
  disabled?: boolean
}) => {
  if (items.length === 0) return null

  const closeMenu = (event: React.MouseEvent<HTMLElement>) => {
    const details = event.currentTarget.closest('details')
    if (details) {
      details.removeAttribute('open')
    }
  }

  return (
    <details className={cn('dropdown', align === 'end' ? 'dropdown-end' : 'dropdown-start')}>
      <summary
        className={cn('btn btn-sm btn-outline btn-square', disabled && 'btn-disabled opacity-60')}
        aria-label="More actions"
        aria-disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault()
            return
          }

          const currentDetails = event.currentTarget.closest('details.dropdown')
          if (!currentDetails) {
            return
          }

          const openMenus = Array.from(document.querySelectorAll('details.dropdown[open]'))
          openMenus.forEach((menu) => {
            if (menu !== currentDetails) {
              menu.removeAttribute('open')
            }
          })
        }}
        onKeyDown={(event) => {
          if (disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
          }
        }}
      >
        <SlidersHorizontal size={16} />
      </summary>
      <ul className={cn('menu dropdown-content z-[1] mt-2 w-56 rounded-box border border-base-200 bg-base-100 p-1 shadow', disabled && 'hidden')}>
        {items.map((item, index) => {
          if (item.type === 'label') {
            return (
              <li key={`label-${item.label}-${index}`} className="menu-title px-3 py-1 text-[10px] uppercase tracking-wide text-base-content/50">
                {item.label}
              </li>
            )
          }

          if (item.type === 'divider') {
            return <li key={`divider-${item.id ?? index}`} className="my-1 border-t border-base-200" />
          }

          if (item.type === 'toggle') {
            return (
              <li key={`toggle-${item.label}`}>
                <div className={cn('flex items-center justify-between gap-3 px-3 py-2', item.disabled && 'opacity-60')}>
                  <span className="flex items-center gap-2 text-sm">
                    {item.icon}
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-primary"
                    checked={item.checked}
                    disabled={item.disabled}
                    onChange={(event) => {
                      if (item.disabled) return
                      item.onToggle(event.target.checked)
                      closeMenu(event as unknown as React.MouseEvent<HTMLElement>)
                    }}
                  />
                </div>
              </li>
            )
          }

          return (
            <li key={`action-${item.label}`}>
              <button
                type="button"
                className={cn(
                  item.tone === 'error' && !item.disabled && 'text-error',
                  item.active && !item.disabled && 'menu-active',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                disabled={item.disabled}
                aria-current={item.active && !item.disabled ? 'true' : undefined}
                onClick={(event) => {
                  if (item.disabled) return
                  item.onSelect()
                  closeMenu(event)
                }}
              >
                <span className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
