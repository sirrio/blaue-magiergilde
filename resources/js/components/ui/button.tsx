import { cn } from '@/lib/utils'
import React, { ElementType, ReactNode } from 'react'

type ButtonProps<C extends ElementType = 'button'> = {
  as?: C,
  className?: string,
  children?: ReactNode,
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  variant?: 'outline' | 'dash' | 'soft' | 'ghost' | 'link',
  modifier?: 'wide' | 'block' | 'square' | 'circle',
  color?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error',
} & React.ComponentPropsWithoutRef<C>

export const Button = <C extends ElementType = 'button'>(
  {
    as,
    className,
    children,
    size = 'md',
    variant,
    modifier,
    color,
    ...props
  }: ButtonProps<C>
) => {
  const Component = as || 'button'
  const buttonClasses = cn(
    'btn',
    `btn-${size}`,
    variant && `btn-${variant}`,
    modifier && `btn-${modifier}`,
    color && `btn-${color}`,
    className
  )

  return <Component className={buttonClasses} {...props}>{children}</Component>
}
