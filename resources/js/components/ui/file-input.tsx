import React, { ReactNode, useId } from 'react'

type InputProps = {
  id?: string
  children: ReactNode
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  errors?: ReactNode
}

export const FileInput: React.FC<InputProps> = ({
                                                  id,
                                                  children,
                                                  onChange,
                                                  errors = ''
                                                }) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div>
      <label className={'fieldset-label'} htmlFor={inputId}>{children}</label>
      <input className={'file-input w-full'}
             id={inputId}
             type={'file'}
             onChange={onChange}
      />
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

