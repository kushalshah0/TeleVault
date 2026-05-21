'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Database,
  Clock,
  Star,
  Activity,
  Users,
  Folder,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface Storage {
  id: number
  name: string
}

export interface Usage {
  used_bytes: number
  file_count: number
}

export interface SidebarProps {
  storages?: Storage[]
  currentStorage?: Storage | null
  onStorageChange?: (storage: Storage) => void
  usage?: Usage | null
  isOpen: boolean
  onClose?: () => void
  isAdmin?: boolean
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}

function NavItem({ icon, label, active, collapsed, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all font-medium
        ${active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground hover:bg-accent'
        }
        ${collapsed ? 'lg:justify-center lg:px-0' : ''}
      `}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span className={`truncate lg:block hidden ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
      <span className="lg:hidden block truncate">{label}</span>
    </button>
  )
}

function Sidebar({ storages = [], currentStorage, onStorageChange, usage, isOpen, onClose, isAdmin }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string) => pathname === path

  const handleNavigation = (callback: () => void) => {
    callback()
    onClose?.()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-card border-r border-border
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64 ${collapsed ? 'lg:w-16' : 'lg:w-64'}
          flex flex-col h-screen
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 className={`text-lg font-semibold text-foreground truncate lg:block hidden ${collapsed ? 'lg:hidden' : ''}`}>TeleVault</h2>
            <h2 className="text-lg font-semibold text-foreground truncate lg:hidden">TeleVault</h2>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <NavItem
            icon={<Database className="w-5 h-5" />}
            label="All Storages"
            active={isActive('/dashboard')}
            collapsed={collapsed}
            onClick={() => handleNavigation(() => router.push('/dashboard'))}
          />

          <NavItem
            icon={<Clock className="w-5 h-5" />}
            label="Recent"
            active={isActive('/recent')}
            collapsed={collapsed}
            onClick={() => handleNavigation(() => router.push('/recent'))}
          />

          <NavItem
            icon={<Star className="w-5 h-5" />}
            label="Starred"
            active={isActive('/starred')}
            collapsed={collapsed}
            onClick={() => handleNavigation(() => router.push('/starred'))}
          />

          <NavItem
            icon={<Activity className="w-5 h-5" />}
            label="Activity"
            active={isActive('/activity')}
            collapsed={collapsed}
            onClick={() => handleNavigation(() => router.push('/activity'))}
          />

          {isAdmin && (
            <NavItem
              icon={<Users className="w-5 h-5" />}
              label="Users"
              active={isActive('/users')}
              collapsed={collapsed}
              onClick={() => handleNavigation(() => router.push('/users'))}
            />
          )}

          {/* Separator */}
          {storages.length > 0 && (
            <div className="my-2 mx-3 lg:block hidden">
              <div className="border-t border-border" />
            </div>
          )}
          {storages.length > 0 && (
            <div className="my-2 mx-3 lg:hidden">
              <div className="border-t border-border" />
            </div>
          )}

          {/* Storages */}
          {storages.length > 0 && (
            <div className="space-y-1">
              {storages.map((storage) => (
                <button
                  key={storage.id}
                  onClick={() => handleNavigation(() => {
                    router.push(`/storage/${storage.id}`)
                    onStorageChange?.(storage)
                  })}
                  className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all font-medium
                    ${currentStorage?.id === storage.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-accent'
                    }
                    ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                  `}
                >
                  <Folder className="w-5 h-5 flex-shrink-0" />
                  <span className={`truncate lg:block hidden ${collapsed ? 'lg:hidden' : ''}`}>{storage.name}</span>
                  <span className="lg:hidden block truncate">{storage.name}</span>
                </button>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
