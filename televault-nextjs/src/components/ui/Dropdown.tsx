'use client'

import React, { useState, useRef, useEffect } from 'react'

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, children, align = 'left' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 min-w-[12rem] overflow-hidden
            rounded-lg border border-border bg-popover shadow-lg
            animate-slide-in
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          <div className="p-1">{children}</div>
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  onClick?: () => void
  children: React.ReactNode
  icon?: React.ReactNode
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export function DropdownItem({ 
  onClick, 
  children, 
  icon, 
  variant = 'default',
  disabled = false 
}: DropdownItemProps) {
  const variants = {
    default: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'text-destructive hover:bg-destructive/10',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md
        transition-colors text-left
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />
}
