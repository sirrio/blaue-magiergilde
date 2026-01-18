import { cn } from '@/lib/utils'
import { EllipsisVertical } from 'lucide-react'
import React from 'react'

type ActionMenuItem = {
  label: string
  onSelect: () => void
  disabled?: boolean
  tone?: 'default' | 'error'
  active?: boolean
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
      <ul className="menu dropdown-content z-[1] mt-2 w-48 rounded-box border border-base-200 bg-base-100 p-1 shadow">
        {items.map((item) => (
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
        ))}
      </ul>
    </details>
  )
}
