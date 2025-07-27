import { useEffect, useState } from 'react'

export const themes = [
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
  'silk',
  'abyss',
  'caramellatte',
] as const

const darkThemes = new Set<Theme>([
  'abyss',
  'aqua',
  'black',
  'business',
  'coffee',
  'dark',
  'dim',
  'dracula',
  'forest',
  'halloween',
  'luxury',
  'night',
  'sunset',
  'synthwave',
])

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
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    if (darkThemes.has(theme)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}
