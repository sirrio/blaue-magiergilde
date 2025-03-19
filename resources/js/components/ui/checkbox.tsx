import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import createRandomString from '@/helper/createRandomString'

type CheckboxProps = {
  id?: string
  children: ReactNode
  checked?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  errors?: string & Record<string, string>
}

export const Checkbox: React.FC<CheckboxProps> = ({
                                                    id = createRandomString(24),
                                                    children,
                                                    checked = false,
                                                    onChange,
                                                    size = 'md',
                                                    errors = ''
                                                  }) => {
  return (
    <div>
      <label className={'fieldset-label'} htmlFor={id}>{children}</label>
      <input className={cn(
        'checkbox',
        size === 'xs' ? 'checkbox-xs' : '',
        size === 'sm' ? 'checkbox-sm' : '',
        size === 'md' ? 'checkbox-md' : '',
        size === 'lg' ? 'checkbox-lg' : '',
        size === 'xl' ? 'checkbox-xl' : ''
      )}
             id={id}
             type={'checkbox'}
             checked={checked}
             value={checked ? '1' : '0'}
             onChange={onChange}
      />
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

