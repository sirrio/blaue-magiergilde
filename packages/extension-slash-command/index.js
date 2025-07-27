import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'

export default Extension.create({
  name: 'slash-command',
  addOptions() {
    return { commands: [], element: null }
  },
  addProseMirrorPlugins() {
    const element = this.options.element
    return [
      Suggestion({
        char: '/',
        startOfLine: true,
        command: ({ editor, range, props }) => {
          props.command?.(editor, range)
        },
        items: ({ query }) => {
          return this.options.commands.filter(item =>
            item.title.toLowerCase().startsWith(query.toLowerCase())
          )
        },
        render: () => {
          return {
            onStart: ({ items }) => {
              if (!element) return
              element.style.display = 'block'
              element.innerHTML = items
                .map((item, i) => `<div data-index="${i}" class="p-1 hover:bg-base-200 cursor-pointer">${item.title}</div>`) 
                .join('')
              element.querySelectorAll('[data-index]').forEach(el => {
                el.addEventListener('click', () => {
                  const index = Number(el.getAttribute('data-index'))
                  const item = items[index]
                  if (item) item.command()
                  element.style.display = 'none'
                })
              })
            },
            onExit: () => {
              if (element) element.style.display = 'none'
            }
          }
        }
      })
    ]
  }
})
