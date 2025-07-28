import React from 'react'
import { cn } from '@/lib/utils'

type TooltipProps = React.PropsWithChildren<{ text: string; className?: string }>

export const Tooltip: React.FC<TooltipProps> = ({ text, children, className }) => (
  <div className={cn('tooltip', className)} data-tip={text}>
    {children}
  </div>
)
