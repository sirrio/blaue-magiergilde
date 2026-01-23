import React, { ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

type CheckboxProps = {
  id?: string
  children: ReactNode
  checked?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  errors?: ReactNode
}

export const Checkbox: React.FC<CheckboxProps> = ({
                                                    id,
                                                    children,
                                                    checked = false,
                                                    onChange,
                                                    size = 'md',
                                                    errors = ''
                                                  }) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const sizeClasses: Record<NonNullable<CheckboxProps['size']>, string> = {
    xs: 'checkbox-xs',
    sm: 'checkbox-sm',
    md: 'checkbox-md',
    lg: 'checkbox-lg',
    xl: 'checkbox-xl',
  }

  return (
    <div className="first:mt-2">
      <label className={cn('label cursor-pointer justify-start gap-3 py-2', 'items-center')} htmlFor={inputId}>
        <input
          className={cn('checkbox', sizeClasses[size])}
          id={inputId}
          type={'checkbox'}
          checked={checked}
          value={checked ? '1' : '0'}
          onChange={onChange}
        />
        <span className="label-text text-sm leading-5">{children}</span>
      </label>
      {errors ? (
        <label className="label pt-1">
          <span className="label-text-alt text-error">{errors}</span>
        </label>
      ) : null}
    </div>
  )
}
