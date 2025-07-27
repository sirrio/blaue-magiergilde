import React, { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TextArea } from './text-area'

interface MarkdownAreaProps {
  id?: string
  children: ReactNode
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  errors?: ReactNode
  placeholder?: string
}

export const MarkdownArea: React.FC<MarkdownAreaProps> = ({
  id,
  children,
  value,
  onChange,
  errors = '',
  placeholder,
}) => {
  return (
    <div>
      <TextArea id={id} value={value} onChange={onChange} placeholder={placeholder} errors={errors}>
        {children}
      </TextArea>
      <div className="prose mt-2 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || ''}</ReactMarkdown>
      </div>
    </div>
  )
}
