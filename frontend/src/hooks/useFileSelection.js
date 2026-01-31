import { useState, useCallback } from 'react';

export function useFileSelection() {
  const [selectedItems, setSelectedItems] = useState([]);

  const toggleSelection = useCallback((item) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((i) => i.id === item.id && i.type === item.type);
      if (isSelected) {
        return prev.filter((i) => !(i.id === item.id && i.type === item.type));
      }
      return [...prev, item];
    });
  }, []);

  const selectAll = useCallback((items) => {
    setSelectedItems(items);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const isSelected = useCallback((item) => {
    return selectedItems.some((i) => i.id === item.id && i.type === item.type);
  }, [selectedItems]);

  return {
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedItems.length > 0,
    selectionCount: selectedItems.length,
  };
}
