import React, { ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

type InputProps = {
  id?: string,
  children: ReactNode,
  type?: 'text' | 'number' | 'date' | 'time' | 'url' | 'email' | 'search' | 'password',
  value: string | number,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void,
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void,
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void,
  placeholder?: string,
  errors?: ReactNode,
  min?: number,
  max?: number,
  step?: number,
  ref?: React.RefObject<HTMLInputElement>,
  className?: string,
  inputClassName?: string,
  labelClassName?: string,
  hideLabel?: boolean
}

export const Input: React.FC<InputProps> = ({
                                              id,
                                              children,
                                              type = 'text',
                                              value,
                                              placeholder,
                                              onChange,
                                              onBlur,
                                              onFocus,
                                              onClick,
                                              errors = '',
                                              min,
                                              max,
                                              step,
                                              ref,
                                              className,
                                              inputClassName,
                                              labelClassName,
                                              hideLabel
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
      <label className={cn('label', hideLabel && 'sr-only', labelClassName)} htmlFor={inputId}>
        {children}
      </label>
      <input className={cn('input w-full', inputClassName)}
             ref={ref}
             id={inputId}
             type={type}
             value={value}
             onChange={onChange}
             onBlur={onBlur}
             onFocus={onFocus}
             onClick={onClick}
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
