'use client'

import { useState } from 'react'
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

  const handleMobileSearch = () => {
    if (mobileSearchValue.trim()) {
      onSearch?.(mobileSearchValue, true)
      setShowMobileSearch(false)
    }
  }

  return (
    <header className="bg-background/95 backdrop-blur-lg border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* App Logo - Mobile (Clickable to open sidebar) */}
        <button
          onClick={onMenuToggle}
          className="flex items-center gap-2 lg:hidden hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">☁️</span>
          <h1 className="text-xl font-bold text-foreground">
            TeleVault
          </h1>
        </button>

        {/* App Logo - Desktop (Non-clickable) */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-2xl">☁️</span>
          <h1 className="text-xl font-bold text-foreground">
            TeleVault
          </h1>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block mx-4">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                placeholder="Search files and folders..."
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value, false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearch?.((e.target as HTMLInputElement).value, true)
                  }
                }}
                className="block w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  text-foreground placeholder:text-muted-foreground transition-all"
              />
            </div>
            <button
              onClick={() => onSearch?.(searchValue, true)}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90
                rounded-lg transition-colors font-medium"
              title="Search"
            >
              Search
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Mobile Search Button */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Search"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-foreground">
                {user?.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
            
            <div className="relative group">
              <button className="w-10 h-10 bg-primary rounded-full flex items-center justify-center 
                text-primary-foreground font-semibold hover:opacity-90 transition-all">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-popover rounded-lg shadow-lg border border-border
                opacity-0 invisible group-hover:opacity-100 group-hover:visible
                transition-all duration-200">
                <div className="p-1">
                  <button 
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-sm text-destructive
                      hover:bg-destructive/10 rounded-md flex items-center gap-2 transition-colors">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowMobileSearch(false)}>
          <div className="bg-white dark:bg-gray-900 p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileSearch(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="search"
                  placeholder="Search files and folders..."
                  value={mobileSearchValue}
                  onChange={(e) => setMobileSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleMobileSearch()
                    }
                  }}
                  autoFocus
                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                />
              </div>
              <button
                onClick={handleMobileSearch}
                disabled={!mobileSearchValue.trim()}
                className="px-4 py-3 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                  rounded-lg transition-colors font-medium"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
