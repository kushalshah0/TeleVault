'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loader } from '@/components/ModernLoader'
import { ViewModeToggle } from '@/components/ui'
import ThemeToggle from '@/components/ThemeToggle'
import FileIcon from '@/components/ui/FileIcon'
import FilePreview from '@/components/FilePreview'

interface FolderItem {
  id: number
  name: string
  type: 'folder' | 'file'
  size?: number
  mime_type?: string
  modified_at?: string
}

interface FolderInfo {
  name: string
  path: string
  created_by: string
  created_at: string
  expires_at?: string | null
  max_downloads?: number | null
  download_count?: number
}

export default function FolderSharePage() {
  const params = useParams()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null)
  const [items, setItems] = useState<FolderItem[]>([])
  const folders = items.filter(item => item.type === 'folder')
  const files = items.filter(item => item.type === 'file')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadingSelected, setDownloadingSelected] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [currentPath, setCurrentPath] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [lastClickedItem, setLastClickedItem] = useState<{ id: number; timestamp: number } | null>(null)
  const [previewFile, setPreviewFile] = useState<FolderItem | null>(null)

  useEffect(() => {
    if (!token || String(token).trim() === '') {
      setLoading(false)
      setError('Invalid share link')
      return
    }
    
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark')
      document.documentElement.classList.add('dark')
    }
    
    fetchFolderInfo('')
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }, [theme])

  const fetchFolderInfo = async (path: string) => {
    try {
      setLoading(true)
      const baseUrl = window.location.origin
      const url = `${baseUrl}/api/share/folder/${token}${path ? `?path=${encodeURIComponent(path)}` : ''}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: password ? JSON.stringify({ password }) : JSON.stringify({})
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 && data.requires_password) {
          setRequiresPassword(true)
          setLoading(false)
          return
        }
        setError(data.error || 'Share link not found or expired')
        setLoading(false)
        return
      }

      setFolderInfo(data.folder)
      setItems(data.items || [])
      setRequiresPassword(false)
      setCurrentPath(path || '')
      setLoading(false)
    } catch (err) {
      setError('Failed to load. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const handleNavigate = (path: string) => {
    setSelectedItems(new Set())
    fetchFolderInfo(path)
  }

  const handleDownloadAll = async () => {
    if (!token) return

    setDownloadingAll(true)
    try {
      const baseUrl = window.location.origin
      
      const response = await fetch(`${baseUrl}/api/share/folder/${token}/download?all=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, password: password || undefined })
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401 && data.requires_password) {
          setError('Incorrect password')
          setDownloadingAll(false)
          setTimeout(() => setError(''), 3000)
          return
        }
        throw new Error(data.error || 'Download failed')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'download'
      
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
    } catch (err) {
      setError('Download failed')
      setTimeout(() => setError(''), 3000)
    } finally {
      setDownloadingAll(false)
    }
  }

  const handleDownloadSelected = async () => {
    if (!token) return

    setDownloadingSelected(true)
    try {
      const baseUrl = window.location.origin
      
      // Check if this is a single file download
      const isSingleFile = selectedItems.size === 1 && 
        Array.from(selectedItems).every(id => items.find(i => i.id === id)?.type === 'file')
      
      // If single file, use direct download (no zip)
      if (isSingleFile) {
        const fileId = Array.from(selectedItems)[0]
        const response = await fetch(`${baseUrl}/api/share/folder/${token}/download-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: fileId, password: password || undefined })
        })

        if (!response.ok) {
          const data = await response.json()
          if (response.status === 401 && data.requires_password) {
            setError('Incorrect password')
            setDownloadingSelected(false)
            setTimeout(() => setError(''), 3000)
            return
          }
          throw new Error(data.error || 'Download failed')
        }

        const fileInfo = items.find(i => i.id === fileId)
        const contentDisposition = response.headers.get('content-disposition')
        let filename = fileInfo?.name || 'download'
        
        if (contentDisposition) {
          const match = contentDisposition.match(/filename\*?=UTF-8''(.+?)(?:;|$)/)
          if (match) {
            filename = decodeURIComponent(match[1])
          }
        }

        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
        setDownloadingSelected(false)
        return
      }

      // For multiple files, use zip download
      const response = await fetch(`${baseUrl}/api/share/folder/${token}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: Array.from(selectedItems), password: password || undefined })
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401 && data.requires_password) {
          setError('Incorrect password')
          setDownloadingSelected(false)
          setTimeout(() => setError(''), 3000)
          return
        }
        throw new Error(data.error || 'Download failed')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'download'
      
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
    } catch (err) {
      setError('Download failed')
      setTimeout(() => setError(''), 3000)
    } finally {
      setDownloadingSelected(false)
    }
  }

  const handleFileDownload = async (item: FolderItem, asBlob?: boolean): Promise<Blob | undefined> => {
    if (!token) return undefined

    if (!asBlob) {
      setDownloadingSelected(true)
    }
    try {
      const baseUrl = window.location.origin
      
      const response = await fetch(`${baseUrl}/api/share/folder/${token}/download-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: item.id, password: password || undefined })
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401 && data.requires_password) {
          if (!asBlob) {
            setError('Incorrect password')
            setDownloadingSelected(false)
            setTimeout(() => setError(''), 3000)
          }
          return undefined
        }
        throw new Error(data.error || 'Download failed')
      }

      const blob = await response.blob()
      
      if (asBlob) {
        return blob
      }

      const contentDisposition = response.headers.get('content-disposition')
      let filename = item.name
      
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
    } catch (err) {
      if (!asBlob) {
        setError('Download failed')
        setTimeout(() => setError(''), 3000)
      }
      return undefined
    } finally {
      if (!asBlob) {
        setDownloadingSelected(false)
      }
    }
  }

  const handleItemClick = (item: FolderItem, e: React.MouseEvent) => {
    const now = Date.now()
    const DOUBLE_CLICK_DELAY = 400
    const isCtrlPressed = e.ctrlKey || e.metaKey
    
    if (lastClickedItem && lastClickedItem.id === item.id && (now - lastClickedItem.timestamp) < DOUBLE_CLICK_DELAY) {
      // Double click - open folder or download file
      if (item.type === 'folder') {
        handleNavigate(item.name)
      } else {
        handleFileDownload(item)
      }
      setLastClickedItem(null)
    } else {
      // Single click - select item
      setLastClickedItem({ id: item.id, timestamp: now })
      if (isCtrlPressed) {
        // Ctrl+Click - toggle selection
        toggleSelect(item.id)
      } else {
        // Without Ctrl - clear selection and select only this item
        if (selectedItems.has(item.id)) {
          setSelectedItems(new Set())
        } else {
          setSelectedItems(new Set([item.id]))
        }
      }
    }
  }

  const handleOpenClick = (item: FolderItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.type === 'folder') {
      handleNavigate(item.name)
    }
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(i => i.id)))
    }
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getBreadcrumbs = () => {
    if (!folderInfo?.path) return []
    const parts = folderInfo.path.split('/').filter(Boolean)
    return parts
  }

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
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <Loader size="lg" className="mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading folder...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (requiresPassword) {
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
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Password Required</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Enter password to access this folder</p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
                <Button onClick={() => fetchFolderInfo(currentPath)} className="w-full">
                  Access Folder
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !folderInfo) {
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
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
              <p className="text-gray-500 dark:text-gray-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 overflow-x-auto">
          <button onClick={() => handleNavigate('')} className="hover:text-primary-600 dark:hover:text-primary-400 whitespace-nowrap">
            Shared Folder
          </button>
          {getBreadcrumbs().map((part, idx) => (
            <span key={idx} className="flex items-center gap-2">
              <span>/</span>
              <button onClick={() => handleNavigate('/' + getBreadcrumbs().slice(0, idx + 1).join('/'))} className="hover:text-primary-600 dark:hover:text-primary-400 whitespace-nowrap">
                {part}
              </button>
            </span>
          ))}
        </nav>

        {/* Folder Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{folderInfo?.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Shared by {folderInfo?.created_by} • {formatDate(folderInfo?.created_at)}
              </p>
            </div>
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Selection Bar */}
        {selectedItems.size > 0 && (
          <div className="selection-bar flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 
            border border-primary-200 dark:border-primary-800 rounded-lg px-4 py-3 mb-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="text-sm font-medium text-primary-900 dark:text-primary-100 whitespace-nowrap">
                {selectedItems.size} selected
              </span>
              <div className="flex items-center gap-2">
                {/* Open Folder Button - Only when single folder is selected */}
                {selectedItems.size === 1 && Array.from(selectedItems).every(id => items.find(i => i.id === id)?.type === 'folder') && (
                  <button
                    onClick={() => {
                      const folderId = Array.from(selectedItems)[0]
                      const folder = items.find(i => i.id === folderId)
                      if (folder) handleNavigate(folder.name)
                    }}
                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                    title="Open folder"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </button>
                )}
                {/* Preview Button - Only for single file */}
                {selectedItems.size === 1 && Array.from(selectedItems).every(id => items.find(i => i.id === id)?.type === 'file') && (
                  <button
                    onClick={() => {
                      const fileId = Array.from(selectedItems)[0]
                      const file = items.find(i => i.id === fileId)
                      if (file) setPreviewFile(file)
                    }}
                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                    title="Preview file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}
                {/* Download Button - For selected items */}
                <button
                  onClick={handleDownloadSelected}
                  disabled={downloadingSelected}
                  className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                    transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title={`Download ${selectedItems.size} item(s)`}
                >
                  {downloadingSelected ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                    transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                  title="Clear selection"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {viewMode === 'list' ? (
          <>
          {/* Header - Hidden on mobile */}
          <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:px-6 sm:py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-4">Modified</div>
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">This folder is empty</p>
            </div>
          ) : (
            <>
              {/* Folders */}
              {folders.map((item) => (
                <div 
                  key={item.id}
                  onClick={(e) => handleItemClick(item, e)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                    selectedItems.has(item.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  {/* Mobile Layout */}
                  <div className="flex items-center gap-2 sm:hidden">
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Folder</div>
                    </div>
                  </div>
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                    <div className="col-span-6 flex items-center gap-3">
                      <button 
                        onClick={(e) => handleOpenClick(item, e)}
                        className="flex items-center gap-3 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                        </svg>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                      </button>
                    </div>
                    <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">--</div>
                    <div className="col-span-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.modified_at)}</div>
                  </div>
                </div>
              ))}

              {/* Files */}
              {files.map((item) => (
                <div 
                  key={item.id}
                  onClick={(e) => handleItemClick(item, e)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                    selectedItems.has(item.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  {/* Mobile Layout */}
                  <div className="flex items-center gap-2 sm:hidden">
                    <FileIcon mimeType={item.mime_type || ''} size="sm" className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatSize(item.size)}</div>
                    </div>
                  </div>
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                    <div className="col-span-6 flex items-center gap-3">
                      <FileIcon mimeType={item.mime_type || ''} size="sm" />
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">{formatSize(item.size)}</div>
                    <div className="col-span-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.modified_at)}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          </>
          ) : (
            /* Grid View */
            <>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">This folder is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 p-4" style={{ overflow: 'visible' }}>
              {folders.map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => handleItemClick(item, e)}
                  className={`group relative flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all ${
                    selectedItems.has(item.id) ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center line-clamp-2">{item.name}</span>
                  </div>
                </div>
              ))}

              {files.map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => handleItemClick(item, e)}
                  className={`group relative flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all ${
                    selectedItems.has(item.id) ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <FileIcon mimeType={item.mime_type || ''} size="lg" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center line-clamp-2">{item.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatSize(item.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={{
            id: previewFile.id,
            name: previewFile.name,
            size: previewFile.size || 0,
            mime_type: previewFile.mime_type
          }}
          onClose={() => setPreviewFile(null)}
          onDownload={handleFileDownload as (file: any, asBlob?: boolean) => Promise<Blob | undefined>}
        />
      )}
      </main>
    </div>
  )
}
