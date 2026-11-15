'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ThemeSelector } from '@/components/theme-selector'

function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 180" className={className} aria-label="InvestIQ brand mark" role="img">
      <defs>
        <linearGradient id="investiq-brand-bg" x1="18" y1="18" x2="162" y2="162" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B1F3A" />
          <stop offset="1" stopColor="#0A6BFF" />
        </linearGradient>
        <linearGradient id="investiq-brand-accent" x1="60" y1="44" x2="136" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8EE7FF" />
          <stop offset="1" stopColor="#62D0FF" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="36" fill="url(#investiq-brand-bg)"/>
      <path d="M38 118L64 92L85 104L121 64L143 81" stroke="url(#investiq-brand-accent)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M113 64H143V94" stroke="url(#investiq-brand-accent)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="42" cy="118" r="9" fill="#8EE7FF"/>
      <circle cx="64" cy="92" r="9" fill="#8EE7FF"/>
      <circle cx="85" cy="104" r="9" fill="#8EE7FF"/>
      <circle cx="121" cy="64" r="9" fill="#8EE7FF"/>
      <circle cx="143" cy="81" r="9" fill="#8EE7FF"/>
      <path d="M24 138C40 138 52 148 67 148C81 148 90 132 105 132C117 132 127 138 144 138" stroke="#F8FBFF" strokeWidth="6" strokeLinecap="round" opacity="0.9"/>
    </svg>
  )
}

interface User {
  id: string
  name?: string | null
  email: string
  image?: string | null
}

interface DashboardHeaderProps {
  user: User
}

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/compare', label: 'Compare' },
  { href: '/research', label: 'Research' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/support', label: 'Support' },
]

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await authClient.signOut()
      window.location.href = '/'
    } catch {
      window.location.href = '/'
    }
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <BrandMark className="h-8 w-8 rounded-lg" />
              <span className="text-xl font-bold hidden sm:inline">InvestIQ</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  variant={pathname === link.href ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-sm"
                  nativeButton={false}
                  render={<Link href={link.href}>{link.label}</Link>}
                />
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ThemeSelector />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-semibold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm max-w-40 truncate">
                    {user.name || user.email}
                  </span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuItem className="md:hidden" render={<Link href="/">Dashboard</Link>} />
              <DropdownMenuItem className="md:hidden" render={<Link href="/compare">Compare</Link>} />
              <DropdownMenuItem className="md:hidden" render={<Link href="/research">Research</Link>} />
              <DropdownMenuItem className="md:hidden" render={<Link href="/pricing">Pricing</Link>} />
              <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
