import React, { ReactNode } from 'react'
import createRandomString from '@/helper/createRandomString'
import { cn } from '@/lib/utils'

type SelectProps = {
  id?: string
  children: ReactNode
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  errors?: string & Record<string, string>
  className?: string
}

type SelectLabelProps = {
  children: ReactNode
}

type SelectOptionsProps = {
  children: ReactNode
}

function findChildByType<T>(children: ReactNode, componentType: React.FC<T>): ReactNode | null {
  return React.Children.toArray(children).find(child =>
    React.isValidElement(child) && child.type === componentType
  ) || null
}

export const Select: React.FC<SelectProps> = ({
                                                id = createRandomString(24),
                                                children,
                                                value,
                                                onChange,
                                                errors = '',
                                                className = ''
                                              }) => {
  const labelElement = findChildByType(children, SelectLabel)
  const optionsElement = findChildByType(children, SelectOptions)

  return (
    <div className={'w-full'}>
      {labelElement}
      <select className={cn('select w-full', className)} id={id} value={value} onChange={onChange}>
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
