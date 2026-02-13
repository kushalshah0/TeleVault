/**
 * API Client for frontend components
 * Wrapper around fetch API with automatic token refresh
 */

import { apiCache, cacheKeys, invalidateCache } from './apiCache'

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || ''

interface RequestOptions extends Omit<RequestInit, 'cache'> {
  token?: string
  cache?: boolean // Enable caching for this request
  cacheKey?: string // Custom cache key
  cacheTTL?: number // Custom cache TTL in milliseconds
}

/**
 * Make an authenticated API request with automatic token refresh
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data: T }> {
  const { cache: enableCache = false, cacheKey, cacheTTL, ...fetchOptions } = options
  
  // Check cache first for GET requests
  if (enableCache && cacheKey && fetchOptions.method !== 'POST' && fetchOptions.method !== 'PUT' && fetchOptions.method !== 'DELETE' && fetchOptions.method !== 'PATCH') {
    const cached = apiCache.get<T>(cacheKey)
    if (cached !== null) {
      return { data: cached }
    }
  }
  const { token, headers, ...restOptions } = fetchOptions

  // Check both localStorage and sessionStorage for the access token
  const authToken = token || (typeof window !== 'undefined' 
    ? (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))
    : null)

  // Add timeout to prevent hanging requests
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...restOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...headers,
      },
    })
    
    clearTimeout(timeoutId)

  // Handle 401 - try to refresh token
  if (response.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        })

        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          // Store new token in the same storage type as original
          const useLocalStorage = localStorage.getItem('rememberMe') === 'true'
          if (useLocalStorage) {
            localStorage.setItem('accessToken', data.data.accessToken)
          } else {
            sessionStorage.setItem('accessToken', data.data.accessToken)
          }
          
          // Retry original request with new token
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...restOptions,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.data.accessToken}`,
              ...headers,
            },
          })
          
          if (retryResponse.ok) {
            return retryResponse.json()
          }
        }
      } catch (error) {
        // Refresh failed - save location and redirect to login
        const currentPath = window.location.pathname + window.location.search
        sessionStorage.setItem('redirectAfterLogin', currentPath)
        
        // Clear tokens from both storage locations
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('rememberMe')
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
        window.location.href = `/login?expired=true&from=${encodeURIComponent(currentPath)}`
        throw error
      }
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    
    // If still 401 after refresh attempt, save location and redirect to login
    if (response.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search
      sessionStorage.setItem('redirectAfterLogin', currentPath)
      
      // Clear tokens from both storage locations
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('rememberMe')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      window.location.href = `/login?expired=true&from=${encodeURIComponent(currentPath)}`
    }
    
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  const result = await response.json()
  
  // Cache successful GET responses
  if (enableCache && cacheKey && (!restOptions.method || restOptions.method === 'GET')) {
    apiCache.set(cacheKey, result.data, { ttl: cacheTTL })
  }
  
  return result
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again')
    }
    throw error
  }
}

/**
 * Auth API
 */
