import { PageProps } from '@/types'
import { router, usePage } from '@inertiajs/react'
import React, { useEffect, useState } from 'react'

const themes = [
  'light',
  'dark',
  'cupcake',
  'synthwave',
  'corporate',
]

export default function ThemeSwitcher() {
  const { appearance } = usePage<PageProps>().props
  const [theme, setTheme] = useState(appearance)

  useEffect(() => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      document.documentElement.setAttribute('data-theme', theme)
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [theme])

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setTheme(value)
    router.post(route('appearance.update'), { appearance: value }, { preserveState: true, preserveScroll: true })
  }

  return (
    <select className="select select-sm w-full theme-controller" value={theme} onChange={onChange}>
      {['system', ...themes].map((t) => (
        <option key={t} value={t}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </option>
      ))}
    </select>
  )
}
