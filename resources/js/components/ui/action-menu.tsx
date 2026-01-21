import { cn } from '@/lib/utils'
import { EllipsisVertical } from 'lucide-react'
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

export const ActionMenu = ({
  items,
  align = 'end',
}: {
  items: ActionMenuItem[]
  align?: 'start' | 'end'
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
      <summary className="btn btn-sm btn-outline btn-square" aria-label="More actions">
        <EllipsisVertical size={16} />
      </summary>
      <ul className="menu dropdown-content z-[1] mt-2 w-56 rounded-box border border-base-200 bg-base-100 p-1 shadow">
        {items.map((item) => {
          if (item.type === 'toggle') {
            return (
              <li key={item.label}>
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
            <li key={item.label}>
              <button
                type="button"
                className={cn(item.tone === 'error' && 'text-error', item.active && 'menu-active')}
                disabled={item.disabled}
                aria-current={item.active ? 'true' : undefined}
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