export const authAPI = {
  login: (username: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  
  register: (username: string, email: string, password: string) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
  
  getMe: () => apiRequest('/api/auth/me'),
  
  getUsage: async () => {
    // This is now deprecated - usage is calculated directly from storages list
    // Kept for backward compatibility
    return { data: { used_bytes: 0, file_count: 0 } }
  },
}

/**
 * Storage API
 */
export const storageAPI = {
  list: () => apiRequest('/api/storages', {
    cache: true,
    cacheKey: cacheKeys.storages(),
    cacheTTL: 2 * 60 * 1000, // 2 minutes
  }),
  
  get: (id: number) => apiRequest(`/api/storages/${id}`, {
    cache: true,
    cacheKey: cacheKeys.storage(id),
    cacheTTL: 3 * 60 * 1000, // 3 minutes
  }),
  
  create: async (name: string, telegramChannelId: string) => {
    const result = await apiRequest('/api/storages', {
      method: 'POST',
      body: JSON.stringify({ name, telegramChannelId }),
    })
    // Invalidate storages list cache
    invalidateCache.storages()
    return result
  },
  
  update: async (id: number, data: { name?: string }) => {
    const result = await apiRequest(`/api/storages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    // Invalidate all caches related to this storage
    invalidateCache.storage(id)
    invalidateCache.storages()
    return result
  },
  
  delete: async (id: number) => {
    const result = await apiRequest(`/api/storages/${id}`, { method: 'DELETE' })
    // Invalidate all caches related to this storage
    invalidateCache.storage(id)
    invalidateCache.storages()
    return result
  },
  
  search: async (storageId: number, query: string, folderId: number | null = null) => {
    const params = new URLSearchParams({
      q: query,
      storageId: storageId.toString(),
    })
    
    if (folderId !== null) {
      params.append('folderId', folderId.toString())
    }
    
    return apiRequest(`/api/search?${params.toString()}`, {
      cache: true,
      cacheKey: cacheKeys.search(storageId, query, folderId),
      cacheTTL: 1 * 60 * 1000, // 1 minute (searches should be relatively fresh)
    })
  },
  
  getActivities: async (limit: number = 50, offset: number = 0) => {
    return apiRequest(`/api/activities?limit=${limit}&offset=${offset}`)
  },
}

/**
 * Folder API
 */
export const folderAPI = {
  list: async (storageId: number, parentId: number | null = null) => {
    if (parentId) {
      // Fetch contents of specific folder using dedicated endpoint
      const response = await apiRequest(`/api/folders/${parentId}/contents`, {
        cache: true,
        cacheKey: cacheKeys.folderContents(parentId),
        cacheTTL: 2 * 60 * 1000, // 2 minutes
      })
      return { data: response.data.folders || [] }
    }
    // For root level, fetch from storage endpoint (cached)
    const response = await apiRequest(`/api/storages/${storageId}`, {
      cache: true,
      cacheKey: cacheKeys.storage(storageId),
      cacheTTL: 3 * 60 * 1000, // 3 minutes
    })
    const folders = response.data.folders || []
    return { data: folders.filter((f: any) => !f.parent_id) }
  },
  
  create: async (storageId: number, name: string, parentId: number | null = null) => {
    const result = await apiRequest('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ storageId, name, parentId }),
    })
    // Invalidate folder caches
    invalidateCache.folder(storageId, parentId)
    invalidateCache.storage(storageId)
    return result
  },
  
  rename: async (storageId: number, folderId: number, newName: string) => {
    // TODO: Implement folder rename endpoint
    return { data: {} }
  },
  
  delete: async (storageId: number, folderId: number) => {
    const result = await apiRequest(`/api/folders/${folderId}`, { method: 'DELETE' })
    // Invalidate all related caches (we don't know the parentId, so invalidate broadly)
    invalidateCache.storage(storageId)
    apiCache.invalidatePattern(`folder-contents:`)
    apiCache.invalidatePattern(`folders:${storageId}:`)
    apiCache.invalidatePattern(`files:${storageId}:`)
    return result
  },
}

/**
 * File API
 */
export const fileAPI = {
  list: async (storageId: number, folderId: number | null = null) => {
    if (folderId) {
      // Fetch files from specific folder using dedicated endpoint
      const response = await apiRequest(`/api/folders/${folderId}/contents`, {
        cache: true,
        cacheKey: cacheKeys.folderContents(folderId),
        cacheTTL: 2 * 60 * 1000, // 2 minutes
      })
      return { data: response.data.files || [] }
    }
    // For root level, fetch from storage endpoint (cached)
    const response = await apiRequest(`/api/storages/${storageId}`, {
      cache: true,
      cacheKey: cacheKeys.storage(storageId),
      cacheTTL: 3 * 60 * 1000, // 3 minutes
    })
    const files = response.data.files || []
    return { data: files.filter((f: any) => !f.folder_id) }
  },
  
  upload: async (
    storageId: number,
    file: File,
    folderId: number | null = null,
    onProgress?: (percent: number) => void
  ) => {
    // Use chunked upload via useFileUpload hook instead
    throw new Error('Use useFileUpload hook for file uploads')
  },
  
  download: async (storageId: number, fileId: number) => {
    // Check both localStorage (Remember Me) and sessionStorage (current session)
  const token = typeof window !== 'undefined' 
    ? (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))
    : null
    
    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      throw new Error('Download failed')
    }

    return response
  },
  
  rename: async (storageId: number, fileId: number, newName: string) => {
    const result = await apiRequest(`/api/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    })
    // Invalidate file caches
    invalidateCache.file(storageId, null)
    invalidateCache.storage(storageId)
    return result
  },
  
  delete: async (storageId: number, fileId: number, folderId: number | null = null) => {
    const result = await apiRequest(`/api/files/${fileId}`, { method: 'DELETE' })
    // Invalidate file caches
    invalidateCache.file(storageId, folderId)
    return result
  },
}

export default { authAPI, storageAPI, folderAPI, fileAPI }
