'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Five destinations, thumb-height, always visible except inside a performance.
 * Hiding it during recording is deliberate: nothing should compete with the
 * microphone once the timer is running.
 */

const TABS = [
  { href: '/', label: 'Today', icon: TodayIcon },
  { href: '/masters', label: 'Masters', icon: MastersIcon },
  { href: '/arsenal', label: 'Arsenal', icon: ArsenalIcon },
  { href: '/gym', label: 'Gym', icon: GymIcon },
  { href: '/profile', label: 'Profile', icon: ProfileIcon },
]

/** Routes that take over the whole screen. */
const IMMERSIVE = ['/train/', '/field-test/', '/lab/', '/onboarding']

export function TabBar() {
  const pathname = usePathname() ?? '/'
  if (IMMERSIVE.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="tab"
              data-active={active}
              aria-current={active ? 'page' : undefined}
            >
              <Icon />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function base(children: React.ReactNode) {
  return (
    <svg
      className="tab-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** A lectern seen head-on. */
function TodayIcon() {
  return base(
    <>
      <path d="M6 5h12l-1.5 8h-9L6 5Z" />
      <path d="M12 13v6" />
      <path d="M8 19h8" />
    </>,
  )
}

/** Framed portraits on a wall. */
function MastersIcon() {
  return base(
    <>
      <rect x="3" y="4" width="7" height="9" rx="1.5" />
      <rect x="14" y="4" width="7" height="9" rx="1.5" />
      <path d="M3 17h18" />
      <path d="M3 20h12" />
    </>,
  )
}

/** Stacked technique cards. */
function ArsenalIcon() {
  return base(
    <>
      <rect x="4" y="3" width="16" height="13" rx="2" />
      <path d="M7 20h10" />
      <path d="M8 7h8" />
      <path d="M8 11h5" />
    </>,
  )
}

/** A microphone. */
function GymIcon() {
  return base(
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>,
  )
}

/** A progress ring around a figure. */
function ProfileIcon() {
  return base(
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>,
  )
}
