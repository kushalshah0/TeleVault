import { useState, useCallback } from 'react';

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null);

  const showContextMenu = useCallback((e, data) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      data,
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}
