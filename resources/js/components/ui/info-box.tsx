import { cn } from '@/lib/utils'
import React from 'react'

type InfoBoxProps = {
  children: React.ReactNode
  className?: string
}

export const InfoBox: React.FC<InfoBoxProps> = ({ children, className }) => {
  return <div className={cn('rounded border p-0.5 text-xs', className)}>{children}</div>
}

export const InfoBoxTitle: React.FC<InfoBoxProps> = ({ children, className }: InfoBoxProps) => {
  return <h2 className={cn('flex items-center font-semibold whitespace-pre-wrap', className)}>{children}</h2>
}

export const InfoBoxLine: React.FC<InfoBoxProps> = ({ children, className }: InfoBoxProps) => {
  return <div className={cn('flex items-center whitespace-pre-wrap', className)}>{children}</div>
}
