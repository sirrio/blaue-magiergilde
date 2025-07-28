import React, { ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

type ToggleProps = {
  id?: string
  label?: ReactNode
  checked?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  errors?: ReactNode
}

export const Toggle: React.FC<ToggleProps> = ({
  id,
  label,
  checked = false,
  onChange,
  className,
  errors,
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex flex-col">
      <label htmlFor={inputId} className="label cursor-pointer gap-2">
        <input
          id={inputId}
          type="checkbox"
          className={cn('toggle', className)}
          checked={checked}
          onChange={onChange}
        />
        {label && <span className="label-text">{label}</span>}
      </label>
      {errors && <p className="text-error text-xs">{errors}</p>}
    </div>
  )
}
