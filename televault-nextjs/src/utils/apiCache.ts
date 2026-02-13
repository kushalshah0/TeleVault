/**
 * API Response Cache
 * Caches API responses to improve performance and reduce server load
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache is expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    }
    this.cache.set(key, entry)
  }

  /**
   * Remove specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Remove all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    const keysToDelete: string[] = []
    
    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let validEntries = 0
    let expiredEntries = 0
    const now = Date.now()

    for (const entry of Array.from(this.cache.values())) {
      if (now > entry.expiresAt) {
        expiredEntries++
      } else {
        validEntries++
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// Export singleton instance
export const apiCache = new APICache()

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 5 * 60 * 1000)
}

// Helper functions for cache key generation
export const cacheKeys = {
  storage: (id: number) => `storage:${id}`,
  storages: () => 'storages:list',
  files: (storageId: number, folderId: number | null) => 
    `files:${storageId}:${folderId ?? 'root'}`,
  folders: (storageId: number, parentId: number | null) => 
    `folders:${storageId}:${parentId ?? 'root'}`,
  folderContents: (folderId: number) => `folder-contents:${folderId}`,
  search: (storageId: number, query: string, folderId: number | null) =>
    `search:${storageId}:${folderId ?? 'all'}:${query}`,
}

// Helper functions for cache invalidation
export const invalidateCache = {
  // Invalidate all storage-related caches
  storage: (storageId: number) => {
    apiCache.invalidate(cacheKeys.storage(storageId))
    apiCache.invalidatePattern(`files:${storageId}:`)
    apiCache.invalidatePattern(`folders:${storageId}:`)
    apiCache.invalidatePattern(`search:${storageId}:`)
  },
  
  // Invalidate storages list
  storages: () => {
    apiCache.invalidate(cacheKeys.storages())
  },
  
  // Invalidate folder and its contents
  folder: (storageId: number, folderId: number | null) => {
    apiCache.invalidate(cacheKeys.files(storageId, folderId))
    apiCache.invalidate(cacheKeys.folders(storageId, folderId))
    if (folderId) {
      apiCache.invalidate(cacheKeys.folderContents(folderId))
    }
    // Also invalidate search results for this folder
    apiCache.invalidatePattern(`search:${storageId}:${folderId ?? 'all'}:`)
  },
  
  // Invalidate file-related caches
  file: (storageId: number, folderId: number | null) => {
    apiCache.invalidate(cacheKeys.files(storageId, folderId))
    if (folderId) {
      apiCache.invalidate(cacheKeys.folderContents(folderId))
    }
    // Invalidate storage to update total size
    apiCache.invalidate(cacheKeys.storage(storageId))
    apiCache.invalidate(cacheKeys.storages())
    // Invalidate search results
    apiCache.invalidatePattern(`search:${storageId}:`)
  },
  
  // Invalidate all caches
  all: () => {
    apiCache.clear()
  },
}
