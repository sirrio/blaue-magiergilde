import React, { ReactNode } from 'react'
import createRandomString from '@/helper/createRandomString'

type InputProps = {
  id?: string
  children: ReactNode
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  errors?: string & Record<string, string>
}

export const FileInput: React.FC<InputProps> = ({
                                                  id = createRandomString(24),
                                                  children,
                                                  onChange,
                                                  errors = ''
                                                }) => {
  return (
    <div>
      <label className={'fieldset-label'} htmlFor={id}>{children}</label>
      <input className={'file-input w-full'}
             id={id}
             type={'file'}
             onChange={onChange}
      />
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

