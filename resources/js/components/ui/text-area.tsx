import React, { ReactNode } from 'react'
import createRandomString from '@/helper/createRandomString'

type InputProps = {
  id?: string
  children: ReactNode
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  errors?: string & Record<string, string>
  placeholder?: string
}

export const TextArea: React.FC<InputProps> = ({
                                                 id = createRandomString(24),
                                                 children,
                                                 value,
                                                 onChange,
                                                 placeholder,
                                                 errors = ''
                                               }) => {
  return (
    <div>
      <label className={'label'} htmlFor={id}>{children}</label>
      <textarea placeholder={placeholder} className={'textarea w-full'}
                id={id}
                value={value}
                onChange={onChange}
      />
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

