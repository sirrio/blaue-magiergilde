import React, { ReactNode, useId, useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface SimpleEditorProps {
  id?: string
  children: ReactNode
  value: string
  onChange: (value: string) => void
  errors?: ReactNode
  className?: string
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({ id, children, value, onChange, errors = '', className }) => {
  const generatedId = useId()
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  const inputId = id ?? generatedId

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div className={className}>
      <label className="label" htmlFor={inputId}>
        {children}
      </label>
      <div id={inputId} className="border rounded p-2 min-h-[100px]">
        <EditorContent editor={editor} />
      </div>
      {errors && <p className="fieldset-label text-error">{errors}</p>}
    </div>
  )
}

export default SimpleEditor
