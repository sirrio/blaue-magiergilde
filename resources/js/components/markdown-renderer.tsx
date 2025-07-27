import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  children: string | undefined | null
  className?: string
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children, className }) => {
  if (!children || children.trim() === '') {
    return null
  }
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
