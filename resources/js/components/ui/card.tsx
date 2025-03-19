import { cn } from '@/lib/utils'
import React from 'react'

type CardProps = {
  className?: string
  children?: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ className, children }) => {
  return <div className={cn('relative card bg-base-100 shadow-sm', className)}>{children}</div>
}

export const CardBody: React.FC<CardProps> = ({ className, children }) => {
  return <div className={cn('card-body', className)}>{children}</div>
}

export const CardTitle: React.FC<CardProps> = ({ className, children }) => {
  return <div className={cn('card-title', className)}>{children}</div>
}

export const CardAction: React.FC<CardProps> = ({ className, children }) => {
  return <div className={cn('card-actions', className)}>{children}</div>
}

export const CardContent: React.FC<CardProps> = ({ className, children }) => {
  return <div className={cn(className)}>{children}</div>
}
