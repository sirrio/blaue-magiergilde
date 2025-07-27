import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import { PageProps } from '@/types'
import { Link, usePage } from '@inertiajs/react'
import { Menu } from 'lucide-react'
import { ReactNode } from 'react'
import ThemeSwitcher from '@/components/theme-switcher'

interface AppLayoutProps {
  children: ReactNode
}

const menuLinks = [
  { name: 'Characters', route: 'characters.index', method: 'get' as const },
  { name: 'Mastered Games', route: 'games.index', method: 'get' as const },
]

const profileLinks = [{ name: 'Logout', route: 'logout', method: 'post' as const }]

const adminLinks = [
  { name: 'Items', route: 'items.index', method: 'get' as const },
  { name: 'Spells', route: 'spells.index', method: 'get' as const },
  { name: 'Shop', route: 'shops.index', method: 'get' as const },
]

export default function AppLayout({ children }: AppLayoutProps) {
  const { auth } = usePage<PageProps>().props
  const getInitials = useInitials()

  return (
    <div className={cn('bg-base-200 min-h-screen')}>
      <nav className="navbar bg-base-100 shadow-sm" role="navigation" aria-label="Main Navigation">
        <div className="navbar-start">
          <div className="dropdown">
            <button tabIndex={0} role="button" aria-label="Open mobile menu" className="btn btn-ghost lg:hidden">
              <Menu size={20} />
            </button>
            <ul tabIndex={0} role="menu" className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              {menuLinks.map((menuLink) => (
                <li key={menuLink.route} role="none">
                  <Link role="menuitem" className={cn(route().current(menuLink.route) ? 'menu-active' : '')} href={route(menuLink.route)}>
                    {menuLink.name}
                  </Link>
                </li>
              ))}
              {auth.user.is_admin && (
                <li role="none">
                  <a>Administration</a>
                  <ul className="p-2">
                    {adminLinks.map((adminLink) => (
                      <li key={adminLink.route} role="none">
                        <Link
                          role="menuitem"
                          method={adminLink.method}
                          href={route(adminLink.route)}
                          className={cn(route().current(adminLink.route) ? 'menu-active' : '')}
                        >
                          {adminLink.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </div>
          <Link href={route('characters.index')} className="btn btn-ghost text-xl">
            <img className={cn('h-full')} alt={'Blaue Magiergilde'} src={'/images/logo.webp'} />
            Blaue Magiergilde
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal space-x-1 px-1" role="menubar">
            {menuLinks.map((menuLink) => (
              <li key={menuLink.route} role="none">
                <Link
                  role="menuitem"
                  method={menuLink.method}
                  href={route(menuLink.route)}
                  className={cn(route().current(menuLink.route) ? 'menu-active' : '')}
                >
                  {menuLink.name}
                </Link>
              </li>
            ))}
            {auth.user.is_admin && (
              <li role="none">
                <details>
                  <summary>Administration</summary>
                  <ul className="z-30 w-52 p-2">
                    {adminLinks.map((adminLink) => (
                      <li key={adminLink.route} role="none">
                        <Link
                          role="menuitem"
                          method={adminLink.method}
                          href={route(adminLink.route)}
                          className={cn(route().current(adminLink.route) ? 'menu-active' : '')}
                        >
                          {adminLink.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            )}
          </ul>
        </div>

        <div className="navbar-end space-x-2">
          <div className="dropdown dropdown-end">
            <button tabIndex={0} aria-label="User menu" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                {auth.user.avatar ? (
                  <img alt={auth.user.name} src={auth.user.avatar} />
                ) : (
                  <span className="text-base-content text-lg font-bold">{getInitials(auth.user.name)}</span>
                )}
              </div>
            </button>
            <ul tabIndex={0} role="menu" className="menu menu-sm dropdown-content bg-base-100 rounded-box mt-3 w-52 p-2 shadow">
              <li role="none">
                <ThemeSwitcher />
              </li>
              {profileLinks.map((profileLink) => (
                <li key={profileLink.route} role="none">
                  <Link role="menuitem" method={profileLink.method} href={route(profileLink.route)}>
                    {profileLink.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
