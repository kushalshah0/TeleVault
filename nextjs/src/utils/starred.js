// Client-side starred items management using localStorage

const STARRED_KEY = 'televault_starred_items';

export const starredUtils = {
  // Get all starred items
  getStarred() {
    try {
      const data = localStorage.getItem(STARRED_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading starred items:', error);
      return [];
    }
  },

  // Check if item is starred
  isStarred(itemId, itemType) {
    const starred = this.getStarred();
    return starred.some(item => item.id === itemId && item.type === itemType);
  },

  // Add item to starred
  addStarred(item, type, storageId, storageName) {
    const starred = this.getStarred();
    const newItem = {
      id: item.id,
      name: item.name,
      type: type, // 'file' or 'folder'
      storageId: storageId,
      storageName: storageName,
      mimeType: item.mime_type || null,
      size: item.size || null,
      starredAt: new Date().toISOString(),
    };
    
    // Avoid duplicates
    if (!this.isStarred(item.id, type)) {
      starred.push(newItem);
      localStorage.setItem(STARRED_KEY, JSON.stringify(starred));
    }
  },

  // Remove item from starred
  removeStarred(itemId, itemType) {
    let starred = this.getStarred();
    starred = starred.filter(item => !(item.id === itemId && item.type === itemType));
    localStorage.setItem(STARRED_KEY, JSON.stringify(starred));
  },

  // Toggle starred status
  toggleStarred(item, type, storageId, storageName) {
    if (this.isStarred(item.id, type)) {
      this.removeStarred(item.id, type);
      return false; // Now unstarred
    } else {
      this.addStarred(item, type, storageId, storageName);
      return true; // Now starred
    }
  },

  // Clear all starred items
  clearAll() {
    localStorage.removeItem(STARRED_KEY);
  },
};

// Recent files tracking
const RECENT_KEY = 'televault_recent_files';
const MAX_RECENT = 20;

export const recentUtils = {
  // Get recent files
  getRecent() {
    try {
      const data = localStorage.getItem(RECENT_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading recent files:', error);
      return [];
    }
  },

  // Add file to recent
  addRecent(file, storageId, storageName) {
    let recent = this.getRecent();
    
    // Remove if already exists
    recent = recent.filter(item => !(item.id === file.id && item.storageId === storageId));
    
    // Add to beginning
    const newItem = {
      id: file.id,
      name: file.name,
      storageId: storageId,
      storageName: storageName,
      mimeType: file.mime_type,
      size: file.size,
      accessedAt: new Date().toISOString(),
    };
    
    recent.unshift(newItem);
    
    // Keep only last MAX_RECENT items
    if (recent.length > MAX_RECENT) {
      recent = recent.slice(0, MAX_RECENT);
    }
    
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  },

  // Clear recent files
  clearAll() {
    localStorage.removeItem(RECENT_KEY);
  },
};
