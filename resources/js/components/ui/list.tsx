import React, { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type ListProps = PropsWithChildren<{ className?: string }>

export const List = ({ children, className }: ListProps) => {
  return (
    <ul className={cn('list w-full rounded-box bg-base-100 shadow-md', className)}>
      {children}
    </ul>
  )
}

type ListRowProps = PropsWithChildren<{ className?: string }>

export const ListRow = ({ children, className }: ListRowProps) => (
  <li className={cn('list-row w-full items-center', className)}>{children}</li>
)
