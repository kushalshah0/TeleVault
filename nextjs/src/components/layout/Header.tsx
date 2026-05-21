'use client'

import { useState } from 'react'
import { Menu, Search, LogOut, ChevronDown } from 'lucide-react'
import ThemeToggle from '../ThemeToggle'

export interface HeaderProps {
  user?: {
    username: string
    email: string
  }
  onLogout: () => void
  onSearch?: (query: string, shouldSearch: boolean) => void
  onMenuToggle: () => void
  searchValue?: string
}

function Header({ user, onLogout, onSearch, onMenuToggle, searchValue = '' }: HeaderProps) {
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [mobileSearchValue, setMobileSearchValue] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleMobileSearch = () => {
    if (mobileSearchValue.trim()) {
      onSearch?.(mobileSearchValue, true)
      setShowMobileSearch(false)
    }
  }

  return (
    <header className="bg-background/95 backdrop-blur-lg border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-2 gap-3">
        {/* Left: Menu Button (Mobile) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value, false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch?.((e.target as HTMLInputElement).value, true)
                }
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-muted/50 border border-input rounded-lg text-sm
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center 
                text-primary-foreground text-sm font-semibold">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-popover rounded-lg shadow-lg 
                  border border-border z-50 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { onLogout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive
                      hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
