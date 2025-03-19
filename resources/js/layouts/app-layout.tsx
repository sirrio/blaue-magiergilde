import { useInitials } from '@/hooks/use-initials'
import { cn } from '@/lib/utils'
import { PageProps } from '@/types'
import { Link, usePage } from '@inertiajs/react'
import { Menu, ShieldUser } from 'lucide-react'
import { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
}

const menuLinks = [
  {
    name: 'Characters',
    route: 'characters.index',
  },
  {
    name: 'Game Master',
    route: 'games.index',
  },
]

const profileLinks = [
  {
    name: 'Logout',
    route: 'logout',
  },
]

const adminLinks = [
  {
    name: 'Items',
    route: 'items.index',
  },
  {
    name: 'Spells',
    route: 'spells.index',
  },
  {
    name: 'Shop',
    route: 'shops.index',
  },
]

export default function AppLayout({ children }: AppLayoutProps) {
  const { auth } = usePage<PageProps>().props
  const getInitials = useInitials()

  return (
    <div className={cn('bg-base-200 min-h-screen')}>
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <Menu></Menu>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              {menuLinks.map((menuLink) => (
                <li key={menuLink.route}>
                  <Link className={cn(route().current(menuLink.route) ? 'menu-active' : undefined)} href={route(menuLink.route)}>
                    {menuLink.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className={cn('size-12')}>
            <img className={cn('h-full')} alt={'Blaue Magiergilde'} src={'/images/logo.webp'} />
          </div>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal gap-1 px-1">
            {menuLinks.map((menuLink) => (
              <li key={menuLink.route}>
                <Link className={cn(route().current(menuLink.route) ? 'menu-active' : undefined)} href={route(menuLink.route)}>
                  {menuLink.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end mr-4">
            <div tabIndex={0} role="button" className="btn btn-outline btn-circle h-6 w-6">
              <ShieldUser size={18}></ShieldUser>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              {adminLinks.map((adminLink) => (
                <li key={adminLink.route}>
                  <Link href={route(adminLink.route)}>{adminLink.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                <img alt={getInitials(auth.user.name)} src={auth.user.avatar} />
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              {profileLinks.map((profileLink) => (
                <li key={profileLink.route}>
                  <Link href={route(profileLink.route)}>{profileLink.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}
