import React, { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  errors?: React.ReactNode
  children: React.ReactNode
  id?: string
}

export const RichTextEditor: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  errors,
  children,
  id,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false)
    }
  }, [value, editor])

  return (
    <div>
      <label className={'label'} htmlFor={id}>{children}</label>
      <EditorContent
        id={id}
        editor={editor}
        className="prose min-h-32 w-full rounded border p-2"
      />
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}
export default RichTextEditor
