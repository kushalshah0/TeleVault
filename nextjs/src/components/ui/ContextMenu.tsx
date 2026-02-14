'use client'

import { useEffect, useRef, ReactNode } from 'react'

export interface ContextMenuItem {
  label?: string
  icon?: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  divider?: boolean
  shortcut?: string
}

export interface ContextMenuProps {
  x: number
  y: number
  items?: ContextMenuItem[]
  onClose: () => void
}

function ContextMenu({ x, y, items = [], onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-soft-lg 
        border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.divider ? (
            <hr className="my-1 border-gray-200 dark:border-gray-700" />
          ) : (
            <button
              onClick={() => {
                item.onClick?.()
                onClose()
              }}
              disabled={item.disabled}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3
                transition-colors
                ${item.danger 
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {item.icon && <span className="text-lg">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {item.shortcut}
                </span>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default ContextMenu
