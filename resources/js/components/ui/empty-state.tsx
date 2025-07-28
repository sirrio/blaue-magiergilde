import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, children, className }) => (
  <div className={cn('flex flex-col items-center py-10 text-center', className)}>
    <Icon size={64} className="mb-4 text-base-content" />
    <p className="text-base-content/70 text-sm">{children}</p>
  </div>
)
