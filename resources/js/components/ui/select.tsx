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
}

type SelectLabelProps = {
  children: ReactNode
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
                                                className = ''
                                              }) => {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const labelElement = findChildByType(children, SelectLabel)
  const optionsElement = findChildByType(children, SelectOptions)

  return (
    <div className={'w-full'}>
      {labelElement}
      <select className={cn('select w-full', className)} id={selectId} value={value} onChange={onChange}>
        {optionsElement}
      </select>
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

export const SelectLabel: React.FC<SelectLabelProps> = ({ children }) => {
  return <label className="label">{children}</label>
}

export const SelectOptions: React.FC<SelectOptionsProps> = ({ children }) => {
  return <>{children}</>
}
