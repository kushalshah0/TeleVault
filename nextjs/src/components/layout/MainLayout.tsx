'use client'

import { useState, ReactNode, cloneElement, isValidElement } from 'react'
import Sidebar, { Storage, Usage } from './Sidebar'
import Header from './Header'

export interface MainLayoutProps {
  user?: {
    username: string
    email: string
  }
  onLogout: () => void
  storages?: Storage[]
  currentStorage?: Storage | null
  usage?: Usage | null
  children: ReactNode
  searchQuery?: string
  onSearchQueryChange?: (query: string, shouldSearch: boolean) => void
  onRefreshStorages?: (skipCache?: boolean) => Promise<void>
}

function MainLayout({ 
  user, 
  onLogout, 
  storages = [], 
  currentStorage, 
  usage, 
  children, 
  searchQuery, 
  onSearchQueryChange,
  onRefreshStorages 
}: MainLayoutProps) {
  const [selectedStorage, setSelectedStorage] = useState<Storage | null>(currentStorage || null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleStorageChange = (storage: Storage) => {
    setSelectedStorage(storage)
  }

  const handleSearch = (query: string, shouldSearch: boolean = false) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(query, shouldSearch)
    }
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        storages={storages}
        currentStorage={selectedStorage || currentStorage}
        onStorageChange={handleStorageChange}
        usage={usage}
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Header */}
        <Header
          user={user}
          onLogout={onLogout}
          onSearch={handleSearch}
          onMenuToggle={toggleMobileMenu}
          searchValue={searchQuery || ''}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl">
            {isValidElement(children) && (children.type as any)?.name === 'Dashboard'
              ? cloneElement(children as any, { storages, onRefresh: onRefreshStorages })
              : children
            }
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
