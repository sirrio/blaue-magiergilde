import { cn } from '@/lib/utils'
import { PageProps } from '@/types'
import { Link, usePage } from '@inertiajs/react'
import {
  Archive,
  BookOpen,
  CalendarDays,
  Gavel,
  Map,
  Menu,
  Package,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Store,
  UserCheck,
  Users,
} from 'lucide-react'
import { ReactNode, useRef } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useInitials } from '@/hooks/use-initials'
import ThemeSwitcher from '@/components/theme-switcher'

interface AppLayoutProps {
  children: ReactNode
}

const menuLinks = [
  { name: 'Characters', route: 'characters.index', method: 'get' as const, icon: Users },
  { name: 'Game Master Log', route: 'game-master-log.index', method: 'get' as const, icon: ScrollText },
  { name: 'Rooms', route: 'rooms.index', method: 'get' as const, icon: Map },
  { name: 'Games', route: 'games.index', method: 'get' as const, icon: CalendarDays },
  { name: 'Guild Handbook', route: 'handbook.index', method: 'get' as const, icon: BookOpen },
]

const accountLinks = [
  { name: 'Profile', route: 'profile.edit', method: 'get' as const },
]

const legalLinks = [
  { name: 'Impressum', route: 'impressum', method: 'get' as const },
  { name: 'Datenschutz', route: 'datenschutz', method: 'get' as const },
]

const authLinks = [
  { name: 'Logout', route: 'logout', method: 'post' as const },
]

const adminSections = [
  {
    label: 'Marketplace',
    links: [
      { name: 'Shop', route: 'admin.shops.index', method: 'get' as const, icon: Store },
      { name: 'Auctions', route: 'admin.auctions.index', method: 'get' as const, icon: Gavel },
      { name: 'Backstock', route: 'admin.backstock.index', method: 'get' as const, icon: Archive },
    ],
  },
  {
    label: 'Compendium',
    links: [
      { name: 'Items', route: 'admin.items.index', method: 'get' as const, icon: Package },
      { name: 'Spells', route: 'admin.spells.index', method: 'get' as const, icon: Sparkles },
    ],
  },
      {
        label: 'Administration',
        links: [
          { name: 'Character Approvals', route: 'admin.character-approvals.index', method: 'get' as const, icon: UserCheck },
          { name: 'Manage Rooms', route: 'admin.rooms.index', method: 'get' as const, icon: Map },
        ],
      },
  {
    label: 'System',
    links: [
      { name: 'Settings', route: 'admin.settings', method: 'get' as const, icon: Settings },
    ],
  },
]

