import React, { ReactNode, useId, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import SlashCommand from '@tiptap/extension-slash-command'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import FloatingMenu from '@tiptap/extension-floating-menu'
import History from '@tiptap/extension-history'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'

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
                                                 errors = '',
                                               }) => {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  const floatingMenuRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      History,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList.configure({ HTMLAttributes: { class: 'list-disc pl-6' } }),
      OrderedList.configure({ HTMLAttributes: { class: 'list-decimal pl-6' } }),
      Blockquote,
      CodeBlock,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Type “/” for commands or start typing…' }),
      SlashCommand.configure({
        element: floatingMenuRef.current,
        commands: [
          { title: 'Heading 1', command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
          { title: 'Heading 2', command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
          { title: 'Bulleted List', command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleBulletList().run() },
          { title: 'Numbered List', command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleOrderedList().run() },
          { title: 'Quote', command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleBlockquote().run() },
          { title: 'Code Block', command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleCodeBlock().run() },
          { title: 'Link', command: () => {} },
        ],
      }),
      BubbleMenu.configure({ element: bubbleMenuRef.current }),
      FloatingMenu.configure({ element: floatingMenuRef.current }),
    ],
    content: typeof value === 'string' ? value : String(value || ''),
    onUpdate: ({ editor }) => {
      const syntheticEvent = { target: { value: editor.getHTML() } } as unknown as React.ChangeEvent<HTMLTextAreaElement>
      onChange(syntheticEvent)
    },
  })

  return (
    <div>
      <label className={'label'} htmlFor={inputId}>{children}</label>
      <div className="relative form-control">
        <div ref={floatingMenuRef} className="absolute bg-white shadow-lg rounded p-2 z-10" />
        <div ref={bubbleMenuRef} className="absolute bg-white shadow rounded p-1 z-10" />
        <EditorContent
          editor={editor}
          id={inputId}
          role="textbox"
          aria-multiline="true"
          className="border rounded-lg p-4 min-h-[8rem] prose max-w-full focus:outline-none"
        />
      </div>
      {errors && <p className={'fieldset-label text-error'}>{errors}</p>}
    </div>
  )
}

