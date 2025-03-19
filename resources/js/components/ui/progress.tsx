import { cn } from '@/lib/utils'
import React from 'react'

type ProgressProps = {
  className?: string
  children?: React.ReactNode
  value?: number
  max?: number
}

export const Progress: React.FC<ProgressProps> = ({ className, children, value, max }) => {
  return (
    <progress className={cn('progress', className)} value={value ?? 0} max={max ?? 100}>
      {children}
    </progress>
  )
}
