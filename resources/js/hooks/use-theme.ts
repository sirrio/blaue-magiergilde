import { useEffect, useState } from 'react'

export const themes = [
  'abyss',
  'acid',
  'aqua',
  'autumn',
  'black',
  'bumblebee',
  'business',
  'caramellatte',
  'cmyk',
  'coffee',
  'corporate',
  'cupcake',
  'cyberpunk',
  'dark',
  'dim',
  'dracula',
  'emerald',
  'fantasy',
  'forest',
  'garden',
  'halloween',
  'lemonade',
  'light',
  'lofi',
  'luxury',
  'night',
  'nord',
  'pastel',
  'retro',
  'silk',
  'sunset',
  'synthwave',
  'valentine',
  'winter',
  'wireframe',
] as const

export type Theme = (typeof themes)[number]

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem('theme')
    if (stored && (themes as readonly string[]).includes(stored)) {
      return stored as Theme
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}
