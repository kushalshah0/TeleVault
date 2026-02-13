'use client'

import { useState, useCallback } from 'react'

export interface SelectableItem {
  id: number
  type?: 'file' | 'folder'
  name?: string
  [key: string]: any
}

export function useFileSelection() {
  const [selectedItems, setSelectedItems] = useState<SelectableItem[]>([])

  const toggleSelection = useCallback((item: SelectableItem) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((i) => i.id === item.id && i.type === item.type)
      if (isSelected) {
        return prev.filter((i) => !(i.id === item.id && i.type === item.type))
      }
      return [...prev, item]
    })
  }, [])

  const selectAll = useCallback((items: SelectableItem[]) => {
    setSelectedItems(items)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  const isSelected = useCallback((item: SelectableItem) => {
    return selectedItems.some((i) => i.id === item.id && i.type === item.type)
  }, [selectedItems])

  return {
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedItems.length > 0,
    selectionCount: selectedItems.length,
  }
}
