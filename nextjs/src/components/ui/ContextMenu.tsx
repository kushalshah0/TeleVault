'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'

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
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    if (x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8
    }

    if (y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8
    }

    adjustedX = Math.max(8, adjustedX)
    adjustedY = Math.max(8, adjustedY)

    setPosition({ x: adjustedX, y: adjustedY })

    requestAnimationFrame(() => setIsVisible(true))
  }, [x, y])

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
      className="fixed inset-0 z-50 pointer-events-none"
    >
      <div
        ref={menuRef}
        className={`absolute pointer-events-auto min-w-[200px] rounded-xl border border-border 
          bg-popover shadow-2xl backdrop-blur-sm py-1.5 overflow-hidden
          transition-all duration-150 ease-out
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {items.map((item, index) => (
          <div key={index}>
            {item.divider ? (
              <div className="px-2 py-1.5">
                <div className="h-px bg-border" />
              </div>
            ) : (
              <button
                onClick={() => {
                  item.onClick?.()
                  onClose()
                }}
                disabled={item.disabled}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-lg mx-1.5
                  transition-all duration-100 outline-none
                  ${item.danger
                    ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10'
                    : 'text-popover-foreground hover:bg-accent focus-visible:bg-accent'
                  }
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {item.icon && (
                  <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center
                    ${item.danger ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 font-medium">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-muted-foreground font-mono ml-auto">
                    {item.shortcut}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ContextMenu
