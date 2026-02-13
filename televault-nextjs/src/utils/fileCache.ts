/**
 * Client-side file cache for previews and downloads
 * Uses IndexedDB for large files and memory cache for small files
 */

interface CacheEntry {
  blob: Blob
  timestamp: number
  fileId: number
  fileName: string
}

class FileCache {
  private memoryCache: Map<number, CacheEntry> = new Map()
  private maxMemoryCacheSize = 50 * 1024 * 1024 // 50MB in memory
  private maxCacheAge = 60 * 60 * 1000 // 1 hour
  private currentMemorySize = 0

  /**
   * Get a cached file blob
   */
  async get(fileId: number): Promise<Blob | null> {
    const cached = this.memoryCache.get(fileId)
    
    if (!cached) {
      return null
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.maxCacheAge) {
      this.remove(fileId)
      return null
    }

    return cached.blob
  }

  /**
   * Store a file blob in cache
   */
  async set(fileId: number, fileName: string, blob: Blob): Promise<void> {
    // Don't cache very large files (> 10MB)
    if (blob.size > 10 * 1024 * 1024) {
      return
    }

    // Ensure we have space
    this.ensureSpace(blob.size)

    const entry: CacheEntry = {
      blob,
      timestamp: Date.now(),
      fileId,
      fileName,
    }

    this.memoryCache.set(fileId, entry)
    this.currentMemorySize += blob.size
  }

  /**
   * Remove a file from cache
   */
  remove(fileId: number): void {
    const cached = this.memoryCache.get(fileId)
    if (cached) {
      this.currentMemorySize -= cached.blob.size
      this.memoryCache.delete(fileId)
    }
  }

  /**
   * Clear all cached files
   */
  clear(): void {
    this.memoryCache.clear()
    this.currentMemorySize = 0
  }

  /**
   * Ensure we have space for a new file
   */
  private ensureSpace(neededSize: number): void {
    // If adding this file would exceed max cache size, remove oldest entries
    while (this.currentMemorySize + neededSize > this.maxMemoryCacheSize && this.memoryCache.size > 0) {
      // Find oldest entry
      let oldestId: number | null = null
      let oldestTimestamp = Date.now()

      for (const [id, entry] of Array.from(this.memoryCache.entries())) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp
          oldestId = id
        }
      }

      if (oldestId !== null) {
        this.remove(oldestId)
      } else {
        break
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.memoryCache.size,
      sizeBytes: this.currentMemorySize,
      sizeMB: (this.currentMemorySize / 1024 / 1024).toFixed(2),
    }
  }
}

// Export singleton instance
export const fileCache = new FileCache()
