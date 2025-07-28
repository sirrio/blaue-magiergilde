import { cn } from '@/lib/utils'
import React from 'react'

type ProgressProps = {
  className?: string
  children?: React.ReactNode
  value?: number
  max?: number
}

export const Progress: React.FC<ProgressProps> = ({ className, children, value = 0, max = 100 }) => {
  const percent = Math.round((value / max) * 100)
  return (
    <div className={cn('relative h-8', className)}>
      <progress className="progress h-8 w-full" value={value} max={max}></progress>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {percent}%
      </span>
      {children}
    </div>
  )
}
