import React, { ReactNode } from 'react'
import createRandomString from '@/helper/createRandomString'
import { cn } from '@/lib/utils'

type InputProps = {
  id?: string,
  children: ReactNode,
  type?: 'text' | 'number' | 'date' | 'time' | 'url' | 'email' | 'search' | 'password',
  value: string | number,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  placeholder?: string,
  errors?: string & Record<string, string>,
  min?: number,
  max?: number,
  step?: number,
  ref?: React.RefObject<HTMLInputElement>,
  className?: string
}

export const Input: React.FC<InputProps> = ({
                                              id = createRandomString(24),
                                              children,
                                              type = 'text',
                                              value,
                                              placeholder,
                                              onChange,
                                              errors = '',
                                              min,
                                              max,
                                              step,
                                              ref,
                                              className
                                            }) => {

  const handleClear = () => {
    // Create a synthetic event with an empty string value
    const syntheticEvent = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>
    onChange(syntheticEvent)
    ref?.current?.focus()
  }

  return (
    <div className={cn('w-full relative', className)}>
      <label className={'label'} htmlFor={id}>{children}</label>
      <input className={'input w-full'}
             ref={ref}
             id={id}
             type={type}
             value={value}
             onChange={onChange}
             placeholder={placeholder}
             min={min}
             max={max}
             step={step}
      >

      </input>
      {type === 'search' && String(value).length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="btn btn-ghost btn-sm absolute right-1 bottom-1"
        >
          Clear
        </button>
      )}

      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

