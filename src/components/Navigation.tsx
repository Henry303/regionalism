/** Responsive app navigation: a floating desktop map menu and mobile tabs. */

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from 'deepspace'
import { List, Map as MapIcon, UserRound } from 'lucide-react'
import { APP_NAME } from '../constants'
import { nav } from '../nav'
import { cn } from '../lib/utils'

export default function Navigation() {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    return true
  })

  const navLink = (item: (typeof nav)[number]) => {
    const active = location.pathname.startsWith(item.path)
    return (
      <Link
        key={item.path}
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'rounded-full px-3 py-2 text-sm transition-colors',
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {item.label}
      </Link>
    )
  }

  return (
    isLoaded && isSignedIn ? (
      <>
      <nav
        data-testid="app-navigation"
        aria-label="Main navigation"
        className="fixed right-4 top-4 z-[1100] hidden items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur md:flex"
      >
          <span className="cursor-default text-sm font-semibold text-foreground">
            {APP_NAME}
          </span>

          <div className="flex items-center gap-1">{visibleNav.map(navLink)}</div>
      </nav>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-[1100] grid h-16 grid-cols-3 border-t border-border bg-card md:hidden"
      >
        <Link
          to="/home"
          aria-current={location.pathname.startsWith('/home') ? 'page' : undefined}
          className={cn(
            'flex min-h-16 flex-col items-center justify-center gap-1 text-xs',
            location.pathname.startsWith('/home') ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <MapIcon className="h-5 w-5" aria-hidden />
          Map
        </Link>
        <Link
          to="/list"
          aria-current={location.pathname.startsWith('/list') ? 'page' : undefined}
          className={cn(
            'flex min-h-16 flex-col items-center justify-center gap-1 text-xs',
            location.pathname.startsWith('/list') ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <List className="h-5 w-5" aria-hidden />
          List
        </Link>
        <Link
          to="/settings"
          aria-current={location.pathname.startsWith('/settings') ? 'page' : undefined}
          className={cn(
            'flex min-h-16 flex-col items-center justify-center gap-1 text-xs',
            location.pathname.startsWith('/settings') ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <UserRound className="h-5 w-5" aria-hidden />
          Profile
        </Link>
      </nav>
      </>
    ) : null
  )
}
