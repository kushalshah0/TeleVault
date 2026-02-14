'use client'

import { useState, useCallback } from 'react'

export interface ContextMenuData {
  x: number
  y: number
  data: any
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null)

  const showContextMenu = useCallback((e: React.MouseEvent, data: any) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      data,
    })
  }, [])

  const hideContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  }
}
