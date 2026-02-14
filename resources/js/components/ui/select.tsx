import React, { ReactNode, useId } from 'react'
import { findChildByType } from '@/lib/react-helpers'
import { cn } from '@/lib/utils'

type SelectProps = {
  id?: string
  children: ReactNode
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  errors?: ReactNode
  className?: string
  disabled?: boolean
}

type SelectLabelProps = {
  children: ReactNode
  className?: string
}

type SelectOptionsProps = {
  children: ReactNode
}


export const Select: React.FC<SelectProps> = ({
                                                id,
                                                children,
                                                value,
                                                onChange,
                                                errors = '',
                                                className = '',
                                                disabled = false,
                                              }) => {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const labelElement = findChildByType(children, SelectLabel)
  const optionsElement = findChildByType(children, SelectOptions)

  return (
    <div className={'w-full'}>
      {labelElement}
      <select className={cn('select w-full', className)} id={selectId} value={value} onChange={onChange} disabled={disabled}>
        {optionsElement}
      </select>
      {errors ? (
        <label className="label pt-1">
          <span className="label-text-alt text-error">{errors}</span>
        </label>
      ) : null}
    </div>
  )
}

export const SelectLabel: React.FC<SelectLabelProps> = ({ children, className = '' }) => {
  return <label className={cn('label', className)}>{children}</label>
}

export const SelectOptions: React.FC<SelectOptionsProps> = ({ children }) => {
  return <>{children}</>
}
