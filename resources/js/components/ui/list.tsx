import React, { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export const List = ({ children }: PropsWithChildren) => {
  return (
    <ul className="list w-full rounded-box bg-base-100 shadow-md">
      {children}
    </ul>
  )
}

type ListRowProps = PropsWithChildren<{ className?: string }>

export const ListRow = ({ children, className }: ListRowProps) => (
  <li className={cn('list-row w-full items-center', className)}>{children}</li>
)
