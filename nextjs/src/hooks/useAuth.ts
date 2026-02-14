/**
 * Authentication hook
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  username: string
  email: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })
  const router = useRouter()

  /**
   * Check if user is authenticated on mount
   */
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setState({ user: null, loading: false, error: null })
      return
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setState({ user: data.data, loading: false, error: null })
      } else {
        // Token invalid, try refresh
        await refreshToken()
      }
    } catch (error) {
      setState({ user: null, loading: false, error: 'Authentication failed' })
    }
  }

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      logout()
      return
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('accessToken', data.data.accessToken)
        await checkAuth()
      } else {
        logout()
      }
    } catch (error) {
      logout()
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await response.json()
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      
      setState({ user: data.data.user, loading: false, error: null })
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setState(prev => ({ ...prev, error: message }))
      throw error
    }
  }, [router])

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Registration failed')
      }

      const data = await response.json()
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      
      setState({ user: data.data.user, loading: false, error: null })
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      setState(prev => ({ ...prev, error: message }))
      throw error
    }
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setState({ user: null, loading: false, error: null })
    router.push('/login')
  }, [router])

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    isAuthenticated: !!state.user,
  }
}
