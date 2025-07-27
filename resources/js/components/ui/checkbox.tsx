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
    <div>
      <label className={'fieldset-label'} htmlFor={inputId}>{children}</label>
      <input className={cn('checkbox', sizeClasses[size])}
             id={inputId}
             type={'checkbox'}
             checked={checked}
             value={checked ? '1' : '0'}
             onChange={onChange}
      />
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

