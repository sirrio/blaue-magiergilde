import React, { ReactNode, useId } from 'react'

type InputProps = {
  id?: string
  children: ReactNode
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  errors?: ReactNode
  placeholder?: string
}

export const TextArea: React.FC<InputProps> = ({
                                                 id,
                                                 children,
                                                 value,
                                                 onChange,
                                                 placeholder,
                                                 errors = ''
                                               }) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div>
      <label className={'label'} htmlFor={inputId}>{children}</label>
      <textarea placeholder={placeholder} className={'textarea w-full'}
                id={inputId}
                value={value}
                onChange={onChange}
      />
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

