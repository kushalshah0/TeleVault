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
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium
          ${active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-foreground hover:bg-accent'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <span className="w-5 h-5 flex-shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover 
          text-popover-foreground text-xs rounded-md shadow-lg border border-border 
          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
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
          ${collapsed ? 'lg:w-16' : 'lg:w-64'}
          flex flex-col h-screen
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 p-0' : 'w-auto opacity-100'}`}>
            <span className="text-2xl">☁️</span>
            <h2 className="text-lg font-semibold text-foreground truncate">TeleVault</h2>
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
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
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
            <div className={`my-2 ${collapsed ? 'mx-2' : 'mx-3'}`}>
              <div className="border-t border-border" />
            </div>
          )}

          {/* Storages */}
          {storages.length > 0 && (
            <div className="space-y-1">
              {storages.map((storage) => (
                <div key={storage.id} className="relative group">
                  <button
                    onClick={() => handleNavigation(() => {
                      router.push(`/storage/${storage.id}`)
                      onStorageChange?.(storage)
                    })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium
                      ${currentStorage?.id === storage.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-accent'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Folder className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{storage.name}</span>}
                  </button>
                  {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover 
                      text-popover-foreground text-xs rounded-md shadow-lg border border-border 
                      opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {storage.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Usage Footer */}
        {usage && !collapsed && (
          <div className="p-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Storage Used</p>
            <div className="w-full bg-accent rounded-full h-1.5 mb-1">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((usage.used_bytes / (10 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(usage.used_bytes)} / 10 GB
            </p>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