export default function AppLayout({ children }: AppLayoutProps) {
  const { auth, discordConnected, features, handbookChannels, activeChannelId, betaNoticeEnabled } = usePage<PageProps>().props
  const getInitials = useInitials()
  const adminDetailsRef = useRef<HTMLDetailsElement>(null)
  const handbookDesktopRef = useRef<HTMLDetailsElement>(null)
  const handbookMobileRef = useRef<HTMLDetailsElement>(null)
  useClickOutside(adminDetailsRef, () =>
    adminDetailsRef.current?.removeAttribute('open')
  )
  useClickOutside(handbookDesktopRef, () =>
    handbookDesktopRef.current?.removeAttribute('open')
  )
  useClickOutside(handbookMobileRef, () =>
    handbookMobileRef.current?.removeAttribute('open')
  )

  const handbookChannelList = handbookChannels ?? []
  const showHandbookDropdown = handbookChannelList.length > 0
  const handbookLabel = 'Guild Handbook'
  const formatHandbookChannelLabel = (name: string) => {
    const normalized = name.replace(/-/g, ' ')
    if (!normalized) {
      return normalized
    }
    const withEmojiSpacing = normalized.replace(
      /^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\u200D\p{Extended_Pictographic})*)\s*(\S)/u,
      (_match, emoji, next) => `${emoji} ${next}`,
    )
    return withEmojiSpacing.replace(/\p{L}/u, (char) => char.toUpperCase())
  }

  return (
    <div className={cn('bg-base-200 min-h-screen')}>
      <nav className="navbar bg-base-100 shadow-sm" role="navigation" aria-label="Main Navigation">
        <div className="navbar-start flex-none w-auto">
          <div className="dropdown">
            <button tabIndex={0} role="button" aria-label="Open mobile menu" className="btn btn-ghost lg:hidden">
              <Menu size={20} />
            </button>
            <ul tabIndex={0} role="menu" className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              {menuLinks.map((menuLink) => (
                menuLink.route === 'handbook.index' && showHandbookDropdown ? (
                  <li key={menuLink.route} role="none">
                    <details ref={handbookMobileRef}>
                      <summary className="flex items-center">
                        <menuLink.icon size={16} className="mr-2" />
                        {handbookLabel}
                      </summary>
                      <ul className="p-2">
                        {handbookChannelList.map((channel) => (
                          <li key={channel.id} role="none">
                            <Link
                              role="menuitem"
                              className={cn(
                                'truncate',
                                channel.id === activeChannelId ? 'menu-active' : ''
                              )}
                              href={route('handbook.index', { channel: channel.id })}
                            >
                              {formatHandbookChannelLabel(channel.name)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ) : (
                  <li key={menuLink.route} role="none">
                    <Link
                      role="menuitem"
                      className={cn(
                        'flex items-center',
                        route().current(menuLink.route) ? 'menu-active' : ''
                      )}
                      href={route(menuLink.route)}
                    >
                      <menuLink.icon size={16} className="mr-2" />
                      {menuLink.name}
                    </Link>
                  </li>
                )
              ))}
              {Boolean(auth.user.is_admin) && (
                <li role="none">
                  <a className="flex items-center">
                    <Shield size={16} className="mr-2" />
                    Administration
                  </a>
                  <ul className="p-2">
                    {adminSections.map((section) => (
                      <li key={section.label} role="none">
                        <span className="menu-title">{section.label}</span>
                        <ul className="before:hidden ml-0 pl-0">
                          {section.links.map((adminLink) => (
                            <li key={adminLink.route} role="none">
                              <Link
                                role="menuitem"
                                method={adminLink.method}
                                href={route(adminLink.route)}
                                className={cn(
                                  'flex items-center',
                                  route().current(adminLink.route) ? 'menu-active' : ''
                                )}
                              >
                                <adminLink.icon size={16} className="mr-2" />
                                {adminLink.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </div>
          <Link href={route('characters.index')} className="btn btn-ghost text-xl">
            <img className={cn('h-full')} alt={'Blaue Magiergilde'} src={'/images/icon_magiergilde.svg'} />
            Blaue Magiergilde
          </Link>
          <ul className="menu menu-horizontal items-center space-x-1 px-1 hidden lg:flex ml-4" role="menubar">
            {menuLinks.map((menuLink) => (
              menuLink.route === 'handbook.index' && showHandbookDropdown ? (
                <li key={menuLink.route} role="none">
                  <details ref={handbookDesktopRef}>
                    <summary className="flex items-center">
                      <menuLink.icon size={16} className="mr-2" />
                      {handbookLabel}
                    </summary>
                    <ul className="z-30 w-56 p-2">
                      {handbookChannelList.map((channel) => (
                        <li key={channel.id} role="none">
                          <Link
                            role="menuitem"
                            method={menuLink.method}
                            href={route('handbook.index', { channel: channel.id })}
                            className={cn(
                              'truncate',
                              channel.id === activeChannelId ? 'menu-active' : ''
                            )}
                          >
                            {formatHandbookChannelLabel(channel.name)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ) : (
                <li key={menuLink.route} role="none">
                  <Link
                    role="menuitem"
                    method={menuLink.method}
                    href={route(menuLink.route)}
                    className={cn(
                      'flex items-center',
                      route().current(menuLink.route) ? 'menu-active' : ''
                    )}
                  >
                    <menuLink.icon size={16} className="mr-2" />
                    {menuLink.name}
                  </Link>
                </li>
              )
            ))}
            {Boolean(auth.user.is_admin) && (
              <li role="none">
                <details ref={adminDetailsRef}>
                  <summary className="flex items-center">
                    <Shield size={16} className="mr-2" />
                    Administration
                  </summary>
                  <ul className="z-30 w-52 p-2">
                    {adminSections.map((section) => (
                      <li key={section.label} role="none">
                        <span className="menu-title">{section.label}</span>
                        <ul className="before:hidden ml-0 pl-0">
                          {section.links.map((adminLink) => (
                            <li key={adminLink.route} role="none">
                              <Link
                                role="menuitem"
                                method={adminLink.method}
                                href={route(adminLink.route)}
                                className={cn(
                                  'flex items-center',
                                  route().current(adminLink.route) ? 'menu-active' : ''
                                )}
                              >
                                <adminLink.icon size={16} className="mr-2" />
                                {adminLink.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            )}
          </ul>
        </div>
        <div className="navbar-end flex-1 w-auto justify-end gap-2">
          <div className="dropdown dropdown-end">
            <button tabIndex={0} aria-label="User menu" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                {auth.user.avatar ? (
                  <img alt={auth.user.name} src={auth.user.avatar} />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-base-300 text-base-content">
                    {getInitials(auth.user.name)}
                  </span>
                )}
              </div>
            </button>
            <ul tabIndex={0} role="menu" className="menu menu-sm dropdown-content bg-base-100 rounded-box mt-3 w-52 p-2 shadow">
              <li className="flex items-center space-x-3 px-4 py-2" role="none">
                <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-base-300 text-base-content flex items-center justify-center">
                  {auth.user.avatar ? (
                    <img alt={auth.user.name} src={auth.user.avatar} className="h-10 w-10 object-cover" />
                  ) : (
                    getInitials(auth.user.name)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight text-base-content truncate">{auth.user.name}</p>
                  <p className="text-xs text-base-content/70 truncate">{auth.user.email}</p>
                </div>
              </li>
              <li role="separator" className="my-1 p-0">
                <hr className="border-base-300 pointer-events-none" />
              </li>
              <li role="none">
                <ThemeSwitcher />
              </li>
              <li role="separator" className="my-1 p-0">
                <hr className="border-base-300 pointer-events-none" />
              </li>
              {accountLinks.map((link) => (
                <li key={link.route} role="none">
                  <Link role="menuitem" method={link.method} href={route(link.route)}>
                    {link.name}
                  </Link>
                </li>
              ))}
              <li role="separator" className="my-1 p-0">
                <hr className="border-base-300 pointer-events-none" />
              </li>
              {legalLinks.map((link) => (
                <li key={link.route} role="none">
                  <Link role="menuitem" method={link.method} href={route(link.route)}>
                    {link.name}
                  </Link>
                </li>
              ))}
              <li role="separator" className="my-1 p-0">
                <hr className="border-base-300 pointer-events-none" />
              </li>
              {authLinks.map((link) => (
                <li key={link.route} role="none">
                  <Link role="menuitem" method={link.method} href={route(link.route)}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
      <main>
        {features.discord && !discordConnected && (
          <div className="container mx-auto max-w-5xl px-4 pt-4">
            <div className="alert alert-warning">
              <div>
                <p className="font-semibold">Discord is not connected.</p>
                <p className="text-sm opacity-80">
                  Connect Discord in your profile to manage characters with the Discord bot.
                </p>
              </div>
              <Link href={route('profile.edit')} className="btn btn-sm">
                Go to profile
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>
      {betaNoticeEnabled ? (
        <div className="toast toast-start toast-bottom z-40">
          <div className="alert alert-warning text-xs">
            Beta: data is not live and can be used for testing.
          </div>
        </div>
      ) : null}
      
    </div>
  )
}
