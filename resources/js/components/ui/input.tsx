import React, { ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

type InputProps = {
  id?: string,
  children: ReactNode,
  type?: 'text' | 'number' | 'date' | 'time' | 'url' | 'email' | 'search' | 'password',
  value: string | number,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  placeholder?: string,
  errors?: ReactNode,
  min?: number,
  max?: number,
  step?: number,
  ref?: React.RefObject<HTMLInputElement>,
  className?: string
}

export const Input: React.FC<InputProps> = ({
                                              id,
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
  const generatedId = useId()
  const inputId = id ?? generatedId

  const handleClear = () => {
    // Create a synthetic event with an empty string value
    const syntheticEvent = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>
    onChange(syntheticEvent)
    ref?.current?.focus()
  }

  return (
    <div className={cn('w-full relative', className)}>
      <label className={'label'} htmlFor={inputId}>{children}</label>
      <input className={'input w-full'}
             ref={ref}
             id={inputId}
             type={type}
             value={value}
             onChange={onChange}
             placeholder={placeholder}
             min={min}
             max={max}
             step={step}
      />
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

