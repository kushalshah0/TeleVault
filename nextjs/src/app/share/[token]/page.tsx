'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import ThemeToggle from '@/components/ThemeToggle'

interface FileInfo {
  name: string
  size: number
  mime_type: string
  created_by?: string
  created_at?: string
  expires_at?: string | null
  max_downloads?: number | null
  download_count?: number
}

export default function SharePage() {
  const params = useParams()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (!token || String(token).trim() === '') {
      setLoading(false)
      setError('Invalid share link')
      return
    }
    fetchFileInfo()
    
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark')
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }, [theme])

  const fetchFileInfo = async () => {
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/share/${token}?action=info`)
      const data = await response.json()

      if (!response.ok) {
        if (data.requires_password) {
          setRequiresPassword(true)
          setLoading(false)
          return
        }
        setError(data.error || 'Share link not found or expired')
        setLoading(false)
        return
      }

      setFileInfo(data)
      setRequiresPassword(data.has_password || false)
      setLoading(false)
    } catch (err) {
      setError('Failed to load. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!token) return

    setDownloading(true)

    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: password ? JSON.stringify({ password }) : JSON.stringify({})
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401 && data.requires_password) {
          setError('Incorrect password')
          setDownloading(false)
          return
        }
        throw new Error(data.error || 'Download failed')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      let filename = fileInfo?.name || 'download'
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=UTF-8''(.+?)(?:;|$)/)
        if (match) {
          filename = decodeURIComponent(match[1])
        }
      }

      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)

      setDownloading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
      setDownloading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return (
      <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎬'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📕'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '📦'
    if (mimeType.includes('text')) return '📝'
    return (
      <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  const isExpired = fileInfo?.expires_at && new Date(fileInfo.expires_at) < new Date()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">☁️</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">TeleVault</h1>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading file info...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !fileInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">☁️</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">TeleVault</h1>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unable to Access</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button onClick={fetchFileInfo} className="w-full">Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☁️</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">TeleVault</h1>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Shared File</h1>
            <p className="text-primary-100 mt-1">TeleVault</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                  {getFileIcon(fileInfo?.mime_type || '')}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-white truncate mb-1">
                    {fileInfo?.name || 'Unknown file'}
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      {formatFileSize(fileInfo?.size || 0)}
                    </p>
                    {fileInfo?.mime_type && (
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {fileInfo.mime_type}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {fileInfo?.created_by && (
                <div className="flex items-center justify-between py-2 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Shared by</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{fileInfo.created_by}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(fileInfo?.created_at)}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">Expires</span>
                <span className={`text-sm font-medium ${isExpired ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {formatDate(fileInfo?.expires_at || undefined)}
                  {isExpired && ' (Expired)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">Downloads</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {fileInfo?.download_count || 0}{fileInfo?.max_downloads ? ` / ${fileInfo.max_downloads}` : ' / ∞'}
                </span>
              </div>
            </div>

            {requiresPassword && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔐 Password Required
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                    placeholder="Enter file password"
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleDownload}
              disabled={downloading || (requiresPassword && !password) || !!isExpired}
              className="w-full py-4 text-lg"
            >
              {downloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Downloading...
                </>
              ) : isExpired ? (
                'Link Expired'
              ) : (
                <>
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
              Shared securely via TeleVault
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
