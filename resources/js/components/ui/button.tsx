import { cn } from '@/lib/utils'
import React, { ElementType, ReactNode } from 'react'

type ButtonProps = {
  as?: ElementType,
  className?: string,
  children?: ReactNode,
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  variant?: 'outline' | 'dash' | 'soft' | 'ghost' | 'link',
  modifier?: 'wide' | 'block' | 'square' | 'circle',
  color?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error',
} & React.ComponentPropsWithoutRef<'a' | 'button'>

export const Button: React.FC<ButtonProps> = ({
                                                as: Component = 'button',
                                                className,
                                                children,
                                                size = 'md',
                                                variant,
                                                modifier,
                                                color,
                                                ...props
                                              }) => {
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
