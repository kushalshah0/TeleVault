'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { authAPI, storageAPI } from '@/utils/api-client'
import { ModernLoader } from '@/components/ModernLoader'
import { DashboardDataContext } from '@/context/DashboardContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [storages, setStorages] = useState<any[]>([])
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0)
  const hasInitialized = useRef(false)
  const loadingStorages = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      checkAuth()
    }
  }, [])

  // ⚡ REMOVED: No need to load storages again - already loaded in checkAuth

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (!token) {
      router.push('/login')
      return
    }

    // Check if token is expired (decode JWT and check exp claim)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiresAt = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      
      if (now >= expiresAt) {
        // Token expired, try to refresh
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          sessionStorage.removeItem('accessToken')
          sessionStorage.removeItem('refreshToken')
          router.push('/login?expired=true')
          return
        }

        // Try to refresh the token
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })

          if (refreshResponse.ok) {
            const data = await refreshResponse.json()
            const newToken = data.data.accessToken
            
            // Store new token in same location as original
            const useLocalStorage = localStorage.getItem('rememberMe') === 'true'
            if (useLocalStorage) {
              localStorage.setItem('accessToken', newToken)
            } else {
              sessionStorage.setItem('accessToken', newToken)
            }
          } else {
            // Refresh failed, redirect to login
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('rememberMe')
            sessionStorage.removeItem('accessToken')
            sessionStorage.removeItem('refreshToken')
            router.push('/login?expired=true')
            return
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('rememberMe')
          sessionStorage.removeItem('accessToken')
          sessionStorage.removeItem('refreshToken')
          router.push('/login?expired=true')
          return
        }
      }
    } catch (decodeError) {
      // Invalid token format
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      router.push('/login')
      return
    }

    try {
      // ⚡ OPTIMIZATION: Check cache first for storages
      const CACHE_KEY = 'televault_storages_cache'
      const CACHE_DURATION = 30000 // 30 seconds
      
      let storagesData = null
      const cached = localStorage.getItem(CACHE_KEY)
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION) {
          storagesData = data
        }
      }

      // If we have cached storages, just fetch user
      // Otherwise fetch both in parallel
      if (storagesData) {
        const userResponse = await authAPI.getMe()
        setUser(userResponse.data)
        setStorages(storagesData)
      } else {
        const [userResponse, storagesResponse] = await Promise.all([
          authAPI.getMe(),
          storageAPI.list()
        ])
        
        setUser(userResponse.data)
        const freshStorages = storagesResponse.data || []
        setStorages(freshStorages)
        
        // Update cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: freshStorages,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('rememberMe')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadStorages = async (skipCache = false) => {
    try {
      // ⚡ OPTIMIZATION: Cache storages list for 30 seconds
      const CACHE_KEY = 'televault_storages_cache'
      const CACHE_DURATION = 30000 // 30 seconds
      
      if (!skipCache) {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_DURATION) {
            setStorages(data || [])
            return // Use cached data
          }
        }
      }
      
      // Fetch fresh data
      const response = await storageAPI.list()
      const storagesData = response.data || []
      setStorages(storagesData)
      
      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: storagesData,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to load storages:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    setStorages([])
    setUsage(null)
    router.push('/login')
  }

  const handleSearchQueryChange = (query: string, shouldSearch = false) => {
    setSearchQuery(query)
    if (shouldSearch) {
      // Increment trigger to notify components to perform search
      setSearchTrigger(prev => prev + 1)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchTrigger(0)
  }

  if (loading) {
    return <ModernLoader text="Loading TeleVault..." type="spinner" />
  }

  if (!user) {
    return null
  }

  return (
    <DashboardDataContext.Provider value={{ storages, onRefresh: loadStorages, searchQuery, searchTrigger, clearSearch }}>
      <MainLayout
        user={{
          username: user?.username || '',
          email: user?.email || '',
          isAdmin: user?.is_admin || false
        }}
        onLogout={handleLogout}
        storages={storages}
        usage={usage}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onRefreshStorages={loadStorages}
      >
        {children}
      </MainLayout>
    </DashboardDataContext.Provider>
  )
}
